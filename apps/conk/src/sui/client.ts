/**
 * CONK Sui Client — Real Implementation
 * Uses @mysten/sui (new package name)
 * 
 * Package: 0x135f21155784b0533a9d4565245f67e3e38e32fb9710ec9acf6ea15503f344bf
 * Treasury: 0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204
 * Network: Sui Testnet via Shinami
 */

import { ADDRESSES, PACKAGES, RPC } from './index'

export const NETWORK = 'testnet' as string

export const SUI_RPC     = RPC.SHINAMI_RPC || 'https://fullnode.testnet.sui.io:443'
export const WALRUS_AGG  = 'https://aggregator.walrus-testnet.walrus.space'
export const WALRUS_PUB  = 'https://publisher.walrus-testnet.walrus.space'

// Testnet USDC (Circle)
export const USDC_TYPE = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'

// ── SUI CLIENT ────────────────────────────────────────────────
// @mysten/sui v1.x API
let _client: unknown = null

export async function getSuiClient() {
  if (_client) return _client
  // Dynamic import to avoid SSR issues
  const { SuiClient, getFullnodeUrl } = await import('@mysten/sui/client')
  _client = new SuiClient({ url: SUI_RPC || getFullnodeUrl('testnet') })
  return _client as InstanceType<typeof import('@mysten/sui/client').SuiClient>
}

// ── CROSS PAYWALL ─────────────────────────────────────────────
export async function crossPaywall(opts: {
  vesselId:   string
  castId:     string
  amountUsdc: number   // cents
  signer:     unknown  // Ed25519Keypair or zkLogin signer
}): Promise<{ txDigest: string }> {
  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()

  const tx = new Transaction()

  // TODO: get USDC coin object for this wallet
  // const coins = await client.getCoins({ owner: signerAddress, coinType: USDC_TYPE })
  // const [coin] = tx.splitCoins(coins.data[0].coinObjectId, [opts.amountUsdc])

  // Transfer fee to treasury
  // tx.transferObjects([coin], ADDRESSES.TREASURY)

  // Call CONK contract authorize_read
  // tx.moveCall({
  //   target: `${PACKAGES.CONK}::cast::authorize_read`,
  //   arguments: [tx.pure.string(opts.castId), tx.pure.string(opts.vesselId)],
  // })

  // Sponsor gas via Shinami
  // const sponsored = await sponsorTx(tx)

  // Sign and execute
  // const result = await client.signAndExecuteTransaction({
  //   transaction: sponsored,
  //   signer: opts.signer as KeypairSigner,
  // })

  // return { txDigest: result.digest }

  // MOCK until zkLogin is wired
  await new Promise(r => setTimeout(r, 800))
  return { txDigest: `mock_${Date.now()}` }
}

// ── WALRUS UPLOAD ─────────────────────────────────────────────
export async function uploadToWalrus(content: string): Promise<{ blobId: string }> {
  // Encrypt first (Seal integration in next step)
  const encoder = new TextEncoder()
  const data = encoder.encode(content)

  const response = await fetch(`${WALRUS_AGG}/v1/store?epochs=5`, {
    method: 'PUT',
    body: data,
    headers: { 'Content-Type': 'application/octet-stream' },
  })

  if (!response.ok) throw new Error(`Walrus upload failed: ${response.status}`)

  const result = await response.json()
  // Walrus returns { newlyCreated: { blobObject: { blobId } } } or { alreadyCertified: { blobId } }
  const blobId = result?.newlyCreated?.blobObject?.blobId
             ?? result?.alreadyCertified?.blobId
             ?? result?.blobId

  if (!blobId) throw new Error('No blobId in Walrus response')
  return { blobId }
}

// ── WALRUS FETCH ──────────────────────────────────────────────
export async function fetchFromWalrus(blobId: string): Promise<string> {
  const response = await fetch(`${WALRUS_PUB}/v1/${blobId}`)
  if (!response.ok) throw new Error(`Walrus fetch failed: ${response.status}`)
  return await response.text()
}

// ── SHINAMI GAS SPONSOR ───────────────────────────────────────
export async function sponsorTx(tx: unknown): Promise<unknown> {
  if (!RPC.SHINAMI_KEY) throw new Error('SHINAMI_KEY not set')

  const { Transaction } = await import('@mysten/sui/transactions')
  const txBytes = await (tx as InstanceType<typeof Transaction>).build({ onlyTransactionKind: true })
  const b64 = btoa(String.fromCharCode(...txBytes))

  const response = await fetch(`${RPC.SHINAMI_GAS}/sponsor_transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': RPC.SHINAMI_KEY,
    },
    body: JSON.stringify({ txKindBytes: b64, sender: '', gasBudget: '10000000' }),
  })

  if (!response.ok) throw new Error(`Shinami error: ${response.status}`)
  return await response.json()
}

// ── STATUS CHECK ──────────────────────────────────────────────
export function getStatus() {
  return {
    network:     NETWORK,
    package:     PACKAGES.CONK,
    treasury:    ADDRESSES.TREASURY,
    shinami:     RPC.SHINAMI_KEY ? '✓' : '✗ missing',
    walrus_agg:  WALRUS_AGG,
    sui_rpc:     SUI_RPC,
  }
}

export function isReady(): boolean {
  return !!(RPC.SHINAMI_KEY && PACKAGES.CONK)
}
