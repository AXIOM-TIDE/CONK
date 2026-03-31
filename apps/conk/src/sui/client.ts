// CONK Sui Client - Real Implementation
// Uses @mysten/sui (new package name)
// Package: 0x135f21155784b0533a9d4565245f67e3e38e32fb9710ec9acf6ea15503f344bf
// Treasury: 0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204
// Network: Sui Testnet — public RPC only, Shinami used for gas sponsorship only

import { ADDRESSES, PACKAGES, RPC } from './index'
import { getSession, signWithZkLogin } from './zklogin'

export const NETWORK = 'testnet'

// Always use public testnet RPC for SuiClient — never Shinami node directly
export const SUI_RPC    = 'https://fullnode.testnet.sui.io:443'
export const WALRUS_AGG = 'https://aggregator.walrus-testnet.walrus.space'
export const WALRUS_PUB = 'https://publisher.walrus-testnet.walrus.space'

export const USDC_TYPE = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'

let _client: unknown = null

export async function getSuiClient() {
  if (_client) return _client
  const { SuiClient } = await import('@mysten/sui/client')
  // Hardcoded public testnet URL — never use Shinami node directly from browser
  const url = 'https://fullnode.testnet.sui.io:443'
  console.log('[CONK] SuiClient URL:', url)
  _client = new SuiClient({ url })
  return _client as InstanceType<typeof import('@mysten/sui/client').SuiClient>
}

export async function crossPaywall(opts: {
  vesselId: string
  castId: string
  amountUsdc: number
}): Promise<string> {
  const session = getSession()
  if (!session) {
    // No zkLogin session — mock transaction for testing/demo
    return 'mock_tx_' + Date.now()
  }

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()

  const tx = new Transaction()

  // Get USDC coins from the user's wallet
  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC coins found')

  // Split exact amount needed (amountUsdc is in USDC micro units, 6 decimals)
  const usdcCoinObj = tx.object(coins.data[0].coinObjectId)
  const [usdcPayment] = tx.splitCoins(usdcCoinObj, [tx.pure.u64(opts.amountUsdc)])

  // Call the real cast::read Move function
  tx.moveCall({
    target: `${PACKAGES.CONK}::cast::read`,
    arguments: [
      tx.object(opts.castId),               // Cast object
      usdcPayment,                           // Coin<USDC>
      tx.object(ADDRESSES.ABYSS),            // Abyss shared object
      tx.pure.address(session.address),      // vessel address
      tx.object('0x6'),                      // Clock object
    ],
  })

  const sponsored = await sponsorTx(tx, session.address)
  const sponsoredTx = sponsored as any

  const { bytes, signature } = await signWithZkLogin(sponsoredTx.txBytes, session)

  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature: [sponsoredTx.signature, signature].filter(Boolean),
    options: { showEffects: true },
  })

  if (result.effects?.status?.status !== 'success') {
    throw new Error('Transaction failed: ' + JSON.stringify(result.effects?.status))
  }
  return result.digest
}

export async function sponsorTx(tx: unknown, sender: string): Promise<unknown> {
  if (!RPC.SHINAMI_KEY) throw new Error('SHINAMI_KEY not set')

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()

  const { toB64 } = await import('@mysten/sui/utils')
  const txBytes = await (tx as InstanceType<typeof Transaction>).build({
    client: client as any,
    onlyTransactionKind: true,
  })
  const b64 = toB64(txBytes)

  const response = await fetch('/api/gas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': RPC.SHINAMI_KEY,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'gas_sponsorTransactionBlock',
      params: [b64, sender, 100000000],
    }),
  })

  if (!response.ok) throw new Error('Shinami error: ' + response.status)

  const json = await response.json()
  if (json.error) throw new Error('Shinami RPC error: ' + json.error.message)

  return json.result
}

export function getStatus() {
  return {
    network:    NETWORK,
    package:    PACKAGES.CONK,
    treasury:   ADDRESSES.TREASURY,
    shinami:    RPC.SHINAMI_KEY ? 'ok' : 'missing',
    walrus_agg: WALRUS_AGG,
    sui_rpc:    SUI_RPC,
  }
}

export function isReady(): boolean {
  return !!(RPC.SHINAMI_KEY && PACKAGES.CONK)
}