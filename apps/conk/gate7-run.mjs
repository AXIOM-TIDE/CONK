/**
 * Gate 7 wrapper — converts hex Railway key → Sui bech32, then runs --verify-expired
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { execSync } from 'child_process'

const hexKey = process.env.CRYPTO_CONK_PRIVATE_KEY
if (!hexKey) { console.error('CRYPTO_CONK_PRIVATE_KEY not set'); process.exit(1) }

const raw = hexKey.startsWith('0x') ? hexKey.slice(2) : hexKey
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(raw, 'hex'))
const bech32Key = keypair.getSecretKey()

console.log(`Wallet: ${keypair.getPublicKey().toSuiAddress()}`)
console.log(`Key format OK — running --verify-expired...\n`)

try {
  const out = execSync(
    `node e2e-v14-test.mjs --verify-expired`,
    {
      cwd: '/Users/franklin/CONK/apps/conk',
      env: { ...process.env, DAEMON_PRIVATE_KEY: bech32Key, SUI_RPC_URL: 'https://mainnet.sui.rpcpool.com' },
      stdio: 'inherit',
      timeout: 120000,
    }
  )
} catch (e) {
  process.exit(e.status ?? 1)
}
