#!/usr/bin/env node
/**
 * health-check.mjs — CONK v14 Fleet Health Monitor
 * Axiom Tide LLC — Franklin
 *
 * Runs every 15 minutes via cron.
 * Sends Discord alerts on any failure.
 *
 * Cron: (added to Mac mini crontab)
 *   */15 * * * * /opt/homebrew/bin/node /Users/franklin/CONK/health-check.mjs >> /tmp/conk-health.log 2>&1
 *
 * Required env vars (set in .env.health or export before cron):
 *   DISCORD_WEBHOOK_URL — incoming webhook for #alerts channel
 *   CONK_PROXY_URL      — zkProxy endpoint
 *   CONK_ABYSS          — Abyss shared object ID
 *   BRAIN_API_URL        — brain.agentspark.network
 *   TATUM_API_KEY        — (optional) Tatum RPC key
 */

import * as fs from 'fs'
import * as path from 'path'

// ─── Load .env.health if present ─────────────────────────────────────────────

const ENV_FILE = '/Users/franklin/CONK/.env.health'
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL
const ZKPROXY_URL     = process.env.CONK_PROXY_URL || 'https://conk-zkproxy-v2.italktonumbers.workers.dev'
const ABYSS_ID        = process.env.CONK_ABYSS     || '0x075c8667d1780bdde01a8175cd458aa345b3f6e2a84c45b91f82b344a4325bd0'
const PROD_PACKAGE    = process.env.CONK_PACKAGE    || '0x265ec216d95c6109f92d90e310da4cfb0c123efa1c00540d8ced4e0d37392297'
const BRAIN_URL       = process.env.BRAIN_API_URL   || 'https://brain.agentspark.network'
const SUI_RPC         = process.env.CONK_SUI_RPC    || 'https://mainnet.sui.rpcpool.com'
const TATUM_KEY       = process.env.TATUM_API_KEY   || ''

const STATE_FILE = '/tmp/conk-health-state.json'
const ALERT_COOLDOWN_MS = 60 * 60 * 1000 // 1h between repeated alerts for same issue

// ─── State (tracks last alerts to avoid spam) ─────────────────────────────────

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)) }

const state = loadState()
const now   = Date.now()

const checks = []
const alerts = []

function record(name, status, detail = '') {
  checks.push({ name, status, detail })
  console.log(`[${new Date().toISOString()}] ${status === 'ok' ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
  if (status !== 'ok') {
    const lastAlert = state[`alert_${name}`] || 0
    if (now - lastAlert > ALERT_COOLDOWN_MS) {
      alerts.push({ name, detail })
      state[`alert_${name}`] = now
    }
  } else {
    // Clear alert state on recovery
    delete state[`alert_${name}`]
  }
}

// ─── Check 1: Daemon liveness (Mac mini processes) ───────────────────────────

async function checkDaemons() {
  const daemonJobs = [
    { name: 'drift-keeper', pattern: 'drift-keeper' },
    { name: 'brain-indexer', pattern: 'brain-indexer' },
    { name: 'buyer-daemon', pattern: 'intelligence-buyer-daemon' },
  ]

  for (const job of daemonJobs) {
    // Check crontab has the job active
    try {
      const { execSync } = await import('child_process')
      const crontab = execSync('crontab -l 2>/dev/null || echo ""', { encoding: 'utf8' })
      const hasJob  = crontab.includes(job.pattern)
      
      // Check if a pid file or recent log exists for continuous daemons
      const recentLog = `/tmp/${job.name}.log`
      let isRecent = false
      if (fs.existsSync(recentLog)) {
        const stat = fs.statSync(recentLog)
        isRecent = (now - stat.mtimeMs) < 30 * 60 * 1000 // modified in last 30m
      }

      if (hasJob) {
        record(`daemon:${job.name}`, 'ok', 'in crontab')
      } else {
        record(`daemon:${job.name}`, 'fail', 'NOT in crontab — may be down')
      }
    } catch (e) {
      record(`daemon:${job.name}`, 'fail', e.message.slice(0, 80))
    }
  }
}

// ─── Check 2: Abyss tick rate (recent CastRead events) ───────────────────────

async function checkAbyssTickRate() {
  const headers = { 'Content-Type': 'application/json', ...(TATUM_KEY ? { 'x-api-key': TATUM_KEY } : {}) }
  
  try {
    const resp = await fetch(SUI_RPC, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'suix_queryEvents',
        params: [
          { MoveEventType: `${PROD_PACKAGE}::cast::CastRead` },
          null, 20, false
        ]
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await resp.json()
    const events = data.result?.data ?? []
    
    if (events.length === 0) {
      record('abyss:tick-rate', 'fail', 'No CastRead events in last 20 — Abyss may be idle')
      return
    }

    const lastEventTime = events[0]?.timestampMs ? Number(events[0].timestampMs) : 0
    const ageMs = now - lastEventTime
    const ageHours = (ageMs / 3600000).toFixed(1)

    if (ageMs > 24 * 3600 * 1000) {
      record('abyss:tick-rate', 'fail', `Last CastRead ${ageHours}h ago — unusually quiet`)
    } else {
      record('abyss:tick-rate', 'ok', `Last CastRead ${ageHours}h ago  (${events.length} recent)`)
    }
  } catch (e) {
    record('abyss:tick-rate', 'fail', `RPC error: ${e.message.slice(0, 80)}`)
  }
}

// ─── Check 3: Brain ingestion rate ───────────────────────────────────────────

async function checkBrainIngestion() {
  try {
    const resp = await fetch(`${BRAIN_URL}/health`, {
      signal: AbortSignal.timeout(8000),
    })
    
    if (!resp.ok) {
      record('brain:health', 'fail', `HTTP ${resp.status}`)
      return
    }

    const data = await resp.json().catch(() => ({}))
    const lastIngest = data.last_ingest_at || data.lastIngestAt
    const castCount  = data.cast_count || data.castCount

    if (lastIngest) {
      const ageH = ((now - new Date(lastIngest).getTime()) / 3600000).toFixed(1)
      if (parseFloat(ageH) > 2) {
        record('brain:ingestion', 'fail', `Last ingest ${ageH}h ago — indexer may be stuck`)
      } else {
        record('brain:ingestion', 'ok', `Last ingest ${ageH}h ago  casts=${castCount ?? '?'}`)
      }
    } else {
      record('brain:ingestion', 'ok', `brain alive  casts=${castCount ?? '?'}  (no last_ingest_at in response)`)
    }
  } catch (e) {
    record('brain:health', 'fail', `${e.message.slice(0, 80)}`)
  }
}

// ─── Check 4: SEAL decrypt success rate (zkProxy) ────────────────────────────

async function checkSealDecrypt() {
  try {
    // Ping zkProxy health endpoint
    const healthResp = await fetch(`${ZKPROXY_URL}/health`, {
      signal: AbortSignal.timeout(8000),
    })
    
    if (!healthResp.ok && healthResp.status !== 404) {
      record('zkproxy:health', 'fail', `HTTP ${healthResp.status}`)
      return
    }

    // Check with a dummy probe (no valid castId — should return structured error, not 500)
    const probeResp = await fetch(`${ZKPROXY_URL}/cast-decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://conk.app' },
      body: JSON.stringify({ castId: '0x0000000000000000000000000000000000000000000000000000000000000000', txDigest: 'probe', address: '0x0000000000000000000000000000000000000000000000000000000000000000' }),
      signal: AbortSignal.timeout(8000),
    })

    const body = await probeResp.json().catch(() => null)
    
    // Expect a structured error (not a 500 crash)
    if (probeResp.status >= 500) {
      record('zkproxy:seal-decrypt', 'fail', `Worker returned ${probeResp.status} on probe — may be crashed`)
    } else if (body?.error || probeResp.status === 400 || probeResp.status === 404) {
      record('zkproxy:seal-decrypt', 'ok', `Worker alive, returning structured errors (${probeResp.status})`)
    } else {
      record('zkproxy:seal-decrypt', 'ok', `Worker alive (${probeResp.status})`)
    }
  } catch (e) {
    record('zkproxy:seal-decrypt', 'fail', `Worker unreachable: ${e.message.slice(0, 80)}`)
  }
}

// ─── Check 5: Abyss on-chain balance (sanity check) ──────────────────────────

async function checkAbyssBalance() {
  const headers = { 'Content-Type': 'application/json', ...(TATUM_KEY ? { 'x-api-key': TATUM_KEY } : {}) }
  
  try {
    const resp = await fetch(SUI_RPC, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'sui_getObject',
        params: [ABYSS_ID, { showContent: true }]
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await resp.json()
    const fields = data.result?.data?.content?.fields ?? {}
    const bal    = BigInt(fields.usdc_balance ?? 0)
    const prevBal = BigInt(state.abyss_balance ?? 0)

    if (bal > prevBal) {
      record('abyss:balance', 'ok', `$${(Number(bal) / 1_000_000).toFixed(6)} USDC (+${Number(bal - prevBal)} since last check)`)
    } else if (bal === prevBal && prevBal === 0n) {
      record('abyss:balance', 'fail', 'Abyss balance is zero — no reads have occurred')
    } else {
      record('abyss:balance', 'ok', `$${(Number(bal) / 1_000_000).toFixed(6)} USDC (unchanged since last check)`)
    }
    state.abyss_balance = bal.toString()
  } catch (e) {
    record('abyss:balance', 'fail', `RPC error: ${e.message.slice(0, 80)}`)
  }
}

// ─── Send Discord alert ───────────────────────────────────────────────────────

async function sendDiscordAlert(failedAlerts) {
  if (!DISCORD_WEBHOOK) {
    console.log(`⚠️  DISCORD_WEBHOOK_URL not set — alerts not sent. Set in ${ENV_FILE}`)
    return
  }
  if (failedAlerts.length === 0) return

  const lines = failedAlerts.map(a => `• **${a.name}**: ${a.detail}`).join('\n')
  const payload = {
    username: 'Franklin (CTO)',
    content: `🚨 **CONK Fleet Health Alert** — ${new Date().toUTCString()}\n\n${lines}\n\n[Dashboard](${BRAIN_URL}) | [zkProxy](${ZKPROXY_URL}/health)`,
  }

  try {
    const resp = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (resp.ok || resp.status === 204) {
      console.log(`📣 Discord alert sent for ${failedAlerts.length} issue(s)`)
    } else {
      console.log(`⚠️  Discord alert failed: HTTP ${resp.status}`)
    }
  } catch (e) {
    console.log(`⚠️  Discord alert error: ${e.message}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n════════════ CONK Health Check ${new Date().toISOString()} ════════════`)

await checkDaemons()
await checkAbyssTickRate()
await checkBrainIngestion()
await checkSealDecrypt()
await checkAbyssBalance()

const failCount = checks.filter(c => c.status !== 'ok').length
const passCount = checks.filter(c => c.status === 'ok').length

console.log(`\nSummary: ${passCount} pass / ${failCount} fail`)

if (alerts.length > 0) {
  await sendDiscordAlert(alerts)
}

saveState(state)

console.log('════════════════════════════════════════════════════════════\n')
process.exit(failCount > 0 ? 1 : 0)
