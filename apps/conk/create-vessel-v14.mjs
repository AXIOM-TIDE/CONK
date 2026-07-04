#!/usr/bin/env node
/**
 * create-vessel-v14.mjs — Create v14 Harbor + Vessel for agent wallet
 * Axiom Tide LLC — Franklin
 *
 * Usage (via Railway - injects full private keys):
 *   railway run --service web node /Users/franklin/CONK/apps/conk/create-vessel-v14.mjs ARISTO
 *   railway run --service web node /Users/franklin/CONK/apps/conk/create-vessel-v14.mjs NEURAL
 *   railway run --service web node /Users/franklin/CONK/apps/conk/create-vessel-v14.mjs SPARK
 *
 * Contract API:
 *   harbor::open(payment: Coin<USDC>, tier: u8, clock: &Clock, ctx)  → HarborCap
 *   vessel::launch(harbor_id: ID, tier: u8, burn_after_cast: bool, clock, ctx) → VesselCap
 *
 * TIER_1 harbor: costs 50,000 + 100,000 min balance = 150,000 base USDC ($0.15)
 */

import { SuiClient, SuiHTTPTransport } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'

// ─── Config ───────────────────────────────────────────────────────────────────

const PROD_PACKAGE = process.env.CONK_PACKAGE || '0x265ec216d95c6109f92d90e310da4cfb0c123efa1c00540d8ced4e0d37392297'
const SUI_CLOCK    = '0x6'
const USDC_TYPE    = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
const SUI_RPC      = process.env.CONK_SUI_RPC || 'https://mainnet.sui.rpcpool.com'
const TATUM_KEY    = process.env.TATUM_API_KEY || ''

// Harbor tiers: TIER_1=1 costs 50,000 + 100,000 min balance = 150,000 USDC base
const HARBOR_TIER    = 1
const HARBOR_PAYMENT = 200_000  // 50k cost + 150k balance ($0.20)

// Vessel tier: OPEN=0
const VESSEL_TIER          = 0
const VESSEL_BURN_AFTER    = false

// ─── Agent detection ─────────────────────────────────────────────────────────

const AGENT = (process.argv[2] || '').toUpperCase()
if (!AGENT) {
  console.error('Usage: node create-vessel-v14.mjs <AGENT>  (ARISTO | NEURAL | SPARK)')
  process.exit(1)
}

const KEY_ENV = `${AGENT}_CONK_PRIVATE_KEY`
const rawKey  = process.env.AGENT_KEY || process.env[KEY_ENV]
if (!rawKey) {
  console.error(`ERROR: Set ${KEY_ENV} or AGENT_KEY env var`)
  process.exit(1)
}

// ─── Client + keypair ─────────────────────────────────────────────────────────

const client = new SuiClient({
  transport: new SuiHTTPTransport({
    url: SUI_RPC,
    rpc: { headers: TATUM_KEY ? { 'x-api-key': TATUM_KEY } : {} },
  }),
})

function loadKeypair(k) {
  k = k.trim()
  if (k.startsWith('suiprivkey')) {
    const { secretKey } = decodeSuiPrivateKey(k)
    return Ed25519Keypair.fromSecretKey(secretKey)
  }
  const hex = k.startsWith('0x') ? k.slice(2) : k
  return Ed25519Keypair.fromSecretKey(Buffer.from(hex, 'hex'))
}

const keypair = loadKeypair(rawKey)
const address = keypair.getPublicKey().toSuiAddress()

async function execute(tx) {
  tx.setSender(address)
  tx.setGasBudget(20_000_000)
  return client.signAndExecuteTransaction({
    signer:      keypair,
    transaction: tx,
    options: { showEffects: true, showEvents: true, showObjectChanges: true },
    requestType: 'WaitForLocalExecution',
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n═══════════════════════════════════════════════════`)
console.log(`  Creating v14 Harbor + Vessel for ${AGENT}`)
console.log(`  Wallet:  ${address}`)
console.log(`  Package: ${PROD_PACKAGE}`)
console.log('═══════════════════════════════════════════════════\n')

// Check SUI balance
const suiBal = await client.getBalance({ owner: address })
console.log(`SUI balance: ${(Number(suiBal.totalBalance) / 1e9).toFixed(4)} SUI`)
if (BigInt(suiBal.totalBalance) < 20_000_000n) {
  console.error(`ERROR: Need at least 0.02 SUI for gas. Have ${(Number(suiBal.totalBalance)/1e9).toFixed(4)} SUI`)
  process.exit(1)
}

// Check USDC
const usdcCoins = await client.getCoins({ owner: address, coinType: USDC_TYPE })
const usdcBal   = usdcCoins.data.reduce((s, c) => s + BigInt(c.balance), 0n)
console.log(`USDC balance: ${(Number(usdcBal) / 1_000_000).toFixed(6)} USDC (${usdcBal} base)`)
if (usdcBal < BigInt(HARBOR_PAYMENT)) {
  console.error(`ERROR: Need at least ${HARBOR_PAYMENT} base USDC ($${HARBOR_PAYMENT/1e6}). Have ${usdcBal}.`)
  process.exit(1)
}

// Find USDC coin with enough balance
const paymentCoin = usdcCoins.data.find(c => BigInt(c.balance) >= BigInt(HARBOR_PAYMENT))
if (!paymentCoin) {
  // Need to merge coins first
  console.error('ERROR: No single USDC coin with enough balance. Merge coins first.')
  process.exit(1)
}

// ─── Step 1: harbor::open ─────────────────────────────────────────────────────

console.log('\n[1/2] Creating Harbor (harbor::open)...')
const harborTx = new Transaction()
const [harborPayment] = harborTx.splitCoins(
  harborTx.object(paymentCoin.coinObjectId),
  [harborTx.pure.u64(HARBOR_PAYMENT)]
)

const harborCapResult = harborTx.moveCall({
  target: `${PROD_PACKAGE}::harbor::open`,
  arguments: [
    harborPayment,
    harborTx.pure.u8(HARBOR_TIER),
    harborTx.object(SUI_CLOCK),
  ],
})
// HarborCap is returned by value — must be consumed (transferred to self)
harborTx.transferObjects([harborCapResult], harborTx.pure.address(address))

const harborResult = await execute(harborTx)
if (harborResult.effects.status.status !== 'success') {
  console.error('harbor::open FAILED:', JSON.stringify(harborResult.effects.status))
  process.exit(1)
}

// Extract harbor_id from HarborOpened event
const harborEv = harborResult.events?.find(e => e.type?.endsWith('::harbor::HarborOpened'))
const harborId = harborEv?.parsedJson?.harbor_id
if (!harborId) {
  // Fallback: find from object changes
  const harborObj = harborResult.objectChanges?.find(
    c => c.type === 'created' && c.objectType?.includes('::harbor::Harbor')
  )
  if (!harborObj) {
    console.error('Could not find Harbor ID in tx output')
    process.exit(1)
  }
  console.log('  ✅ Harbor created:', harborObj.objectId)
  console.log(`     tx: ${harborResult.digest}`)
  var actualHarborId = harborObj.objectId
} else {
  console.log('  ✅ Harbor created:', harborId)
  console.log(`     tx: ${harborResult.digest}`)
  var actualHarborId = harborId
}

// ─── Step 2: vessel::launch ───────────────────────────────────────────────────

console.log('\n[2/2] Launching Vessel (vessel::launch)...')
const vesselTx = new Transaction()

const vesselCapResult = vesselTx.moveCall({
  target: `${PROD_PACKAGE}::vessel::launch`,
  arguments: [
    vesselTx.pure.id(actualHarborId),  // harbor_id: ID
    vesselTx.pure.u8(VESSEL_TIER),     // OPEN tier
    vesselTx.pure.bool(VESSEL_BURN_AFTER),
    vesselTx.object(SUI_CLOCK),
  ],
})
// VesselCap returned by value — transfer to self
vesselTx.transferObjects([vesselCapResult], vesselTx.pure.address(address))

const vesselResult = await execute(vesselTx)
if (vesselResult.effects.status.status !== 'success') {
  console.error('vessel::launch FAILED:', JSON.stringify(vesselResult.effects.status))
  process.exit(1)
}

const vesselCap  = vesselResult.objectChanges?.find(
  c => c.type === 'created' && c.objectType?.includes('::vessel::VesselCap')
)
const vesselObj  = vesselResult.objectChanges?.find(
  c => c.type === 'created' &&
  c.objectType?.includes('::vessel::Vessel') &&
  !c.objectType?.includes('::vessel::VesselCap')
)
const vesselId   = vesselObj?.objectId
const vesselCapId = vesselCap?.objectId

console.log(`  ✅ Vessel:    ${vesselId}`)
console.log(`  ✅ VesselCap: ${vesselCapId}`)
console.log(`     tx: ${vesselResult.digest}`)

// ─── Output ───────────────────────────────────────────────────────────────────

console.log(`\n═══════════════════════════════════════════════════`)
console.log(`  DONE — Railway env vars to set for ${AGENT}:`)
console.log(`═══════════════════════════════════════════════════`)
console.log(`  ${AGENT}_HARBOR_ID=${actualHarborId}`)
console.log(`  ${AGENT}_VESSEL_ID=${vesselId}`)
console.log(`  ${AGENT}_VESSEL_CAP=${vesselCapId}`)
console.log(`  ${AGENT}_WALLET=${address}`)
console.log('═══════════════════════════════════════════════════\n')

import { writeFileSync } from 'fs'
writeFileSync(`/tmp/vessel-${AGENT.toLowerCase()}-v14.json`, JSON.stringify({
  agent: AGENT, wallet: address, harborId: actualHarborId,
  vesselId, vesselCapId,
  harborTx: harborResult.digest, vesselTx: vesselResult.digest,
  timestamp: new Date().toISOString(), package: PROD_PACKAGE,
}, null, 2))
console.log(`State: /tmp/vessel-${AGENT.toLowerCase()}-v14.json`)
