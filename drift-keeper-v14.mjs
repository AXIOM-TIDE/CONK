#!/usr/bin/env node
/**
 * drift-keeper-v14.mjs
 * Axiom Tide — CONK v14 Drift Keeper
 *
 * Scans for expired + abandoned casts and calls wreck() on them.
 * v14 rule: wreck only after expires_at + 30-day abandon window.
 * Runs once and exits — driven by cron (5 * * * *).
 *
 * LaunchAgent: com.axiomtide.drift-keeper-v14.plist (see comment at bottom)
 */

import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'

// ─── Config ──────────────────────────────────────────────────────────────────

const CONK_PACKAGE     = process.env.CONK_PACKAGE     || '0x265ec216d95c6109f92d90e310da4cfb0c123efa1c00540d8ced4e0d37392297'
const CONK_ABYSS       = process.env.CONK_ABYSS       || '0x075c8667d1780bdde01a8175cd458aa345b3f6e2a84c45b91f82b344a4325bd0'
const CONK_PROTOCOL_CONFIG = process.env.CONK_PROTOCOL_CONFIG || '0xdc8e5131d6e3bec492a2e12b1d7beddbfec709ae5def8e775dab59c7a45421ea'
const DAEMON_PRIVATE_KEY   = process.env.DAEMON_PRIVATE_KEY || process.env.GAS_PRIVATE_KEY   // bech32 Ed25519 key — required
const SUI_RPC_URL      = process.env.SUI_RPC_URL      || 'https://sui-mainnet.gateway.tatum.io'
const TATUM_API_KEY    = process.env.TATUM_API_KEY    || ''
const BRAIN_DB_URL     = process.env.BRAIN_DB_URL     || ''   // optional — graph check endpoint

// v14: 30-day abandon window (mirrors Move constant ABANDON_WINDOW_MS)
const ABANDON_WINDOW_MS = 30n * 24n * 60n * 60n * 1000n

// Safety limits
const MAX_WRECKS_PER_RUN = 10
const WRECK_DELAY_MS     = 5_000

// How far back to scan for CastSounded events (~90 days of ms)
const SCAN_WINDOW_MS = BigInt(90 * 24 * 60 * 60 * 1000)

// Clock object (Sui system clock)
const SUI_CLOCK = '0x0000000000000000000000000000000000000000000000000000000000000006'

// ─── Graph check (stub) ───────────────────────────────────────────────────────

/**
 * isReferencedInGraph — returns true if the cast is referenced by another cast
 * in the brain synapse graph. Such casts should NOT be wrecked (still alive).
 *
 * REAL IMPLEMENTATION (when brain DB is ready):
 *   - Query BRAIN_DB_URL/graph/in-degree?cast_id=<castId>
 *   - Or SELECT in_degree FROM stats WHERE cast_id = castId in local SQLite
 *   - Return true if in_degree > 0
 *
 * @param {string} castId - Cast object ID (hex address)
 * @returns {Promise<boolean>}
 */
async function isReferencedInGraph(castId) {
  // Stub: no graph data yet — always returns false (safe to wreck if other conditions met)
  // TODO: implement once brain-indexer-v14 is running and BRAIN_DB_URL is set
  if (BRAIN_DB_URL) {
    try {
      const res = await fetch(`${BRAIN_DB_URL}/graph/in-degree?cast_id=${castId}`)
      if (res.ok) {
        const data = await res.json()
        return (data.in_degree ?? 0) > 0
      }
    } catch (e) {
      console.warn(`[keeper] Graph check failed for ${castId}:`, e.message)
      // Fail safe: if we can't check the graph, don't wreck
      return true
    }
  }
  return false
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function buildClient() {
  const headers = TATUM_API_KEY ? { 'x-api-key': TATUM_API_KEY } : {}
  return new SuiClient({ url: SUI_RPC_URL, rpcConfig: { headers } })
}

function buildKeypair() {
  if (!DAEMON_PRIVATE_KEY) {
    throw new Error('DAEMON_PRIVATE_KEY env var not set')
  }
  const { schema, secretKey } = decodeSuiPrivateKey(DAEMON_PRIVATE_KEY)
  if (schema !== 'ED25519') throw new Error('Only Ed25519 keys supported')
  return Ed25519Keypair.fromSecretKey(secretKey)
}

// ─── Scan CastSounded events ──────────────────────────────────────────────────

async function scanExpiredCasts(client) {
  const nowMs = BigInt(Date.now())
  const cutoff = nowMs - SCAN_WINDOW_MS

  const candidates = []
  let cursor = null
  let page   = 0

  console.log(`[keeper] Scanning CastSounded events (90-day window)...`)

  while (true) {
    const result = await client.queryEvents({
      query: { MoveEventType: `${CONK_PACKAGE}::cast::CastSounded` },
      cursor,
      limit: 50,
      order: 'descending',
    })

    for (const ev of result.data) {
      const fields = ev.parsedJson
      if (!fields) continue

      const expiresAt = BigInt(fields.expires_at ?? 0)
      const createdAt = BigInt(fields.created_at ?? 0)

      // Stop scanning if events are older than our window
      if (createdAt < cutoff) {
        console.log(`[keeper] Reached scan window boundary at page ${page}`)
        return candidates
      }

      const abandonAt = expiresAt + ABANDON_WINDOW_MS
      if (nowMs >= abandonAt) {
        candidates.push({
          castId:    fields.cast_id,
          expiresAt: expiresAt,
          abandonAt: abandonAt,
        })
      }
    }

    page++
    if (!result.hasNextPage || !result.nextCursor) break
    cursor = result.nextCursor
  }

  console.log(`[keeper] Scan complete — ${candidates.length} candidate(s) past abandon window`)
  return candidates
}

// ─── Verify cast state on-chain ───────────────────────────────────────────────

async function verifyCastWreckable(client, castId) {
  let obj
  try {
    obj = await client.getObject({ id: castId, options: { showContent: true } })
  } catch (e) {
    console.warn(`[keeper] getObject failed for ${castId}:`, e.message)
    return false
  }

  if (!obj.data?.content?.fields) return false
  const f = obj.data.content.fields

  const state        = Number(f.state ?? 99)
  const isLighthouse = f.is_lighthouse === true || f.is_lighthouse === 'true'

  if (state !== 0) {
    // Already burned or wrecked
    return false
  }
  if (isLighthouse) {
    return false
  }

  return true
}

// ─── Execute wreck PTB ────────────────────────────────────────────────────────

async function executeWreck(client, keypair, castId, meta) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${CONK_PACKAGE}::cast::wreck`,
    arguments: [
      tx.object(castId),
      tx.object(SUI_CLOCK),
    ],
  })
  tx.setGasBudget(10_000_000)

  const result = await client.signAndExecuteTransaction({
    signer:      keypair,
    transaction: tx,
    options: { showEffects: true },
  })

  const digest = result.digest
  const status = result.effects?.status?.status ?? 'unknown'

  const log = {
    castId,
    expires_at:  meta.expiresAt.toString(),
    abandon_at:  meta.abandonAt.toString(),
    wrecked_at:  new Date().toISOString(),
    tx:          digest,
    status,
  }

  console.log(`[keeper] WRECKED:`, JSON.stringify(log))
  return log
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[keeper] drift-keeper-v14 starting — ${new Date().toISOString()}`)
  console.log(`[keeper] Package: ${CONK_PACKAGE}`)

  const client  = buildClient()
  const keypair = buildKeypair()

  const candidates = await scanExpiredCasts(client)
  if (candidates.length === 0) {
    console.log('[keeper] No candidates. Exiting.')
    return
  }

  let wrecked = 0
  const wreckedLog = []

  for (const cand of candidates) {
    if (wrecked >= MAX_WRECKS_PER_RUN) {
      console.log(`[keeper] Hit max wrecks per run (${MAX_WRECKS_PER_RUN}). Stopping.`)
      break
    }

    const { castId, expiresAt, abandonAt } = cand
    console.log(`[keeper] Checking cast ${castId}...`)

    // 1. Verify on-chain state
    const wreckable = await verifyCastWreckable(client, castId)
    if (!wreckable) {
      console.log(`[keeper] Cast ${castId} not wreckable (state/lighthouse). Skipping.`)
      continue
    }

    // 2. Graph check — never wreck referenced casts
    const referenced = await isReferencedInGraph(castId)
    if (referenced) {
      console.log(`[keeper] Cast ${castId} is referenced in graph. Skipping.`)
      continue
    }

    // 3. Execute wreck
    try {
      const log = await executeWreck(client, keypair, castId, { expiresAt, abandonAt })
      wreckedLog.push(log)
      wrecked++
    } catch (e) {
      console.error(`[keeper] wreck() failed for ${castId}:`, e.message)
    }

    if (wrecked < MAX_WRECKS_PER_RUN) {
      await sleep(WRECK_DELAY_MS)
    }
  }

  console.log(`[keeper] Run complete — ${wrecked} cast(s) wrecked.`)
  if (wreckedLog.length > 0) {
    console.log('[keeper] Wreck log:', JSON.stringify(wreckedLog, null, 2))
  }
}

main().catch(e => {
  console.error('[keeper] Fatal:', e)
  process.exit(1)
})

/*
 * ─── LaunchAgent Plist ────────────────────────────────────────────────────────
 *
 * File: ~/Library/LaunchAgents/com.axiomtide.drift-keeper-v14.plist
 * Runs at :05 every hour.
 *
 * <?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 *   "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
 * <plist version="1.0">
 * <dict>
 *   <key>Label</key>
 *   <string>com.axiomtide.drift-keeper-v14</string>
 *   <key>ProgramArguments</key>
 *   <array>
 *     <string>/usr/local/bin/node</string>
 *     <string>/Users/franklin/CONK/drift-keeper-v14.mjs</string>
 *   </array>
 *   <key>EnvironmentVariables</key>
 *   <dict>
 *     <key>CONK_PACKAGE</key>
 *     <string>0x265ec216d95c6109f92d90e310da4cfb0c123efa1c00540d8ced4e0d37392297</string>
 *     <key>CONK_ABYSS</key>
 *     <string>0x075c8667d1780bdde01a8175cd458aa345b3f6e2a84c45b91f82b344a4325bd0</string>
 *     <key>CONK_PROTOCOL_CONFIG</key>
 *     <string>0xdc8e5131d6e3bec492a2e12b1d7beddbfec709ae5def8e775dab59c7a45421ea</string>
 *     <key>DAEMON_PRIVATE_KEY</key>
 *     <string>suiprivkey1____YOUR_KEY_HERE____</string>
 *     <key>TATUM_API_KEY</key>
 *     <string>YOUR_TATUM_KEY_HERE</string>
 *     <key>SUI_RPC_URL</key>
 *     <string>https://sui-mainnet.gateway.tatum.io</string>
 *   </dict>
 *   <key>StartCalendarInterval</key>
 *   <dict>
 *     <key>Minute</key>
 *     <integer>5</integer>
 *   </dict>
 *   <key>StandardOutPath</key>
 *   <string>/Users/franklin/CONK/logs/drift-keeper-v14.log</string>
 *   <key>StandardErrorPath</key>
 *   <string>/Users/franklin/CONK/logs/drift-keeper-v14.err</string>
 *   <key>RunAtLoad</key>
 *   <false/>
 * </dict>
 * </plist>
 */
