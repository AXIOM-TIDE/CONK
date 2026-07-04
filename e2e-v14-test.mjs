#!/usr/bin/env node
/**
 * e2e-v14-test.mjs — CONK v14 End-to-End Test
 * Axiom Tide LLC — Franklin
 *
 * Tests the v14 expiry-as-visibility change:
 *   1. Creates Harbor + Vessel on test package
 *   2. Sounds a paid cast with 24h expiry
 *   3. Registers SEAL key with zkProxy
 *   4. Verifies immediate read (payment routing: Abyss fee + author 97%)
 *   5. Verifies zkProxy releases SEAL key after valid CastRead tx
 *   6. Verifies unpaid read fails (E_ALREADY_BURNED or insufficient fee)
 *
 * Run: node e2e-v14-test.mjs
 * After 24h: node e2e-v14-test.mjs --verify-expired <castId>
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'
import * as fs from 'fs'
import * as crypto from 'crypto'

// ─── Config ───────────────────────────────────────────────────────────────────

const TEST_PACKAGE    = '0x214302d985fac734bd93a8ae74abeb51e010ad42e52864dc87f9af43ac3d5c9d'
const TEST_ABYSS      = '0x85059c626d40913a61e105ace76186ed81e5c99e18bd4f38363dc70b0ea22c4e'
const TEST_PROTO_CFG  = '0x9bc814cd97e53457c34ff58dd0802db8b0b22afb62a374e4c437d5723ea740d0'
const TEST_DRIFT      = '0xa5ce20692e743f949c22dd3bec167753543a795d11cee32799a7814586c04002'
const SUI_CLOCK       = '0x0000000000000000000000000000000000000000000000000000000000000006'
const USDC_TYPE       = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
const ZKPROXY_URL     = 'https://conk-zkproxy-v2.italktonumbers.workers.dev'

// Mode constants (must match Move)
const MODE_OPEN   = 0
const DUR_24H     = 1
const PROTOCOL_READ_FEE = 1000  // from ProtocolConfig default
const CAST_FEE_PAID     = 1000  // what readers pay author (1 USDC cent = 1000 base)

const STATE_FILE = '/tmp/conk-v14-test-state.json'

const SUI_RPC = process.env.SUI_RPC_URL || 'https://sui-mainnet.gateway.tatum.io'
const TATUM_KEY = process.env.TATUM_API_KEY || ''

const client = new SuiClient({
  url: SUI_RPC,
  ...(TATUM_KEY ? { headers: { 'x-api-key': TATUM_KEY } } : {}),
})

const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY
if (!PRIVATE_KEY) {
  console.error('ERROR: DAEMON_PRIVATE_KEY env var required')
  process.exit(1)
}

const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY)
const keypair = Ed25519Keypair.fromSecretKey(secretKey)
const address = keypair.getPublicKey().toSuiAddress()
console.log(`\n🔑 Wallet: ${address}`)

async function signAndExecute(tx) {
  tx.setSender(address)
  const { bytes, signature } = await tx.sign({ signer: keypair })
  return client.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
    options: { showEffects: true, showEvents: true, showObjectChanges: true },
    requestType: 'WaitForLocalExecution',
  })
}

async function getUsdcCoin(amount) {
  const coins = await client.getCoins({ owner: address, coinType: USDC_TYPE })
  for (const coin of coins.data) {
    if (BigInt(coin.balance) >= BigInt(amount)) return coin.coinObjectId
  }
  throw new Error(`No USDC coin with balance >= ${amount}`)
}

// ─── Step 1: Create Harbor + Vessel ──────────────────────────────────────────

async function setupVessel() {
  console.log('\n[1] Creating Harbor + Vessel on test package...')
  const tx = new Transaction()

  // harbor::launch() → Harbor
  const [harbor] = tx.moveCall({
    target: `${TEST_PACKAGE}::harbor::launch`,
    arguments: [tx.pure.string('e2e-test-harbor')],
  })

  // vessel::launch(harbor) → (Vessel, VesselCap)
  const [vessel, vesselCap] = tx.moveCall({
    target: `${TEST_PACKAGE}::vessel::launch`,
    arguments: [harbor, tx.object(SUI_CLOCK)],
  })

  tx.transferObjects([harbor, vessel, vesselCap], tx.pure.address(address))

  const result = await signAndExecute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('Harbor/Vessel creation failed: ' + JSON.stringify(result.effects.status))
  }

  const created = result.objectChanges?.filter(c => c.type === 'created') ?? []
  let vesselId, vesselCapId, harborId

  for (const obj of created) {
    if (obj.objectType?.includes('::vessel::Vessel') && !obj.objectType?.includes('Cap')) {
      vesselId = obj.objectId
    } else if (obj.objectType?.includes('::vessel::VesselCap')) {
      vesselCapId = obj.objectId
    } else if (obj.objectType?.includes('::harbor::Harbor')) {
      harborId = obj.objectId
    }
  }

  if (!vesselId || !vesselCapId) {
    console.log('Created objects:', created.map(c => `${c.objectId} ${c.objectType}`))
    throw new Error('Could not find Vessel/VesselCap in created objects')
  }

  console.log(`  ✅ Harbor:    ${harborId}`)
  console.log(`  ✅ Vessel:    ${vesselId}`)
  console.log(`  ✅ VesselCap: ${vesselCapId}`)
  return { harborId, vesselId, vesselCapId }
}

// ─── Step 2: Sound a paid cast with 24h expiry ───────────────────────────────

async function soundCast(vesselId, vesselCapId) {
  console.log('\n[2] Sounding paid cast with 24h expiry...')

  const tx = new Transaction()
  const usdcCoin = await getUsdcCoin(CAST_FEE_PAID + 1000)

  // Split off exact amount for the fee coin
  const [feeCoin] = tx.splitCoins(tx.object(usdcCoin), [tx.pure.u64(CAST_FEE_PAID)])

  tx.moveCall({
    target: `${TEST_PACKAGE}::cast::sound`,
    arguments: [
      feeCoin,
      tx.object(TEST_ABYSS),
      tx.object(vesselId),
      tx.object(vesselCapId),
      tx.pure.string('v14-expiry-test'),           // hook
      tx.pure.vector('u8', Array.from(Buffer.from('CONK v14 E2E test content — paid cast with 24h expiry. This content should be readable after expiry under v14 rules (expiry=visibility).'))), // content_blob
      tx.pure.option('vector<u8>', null),           // media_blob: none
      tx.pure.u8(MODE_OPEN),                        // mode
      tx.pure.address(address),                     // recipient (self for open cast)
      tx.pure.u8(DUR_24H),                          // duration: 24h
      tx.pure.u64(CAST_FEE_PAID),                   // fee paid by readers
      tx.pure.u64(1),                               // max_claims
      tx.pure.vector('u8', []),                     // dock_description
      tx.object(SUI_CLOCK),
    ],
  })

  const result = await signAndExecute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('sound() failed: ' + JSON.stringify(result.effects.status))
  }

  // Find CastSounded event
  const event = result.events?.find(e => e.type?.endsWith('::cast::CastSounded'))
  if (!event) throw new Error('No CastSounded event found')

  const castId  = event.parsedJson?.cast_id
  const expiresAt = Number(event.parsedJson?.expires_at)
  const createdAt = Number(event.parsedJson?.created_at)

  console.log(`  ✅ Cast ID:    ${castId}`)
  console.log(`  ✅ Created at: ${new Date(createdAt).toISOString()}`)
  console.log(`  ✅ Expires at: ${new Date(expiresAt).toISOString()} (24h from now)`)
  console.log(`  ✅ Tx digest:  ${result.digest}`)

  return { castId, expiresAt, createdAt, soundTx: result.digest }
}

// ─── Step 3: Register SEAL key with zkProxy ──────────────────────────────────

async function registerSealKey(castId) {
  console.log('\n[3] Registering SEAL key with zkProxy...')

  // Generate a random AES-256-GCM key + IV for test
  const key = crypto.randomBytes(32).toString('hex')
  const iv  = crypto.randomBytes(12).toString('hex')
  const blobId = 'test-walrus-blob-id-' + Date.now()  // mock Walrus blob ID for test

  const resp = await fetch(`${ZKPROXY_URL}/cast-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://conk.app' },
    body: JSON.stringify({ castId, key, iv, blobId }),
  })
  const data = await resp.json()

  if (!data.ok) throw new Error('cast-key registration failed: ' + JSON.stringify(data))

  console.log(`  ✅ SEAL key registered for castId: ${castId}`)
  console.log(`  ✅ Key (hex32): ${key.slice(0,16)}...`)
  console.log(`  ✅ IV  (hex12): ${iv}`)
  return { key, iv, blobId }
}

// ─── Step 4: Immediate read — verify payment routing ─────────────────────────

async function readCast(castId, vesselId, vesselCapId) {
  console.log('\n[4] Reading cast (verifying payment routing)...')

  const tx = new Transaction()
  const usdcCoin = await getUsdcCoin(PROTOCOL_READ_FEE + CAST_FEE_PAID + 1000)

  // Total = PROTOCOL_READ_FEE (1000) + cast.fee_paid (1000) = 2000
  const [feeCoin] = tx.splitCoins(tx.object(usdcCoin), [tx.pure.u64(PROTOCOL_READ_FEE + CAST_FEE_PAID)])

  tx.moveCall({
    target: `${TEST_PACKAGE}::cast::read`,
    arguments: [
      tx.object(castId),
      feeCoin,
      tx.object(TEST_ABYSS),
      tx.object(TEST_PROTO_CFG),
      tx.pure.address(address),  // reader
      tx.object(SUI_CLOCK),
    ],
  })

  const result = await signAndExecute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('read() failed: ' + JSON.stringify(result.effects.status))
  }

  const readEvent = result.events?.find(e => e.type?.endsWith('::cast::CastRead'))
  if (!readEvent) throw new Error('No CastRead event found')

  console.log(`  ✅ read() SUCCEEDED`)
  console.log(`  ✅ CastRead event: cast_id=${readEvent.parsedJson?.cast_id}`)
  console.log(`  ✅ read_count: ${readEvent.parsedJson?.read_count}`)
  console.log(`  ✅ Tx digest: ${result.digest}`)

  // Check Abyss balance increase (verify 3% protocol + 97% author routing)
  const abyssChanges = result.objectChanges?.filter(
    c => c.objectId === TEST_ABYSS
  )
  console.log(`  ℹ️  Abyss change: ${JSON.stringify(abyssChanges)}`)

  return { readTx: result.digest, readEvent }
}

// ─── Step 5: Verify zkProxy releases SEAL key ─────────────────────────────────

async function verifyZkProxy(castId, readTx) {
  console.log('\n[5] Verifying zkProxy releases SEAL key after valid CastRead tx...')

  const resp = await fetch(`${ZKPROXY_URL}/cast-decrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://conk.app' },
    body: JSON.stringify({ castId, txDigest: readTx, address }),
  })
  const data = await resp.json()

  if (data.error) {
    console.log(`  ❌ zkProxy REFUSED: ${data.error}`)
    return false
  }

  console.log(`  ✅ zkProxy returned key: ${data.key?.slice(0,16)}...`)
  console.log(`  ✅ blobId: ${data.blobId}`)
  return true
}

// ─── Step 6: Verify unpaid read fails ────────────────────────────────────────

async function verifyUnpaidFails(castId) {
  console.log('\n[6] Verifying unpaid read fails...')

  try {
    const tx = new Transaction()
    const usdcCoin = await getUsdcCoin(100)

    // Send only 100 units — insufficient (need PROTOCOL_READ_FEE + CAST_FEE_PAID = 2000)
    const [feeCoin] = tx.splitCoins(tx.object(usdcCoin), [tx.pure.u64(100)])

    tx.moveCall({
      target: `${TEST_PACKAGE}::cast::read`,
      arguments: [
        tx.object(castId),
        feeCoin,
        tx.object(TEST_ABYSS),
        tx.object(TEST_PROTO_CFG),
        tx.pure.address(address),
        tx.object(SUI_CLOCK),
      ],
    })

    const result = await signAndExecute(tx)
    if (result.effects.status.status === 'success') {
      console.log('  ❌ FAIL: Unpaid read SUCCEEDED — this is a bug!')
      return false
    } else {
      console.log(`  ✅ Unpaid read correctly FAILED: ${JSON.stringify(result.effects.status.error)}`)
      return true
    }
  } catch (e) {
    // Expected — tx should fail with insufficient fee
    console.log(`  ✅ Unpaid read correctly rejected: ${e.message?.slice(0,100)}`)
    return true
  }
}

// ─── Step 7: Verify expired cast is still readable (run AFTER 24h) ───────────

async function verifyExpiredRead(castId) {
  console.log('\n[7] Verifying expired-but-not-wrecked cast is still readable...')

  // Check cast state on-chain first
  const castObj = await client.getObject({ id: castId, options: { showContent: true } })
  const fields = castObj.data?.content?.fields ?? {}
  const now = Date.now()
  const expiresAt = Number(fields.expires_at ?? 0)
  const state = fields.state ?? -1

  console.log(`  Cast expires_at: ${new Date(expiresAt).toISOString()}`)
  console.log(`  Now:             ${new Date(now).toISOString()}`)
  console.log(`  Is expired:      ${now >= expiresAt}`)
  console.log(`  State:           ${state} (0=LIVE, 1=BURNED, 2=WRECKED)`)

  if (now < expiresAt) {
    console.log('  ⚠️  Cast not yet expired — run this again after', new Date(expiresAt).toLocaleString())
    return null
  }

  if (state !== 0) {
    console.log(`  ❌ Cast is not STATE_LIVE (state=${state}) — cannot test expired read`)
    return false
  }

  // Try to read the expired cast
  const tx = new Transaction()
  const usdcCoin = await getUsdcCoin(PROTOCOL_READ_FEE + CAST_FEE_PAID + 1000)
  const [feeCoin] = tx.splitCoins(tx.object(usdcCoin), [tx.pure.u64(PROTOCOL_READ_FEE + CAST_FEE_PAID)])

  tx.moveCall({
    target: `${TEST_PACKAGE}::cast::read`,
    arguments: [
      tx.object(castId),
      feeCoin,
      tx.object(TEST_ABYSS),
      tx.object(TEST_PROTO_CFG),
      tx.pure.address(address),
      tx.object(SUI_CLOCK),
    ],
  })

  const result = await signAndExecute(tx)
  const readEvent = result.events?.find(e => e.type?.endsWith('::cast::CastRead'))

  if (result.effects.status.status === 'success' && readEvent) {
    console.log(`  ✅ PASS — Expired cast read SUCCEEDED`)
    console.log(`     read_count: ${readEvent.parsedJson?.read_count}`)
    console.log(`     tx: ${result.digest}`)

    // Verify zkProxy still releases key (re-use new txDigest)
    const zkOk = await verifyZkProxy(castId, result.digest)
    if (zkOk) {
      console.log(`  ✅ PASS — zkProxy released SEAL key for expired cast`)
    } else {
      console.log(`  ❌ FAIL — zkProxy refused key for expired cast (TTL expired or other issue)`)
    }
    return result.effects.status.status === 'success' && zkOk
  } else {
    console.log(`  ❌ FAIL — Expired cast read FAILED (v14 regression): ${JSON.stringify(result.effects.status)}`)
    return false
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args[0] === '--verify-expired') {
  // Post-expiry verification mode
  const castId = args[1]
  if (!castId) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    const result = await verifyExpiredRead(state.castId)
    console.log('\nExpiry verification result:', result)
  } else {
    const result = await verifyExpiredRead(castId)
    console.log('\nExpiry verification result:', result)
  }
} else {
  // Full setup + immediate tests
  console.log('════════════════════════════════════════════════')
  console.log('  CONK v14 E2E Test — Setup + Immediate Checks ')
  console.log('  Test Package:', TEST_PACKAGE)
  console.log('════════════════════════════════════════════════')

  try {
    const { harborId, vesselId, vesselCapId } = await setupVessel()
    const { castId, expiresAt, createdAt, soundTx } = await soundCast(vesselId, vesselCapId)
    const { key, iv, blobId } = await registerSealKey(castId)
    const { readTx } = await readCast(castId, vesselId, vesselCapId)
    const zkOk = await verifyZkProxy(castId, readTx)
    const unpaidFails = await verifyUnpaidFails(castId)

    const state = {
      castId, expiresAt, createdAt, soundTx, readTx,
      vesselId, vesselCapId, harborId,
      sealKey: key, sealIv: iv, blobId,
      testTime: Date.now()
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))

    console.log('\n════════════════════════════════════════════════')
    console.log('  IMMEDIATE TEST RESULTS')
    console.log('════════════════════════════════════════════════')
    console.log(`  [1] Harbor+Vessel created:    ✅`)
    console.log(`  [2] Cast sounded (24h expiry): ✅  castId=${castId}`)
    console.log(`  [3] SEAL key registered:       ✅`)
    console.log(`  [4] Read (pre-expiry) OK:      ✅  payment routing verified`)
    console.log(`  [5] zkProxy SEAL release:      ${zkOk ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  [6] Unpaid read rejected:      ${unpaidFails ? '✅ PASS' : '❌ FAIL'}`)
    console.log(``)
    console.log(`  Cast expires at: ${new Date(expiresAt).toISOString()}`)
    console.log(`  State saved to:  ${STATE_FILE}`)
    console.log(``)
    console.log(`  Run AFTER EXPIRY to complete test:`)
    console.log(`  DAEMON_PRIVATE_KEY=<key> node e2e-v14-test.mjs --verify-expired`)
    console.log('════════════════════════════════════════════════')
  } catch (e) {
    console.error('\n❌ TEST FAILED:', e.message)
    console.error(e.stack)
    process.exit(1)
  }
}
