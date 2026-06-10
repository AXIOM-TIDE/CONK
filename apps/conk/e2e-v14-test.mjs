#!/usr/bin/env node
/**
 * e2e-v14-test.mjs — CONK v14 End-to-End Test
 * Axiom Tide LLC — Franklin
 *
 * Verifies v14 expiry-as-visibility change end to end.
 *
 * Usage:
 *   node e2e-v14-test.mjs                            # Full setup + immediate checks
 *   node e2e-v14-test.mjs --verify-expired           # Post-expiry check (run after 24h)
 *   node e2e-v14-test.mjs --verify-expired <castId>  # Explicit castId
 */

import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'
import * as fs from 'fs'
import * as crypto from 'crypto'

// ─── Test Package Objects ─────────────────────────────────────────────────────
const TEST_PACKAGE   = '0x214302d985fac734bd93a8ae74abeb51e010ad42e52864dc87f9af43ac3d5c9d'
const TEST_ABYSS     = '0x9bc814cd97e53457c34ff58dd0802db8b0b22afb62a374e4c437d5723ea740d0'  // Abyss
const TEST_PROTO_CFG = '0x85059c626d40913a61e105ace76186ed81e5c99e18bd4f38363dc70b0ea22c4e'  // ProtocolConfig
const SUI_CLOCK      = '0x0000000000000000000000000000000000000000000000000000000000000006'
const USDC_TYPE      = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
const ZKPROXY_URL    = 'https://conk-zkproxy-v2.italktonumbers.workers.dev'

// Move constants
const MODE_OPEN  = 0
const TIER_OPEN  = 2  // vessel tier OPEN
const DUR_24H    = 1
const PROTOCOL_READ_FEE = 1000
const CAST_FEE_PAID     = 1000
// Harbor tier 1: cost=50_000 + minimum_balance=100_000 = 150_000 USDC base units
const HARBOR_OPEN_COST  = 150_000

const STATE_FILE = '/tmp/conk-v14-test-state.json'

// ─── Client setup ─────────────────────────────────────────────────────────────
const SUI_RPC = process.env.SUI_RPC_URL || 'https://sui-mainnet.gateway.tatum.io'
const client  = new SuiClient({ url: SUI_RPC })

const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY
if (!PRIVATE_KEY) { console.error('ERROR: DAEMON_PRIVATE_KEY required'); process.exit(1) }

const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY)
const keypair = Ed25519Keypair.fromSecretKey(secretKey)
const address = keypair.getPublicKey().toSuiAddress()
console.log(`\n🔑 Wallet: ${address}`)

async function execute(tx) {
  tx.setSender(address)
  const { bytes, signature } = await tx.sign({ client, signer: keypair })
  return client.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
    options: { showEffects: true, showEvents: true, showObjectChanges: true },
    requestType: 'WaitForLocalExecution',
  })
}

async function getUsdcCoinId(minAmount) {
  const coins = await client.getCoins({ owner: address, coinType: USDC_TYPE })
  for (const c of coins.data) {
    if (BigInt(c.balance) >= BigInt(minAmount)) return c.coinObjectId
  }
  throw new Error(`No USDC coin >= ${minAmount} found`)
}

// ─── TX 1: Open Harbor ────────────────────────────────────────────────────────
async function openHarbor() {
  console.log('\n[1a] Opening Harbor on test package...')
  const tx = new Transaction()
  const coinId = await getUsdcCoinId(HARBOR_OPEN_COST + 1000)
  const [payment] = tx.splitCoins(tx.object(coinId), [tx.pure.u64(HARBOR_OPEN_COST)])

  const [harborCap] = tx.moveCall({
    target:    `${TEST_PACKAGE}::harbor::open`,
    arguments: [payment, tx.pure.u8(1), tx.object(SUI_CLOCK)],  // tier 1
  })
  tx.transferObjects([harborCap], tx.pure.address(address))

  const result = await execute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('harbor::open failed: ' + JSON.stringify(result.effects.status))
  }

  const event = result.events?.find(e => e.type?.endsWith('::harbor::HarborOpened'))
  const harborId = event?.parsedJson?.harbor_id
  if (!harborId) throw new Error('No HarborOpened event')

  const harborCapObj = result.objectChanges?.find(c =>
    c.type === 'created' && c.objectType?.includes('::harbor::HarborCap'))
  const harborCapId  = harborCapObj?.objectId
  const harborObjId  = result.objectChanges?.find(c =>
    c.type === 'created' && c.objectType?.includes('::harbor::Harbor') && !c.objectType?.includes('Cap'))?.objectId

  console.log(`  ✅ Harbor ID:    ${harborId}`)
  console.log(`  ✅ HarborCap:   ${harborCapId}`)
  console.log(`  ✅ Tx: ${result.digest}`)
  return { harborId, harborCapId, harborObjId }
}

// ─── TX 2: Launch Vessel ──────────────────────────────────────────────────────
async function launchVessel(harborId) {
  console.log('\n[1b] Launching Vessel...')
  const tx = new Transaction()

  // vessel::launch takes harbor_id: ID — pass as address (ID is represented as address in Move ABI)
  const [vesselCap] = tx.moveCall({
    target:    `${TEST_PACKAGE}::vessel::launch`,
    arguments: [
      tx.pure.id(harborId),       // harbor_id: ID
      tx.pure.u8(TIER_OPEN),      // tier: OPEN (2)
      tx.pure.bool(false),        // burn_after_cast
      tx.object(SUI_CLOCK),
    ],
  })
  tx.transferObjects([vesselCap], tx.pure.address(address))

  const result = await execute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('vessel::launch failed: ' + JSON.stringify(result.effects.status))
  }

  const vesselCapObj = result.objectChanges?.find(c =>
    c.type === 'created' && c.objectType?.includes('::vessel::VesselCap'))
  const vesselObj = result.objectChanges?.find(c =>
    c.type === 'created' && c.objectType?.includes('::vessel::Vessel') && !c.objectType?.includes('Cap'))

  const vesselCapId = vesselCapObj?.objectId
  const vesselId    = vesselObj?.objectId

  if (!vesselId || !vesselCapId) {
    console.log('All created:', result.objectChanges?.map(c => `${c.type}: ${c.objectType}`))
    throw new Error('Could not find Vessel or VesselCap')
  }

  const event = result.events?.find(e => e.type?.endsWith('::vessel::VesselLaunched'))
  console.log(`  ✅ Vessel:    ${vesselId}`)
  console.log(`  ✅ VesselCap: ${vesselCapId}`)
  console.log(`  ✅ Tx: ${result.digest}`)
  return { vesselId, vesselCapId }
}

// ─── TX 3: Sound cast (24h expiry, paid) ─────────────────────────────────────
async function soundCast(vesselId, vesselCapId) {
  console.log('\n[2] Sounding paid cast with 24h expiry...')
  const tx  = new Transaction()
  tx.setGasBudget(100_000_000)  // explicit budget to bypass dry-run type resolution
  const coinId = await getUsdcCoinId(2_000)

  // sound() passes fee_coin to abyss::receive_cast which checks amount >= FEE_CAST=1000.
  // This is the cast creation fee (not the reader price). Min 1000 base units.
  const [feeCoin] = tx.splitCoins(tx.object(coinId), [tx.pure.u64(1_000)])

  const contentBytes = Array.from(Buffer.from(
    '[CONK v14 E2E TEST] Paid cast with 24h expiry. ' +
    'This content should remain readable after expiry under v14 rules ' +
    '(expiry = visibility event, not death). Wrecks only after 30-day abandon window. ' +
    'Created: ' + new Date().toISOString()
  ))

  tx.moveCall({
    target:    `${TEST_PACKAGE}::cast::sound`,
    arguments: [
      feeCoin,
      tx.sharedObjectRef({ objectId: TEST_ABYSS, initialSharedVersion: 907669295, mutable: true }),
      tx.object(vesselId),
      tx.object(vesselCapId),
      tx.pure.vector('u8', Array.from(Buffer.from('v14-expiry-test'))), // hook
      tx.pure.vector('u8', contentBytes),                               // content_blob
      tx.pure.option('vector<u8>', null),                               // media_blob: None
      tx.pure.u8(MODE_OPEN),                                            // mode
      tx.pure.address(address),                                         // recipient
      tx.pure.u8(DUR_24H),                                              // duration
      tx.pure.u64(CAST_FEE_PAID),                                       // fee readers pay
      tx.pure.u64(1),                                                   // max_claims
      tx.pure.vector('u8', []),                                         // dock_description
      tx.sharedObjectRef({ objectId: SUI_CLOCK, initialSharedVersion: 1, mutable: false }),
    ],
  })

  const result = await execute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('cast::sound failed: ' + JSON.stringify(result.effects.status))
  }

  const event = result.events?.find(e => e.type?.endsWith('::cast::CastSounded'))
  if (!event) throw new Error('No CastSounded event')

  const castId    = event.parsedJson?.cast_id
  const expiresAt = Number(event.parsedJson?.expires_at)
  const createdAt = Number(event.parsedJson?.created_at)

  console.log(`  ✅ Cast ID:    ${castId}`)
  console.log(`  ✅ Created:   ${new Date(createdAt).toISOString()}`)
  console.log(`  ✅ Expires:   ${new Date(expiresAt).toISOString()}`)
  console.log(`  ✅ Tx: ${result.digest}`)
  return { castId, expiresAt, createdAt, soundTx: result.digest }
}

// ─── Register SEAL key ────────────────────────────────────────────────────────
async function registerSealKey(castId) {
  console.log('\n[3] Registering SEAL key with zkProxy...')
  const key    = crypto.randomBytes(32).toString('hex')
  const iv     = crypto.randomBytes(12).toString('hex')
  const blobId = 'test-blob-' + Date.now()

  const resp = await fetch(`${ZKPROXY_URL}/cast-key`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://conk.app' },
    body:    JSON.stringify({ castId, key, iv, blobId }),
  })
  const data = await resp.json()
  if (!data.ok) throw new Error('cast-key registration failed: ' + JSON.stringify(data))

  console.log(`  ✅ Key registered (TTL=45d under v14 patch)`)
  return { key, iv, blobId }
}

// ─── Read cast (verifies payment routing) ─────────────────────────────────────
async function readCast(castId) {
  console.log('\n[4] Reading cast — verifying payment routing...')
  const tx    = new Transaction()
  tx.setGasBudget(100_000_000)
  const total = PROTOCOL_READ_FEE + CAST_FEE_PAID
  const coinId = await getUsdcCoinId(total + 1000)
  const [feeCoin] = tx.splitCoins(tx.object(coinId), [tx.pure.u64(total)])

  tx.moveCall({
    target:    `${TEST_PACKAGE}::cast::read`,
    arguments: [
      tx.object(castId),
      feeCoin,
      tx.sharedObjectRef({ objectId: TEST_ABYSS, initialSharedVersion: 907669295, mutable: true }),
      tx.sharedObjectRef({ objectId: TEST_PROTO_CFG, initialSharedVersion: 907669295, mutable: false }),
      tx.pure.address(address),
      tx.sharedObjectRef({ objectId: SUI_CLOCK, initialSharedVersion: 1, mutable: false }),
    ],
  })

  const result = await execute(tx)
  if (result.effects.status.status !== 'success') {
    throw new Error('read() failed: ' + JSON.stringify(result.effects.status))
  }

  const ev = result.events?.find(e => e.type?.endsWith('::cast::CastRead'))
  if (!ev) throw new Error('No CastRead event')

  // Check Abyss balance changed (fee deposited)
  const abyssChange = result.objectChanges?.find(c => c.objectId === TEST_ABYSS)
  console.log(`  ✅ read() SUCCEEDED — CastRead event emitted`)
  console.log(`  ✅ read_count: ${ev.parsedJson?.read_count}`)
  console.log(`  ✅ Abyss object mutated: ${!!abyssChange}`)
  console.log(`  ✅ Tx: ${result.digest}`)
  return { readTx: result.digest }
}

// ─── zkProxy SEAL verification ────────────────────────────────────────────────
async function verifyZkProxy(castId, txDigest) {
  console.log('\n[5] Verifying zkProxy releases SEAL key...')
  const resp = await fetch(`${ZKPROXY_URL}/cast-decrypt`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://conk.app' },
    body:    JSON.stringify({ castId, txDigest, address }),
  })
  const data = await resp.json()
  if (data.error) {
    console.log(`  ❌ zkProxy REFUSED: ${data.error}`)
    return false
  }
  console.log(`  ✅ zkProxy returned key (first 16 chars): ${data.key?.slice(0,16)}...`)
  return true
}

// ─── Verify unpaid read fails ─────────────────────────────────────────────────
async function verifyUnpaidFails(castId) {
  console.log('\n[6] Verifying insufficient-fee read fails...')
  const tx = new Transaction()
  tx.setGasBudget(100_000_000)
  const coinId = await getUsdcCoinId(50)
  const [feeCoin] = tx.splitCoins(tx.object(coinId), [tx.pure.u64(50)])
  tx.moveCall({
    target:    `${TEST_PACKAGE}::cast::read`,
    arguments: [
      tx.object(castId),
      feeCoin,
      tx.sharedObjectRef({ objectId: TEST_ABYSS, initialSharedVersion: 907669295, mutable: true }),
      tx.sharedObjectRef({ objectId: TEST_PROTO_CFG, initialSharedVersion: 907669295, mutable: false }),
      tx.pure.address(address),
      tx.sharedObjectRef({ objectId: SUI_CLOCK, initialSharedVersion: 1, mutable: false }),
    ],
  })
  const result = await execute(tx)
  if (result.effects.status.status === 'failure') {
    console.log(`  ✅ Underpaid read correctly FAILED`)
    return true
  }
  console.log(`  ❌ FAIL — underpaid read succeeded (bug!)`)
  return false
}

// ─── Post-expiry verification (run after 24h) ─────────────────────────────────
async function verifyExpiredRead(castId) {
  console.log('\n[7] Verifying expired-but-not-wrecked cast is readable (v14 test)...')

  const obj    = await client.getObject({ id: castId, options: { showContent: true } })
  const fields = obj.data?.content?.fields ?? {}
  const now    = Date.now()
  const expiry = Number(fields.expires_at ?? 0)
  const state  = Number(fields.state ?? -1)

  console.log(`  expires_at: ${new Date(expiry).toISOString()}`)
  console.log(`  now:        ${new Date(now).toISOString()}`)
  console.log(`  expired:    ${now >= expiry}`)
  console.log(`  state:      ${state} (0=LIVE, 1=BURNED, 2=WRECKED)`)

  if (now < expiry) {
    console.log(`  ⚠  Not yet expired. Try after ${new Date(expiry).toLocaleString('en-US', {timeZone:'America/Chicago'})} CT`)
    return null
  }

  if (state !== 0) {
    console.log(`  ❌ Cast is not STATE_LIVE — cannot test`)
    return false
  }

  const tx = new Transaction()
  const total  = PROTOCOL_READ_FEE + CAST_FEE_PAID
  const coinId = await getUsdcCoinId(total + 1000)
  const [feeCoin] = tx.splitCoins(tx.object(coinId), [tx.pure.u64(total)])
  tx.moveCall({
    target:    `${TEST_PACKAGE}::cast::read`,
    arguments: [
      tx.object(castId),
      feeCoin,
      tx.object(TEST_ABYSS),
      tx.object(TEST_PROTO_CFG),
      tx.pure.address(address),
      tx.object(SUI_CLOCK),
    ],
  })

  const result = await execute(tx)
  const ev = result.events?.find(e => e.type?.endsWith('::cast::CastRead'))

  if (result.effects.status.status === 'success' && ev) {
    console.log(`  ✅ PASS — expired cast read SUCCEEDED (v14 correct behavior)`)
    console.log(`     read_count: ${ev.parsedJson?.read_count}`)
    console.log(`     tx: ${result.digest}`)

    const zkOk = await verifyZkProxy(castId, result.digest)
    const overall = zkOk
    console.log(`  ✅ zkProxy SEAL release: ${zkOk ? 'PASS' : 'FAIL'}`)
    return overall
  } else {
    console.log(`  ❌ FAIL — expired read FAILED (v14 regression!): ${JSON.stringify(result.effects.status)}`)
    return false
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args[0] === '--verify-expired') {
  const castId = args[1] ?? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).castId
  const result = await verifyExpiredRead(castId)
  console.log('\n=== EXPIRY VERIFICATION RESULT:', result === true ? '✅ ALL PASS' : result === null ? '⏳ NOT YET EXPIRED' : '❌ FAILED')
} else {
  console.log('\n════════════════════════════════════════')
  console.log('  CONK v14 E2E Test — Package Setup')
  console.log('  ' + TEST_PACKAGE)
  console.log('════════════════════════════════════════')

  try {
    const { harborId, harborCapId } = await openHarbor()
    const { vesselId, vesselCapId } = await launchVessel(harborId)
    const { castId, expiresAt, soundTx } = await soundCast(vesselId, vesselCapId)
    const { key, iv, blobId } = await registerSealKey(castId)
    const { readTx } = await readCast(castId)
    const zkOk       = await verifyZkProxy(castId, readTx)
    const unpaidOk   = await verifyUnpaidFails(castId)

    const state = {
      castId, expiresAt, soundTx, readTx,
      vesselId, vesselCapId, harborId, harborCapId,
      sealKey: key, sealIv: iv, blobId,
      testTime: Date.now(),
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))

    console.log('\n════════════════════════════════════════')
    console.log('  IMMEDIATE RESULTS')
    console.log('════════════════════════════════════════')
    console.log(`  [1] Harbor + Vessel created    ✅`)
    console.log(`  [2] Cast sounded (24h expiry)  ✅  ${castId}`)
    console.log(`  [3] SEAL key registered (45d)  ✅`)
    console.log(`  [4] Pre-expiry read             ✅  payment routing OK`)
    console.log(`  [5] zkProxy SEAL release        ${zkOk ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  [6] Underpaid read rejected     ${unpaidOk ? '✅ PASS' : '❌ FAIL'}`)
    console.log(``)
    console.log(`  Expires: ${new Date(expiresAt).toLocaleString('en-US', {timeZone:'America/Chicago'})} CT`)
    console.log(`  State saved: ${STATE_FILE}`)
    console.log(``)
    console.log(`  Run after expiry:`)
    console.log(`  DAEMON_PRIVATE_KEY=<key> node e2e-v14-test.mjs --verify-expired`)
    console.log('════════════════════════════════════════')
  } catch (e) {
    console.error('\n❌ FAILED:', e.message)
    process.exit(1)
  }
}
