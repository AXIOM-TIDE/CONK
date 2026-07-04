#!/usr/bin/env node
/**
 * create-vessel-v14.mjs — Create v14 Vessel for agent wallet
 * Axiom Tide LLC — Franklin
 *
 * Usage:
 *   AGENT_KEY=<bech32_or_hex_key> node create-vessel-v14.mjs <AGENT_NAME>
 *
 * Example via Railway:
 *   railway run --service web \
 *     node /Users/franklin/CONK/create-vessel-v14.mjs ARISTO
 *
 * The Railway env will have ARISTO_CONK_PRIVATE_KEY, NEURAL_CONK_PRIVATE_KEY, etc.
 * This script detects which agent based on CLI arg and picks the right key.
 */

import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'

// ─── Config ───────────────────────────────────────────────────────────────────

const PROD_PACKAGE   = process.env.CONK_PACKAGE    || '0x265ec216d95c6109f92d90e310da4cfb0c123efa1c00540d8ced4e0d37392297'
const PROD_ABYSS     = process.env.CONK_ABYSS      || '0x075c8667d1780bdde01a8175cd458aa345b3f6e2a84c45b91f82b344a4325bd0'
const PROD_PROTO_CFG = process.env.CONK_PROTOCOL_CONFIG || '0xdc8e5131d6e3bec492a2e12b1d7beddbfec709ae5def8e775dab59c7a45421ea'
const PROD_DRIFT     = process.env.CONK_DRIFT       || '0x9312b6837bb12381849b413636064cd8d56b6ef84bf891b3f756b3cbb6157fad'
const SUI_CLOCK      = '0x0000000000000000000000000000000000000000000000000000000000000006'
const SUI_RPC        = process.env.CONK_SUI_RPC    || 'https://mainnet.sui.rpcpool.com'
const TATUM_KEY      = process.env.TATUM_API_KEY   || ''

const client = new SuiClient({
  url: SUI_RPC,
  ...(TATUM_KEY ? { headers: { 'x-api-key': TATUM_KEY } } : {}),
})

// ─── Agent detection ─────────────────────────────────────────────────────────

const AGENT = (process.argv[2] || '').toUpperCase()
if (!AGENT) {
  console.error('Usage: node create-vessel-v14.mjs <AGENT_NAME>  (e.g., ARISTO or NEURAL)')
  process.exit(1)
}

const KEY_ENV_VAR = `${AGENT}_CONK_PRIVATE_KEY`
const rawKey = process.env.AGENT_KEY || process.env[KEY_ENV_VAR]
if (!rawKey) {
  console.error(`ERROR: No key found. Set AGENT_KEY or ${KEY_ENV_VAR} env var.`)
  process.exit(1)
}

// ─── Keypair ──────────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n═══════════════════════════════════════════════════`)
console.log(`  Creating v14 Vessel for ${AGENT}`)
console.log(`  Wallet: ${address}`)
console.log(`  Package: ${PROD_PACKAGE}`)
console.log('═══════════════════════════════════════════════════\n')

// Check SUI balance
const suiBal = await client.getBalance({ owner: address })
console.log(`SUI balance: ${(Number(suiBal.totalBalance) / 1e9).toFixed(4)} SUI`)
if (BigInt(suiBal.totalBalance) < 10_000_000n) {
  console.error('ERROR: Insufficient SUI for gas. Need at least 0.01 SUI.')
  process.exit(1)
}

// Step 1: Create Harbor
console.log('\n[1/2] Creating Harbor...')
const harborTx = new Transaction()
harborTx.moveCall({
  target: `${PROD_PACKAGE}::harbor::open`,
  arguments: [],
})
const harborResult = await signAndExecute(harborTx)
if (harborResult.effects.status.status !== 'success') {
  console.error('harbor::open failed:', JSON.stringify(harborResult.effects.status))
  process.exit(1)
}
const harborId = harborResult.objectChanges?.find(
  c => c.type === 'created' && c.objectType?.includes('::harbor::Harbor')
)?.objectId
console.log(`  ✅ Harbor: ${harborId}`)
console.log(`     tx: ${harborResult.digest}`)

// Step 2: Create Vessel
console.log('\n[2/2] Creating Vessel...')
const vesselTx = new Transaction()
vesselTx.moveCall({
  target: `${PROD_PACKAGE}::vessel::open`,
  arguments: [vesselTx.object(harborId)],
})
const vesselResult = await signAndExecute(vesselTx)
if (vesselResult.effects.status.status !== 'success') {
  console.error('vessel::open failed:', JSON.stringify(vesselResult.effects.status))
  process.exit(1)
}
const vesselId = vesselResult.objectChanges?.find(
  c => c.type === 'created' && c.objectType?.includes('::vessel::Vessel')
)?.objectId
const vesselCapId = vesselResult.objectChanges?.find(
  c => c.type === 'created' && c.objectType?.includes('::vessel::VesselCap')
)?.objectId

console.log(`  ✅ Vessel:    ${vesselId}`)
console.log(`  ✅ VesselCap: ${vesselCapId}`)
console.log(`     tx: ${vesselResult.digest}`)

// ─── Output (for Railway env update) ─────────────────────────────────────────

console.log(`\n═══════════════════════════════════════════════════`)
console.log(`  DONE — Update Railway env for ${AGENT}:`)
console.log(`═══════════════════════════════════════════════════`)
console.log(`  ${AGENT}_HARBOR_ID=${harborId}`)
console.log(`  ${AGENT}_VESSEL_ID=${vesselId}`)
console.log(`  ${AGENT}_VESSEL_CAP=${vesselCapId}`)
console.log(`  ${AGENT}_WALLET=${address}`)
console.log('═══════════════════════════════════════════════════\n')

// Save to file for reference
const output = {
  agent: AGENT,
  wallet: address,
  harborId,
  vesselId,
  vesselCapId,
  harborTx: harborResult.digest,
  vesselTx: vesselResult.digest,
  timestamp: new Date().toISOString(),
  package: PROD_PACKAGE,
}
const outFile = `/tmp/vessel-${AGENT.toLowerCase()}-v14.json`
import('fs').then(({ writeFileSync }) => writeFileSync(outFile, JSON.stringify(output, null, 2)))
console.log(`State saved: ${outFile}`)
