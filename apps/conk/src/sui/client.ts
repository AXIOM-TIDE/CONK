/**
 * CONK Sui Client — Mainnet
 * Axiom Tide LLC — April 2026
 * 
 * Gas sponsored via self-hosted Cloudflare Worker.
 * Users never pay gas. Privacy preserved — no wallet correlation.
 */

import { ADDRESSES, PACKAGES, RPC } from './index'
import { getSession, signWithZkLogin } from './zklogin'
import { isWalletSession, signWithWallet } from './walletSession'

export const NETWORK   = 'mainnet'
export const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
export const SUI_RPC   = 'https://fullnode.mainnet.sui.io:443'

const PROXY = RPC.PROXY

let _client: unknown = null

export async function getSuiClient() {
  if (_client) return _client
  const { SuiClient } = await import('@mysten/sui/client')
  _client = new SuiClient({ url: SUI_RPC })
  return _client as InstanceType<typeof import('@mysten/sui/client').SuiClient>
}

// ── Sign transaction — zkLogin or wallet ──────────────────────
async function signTx(txBytes: string): Promise<{ bytes: string; signature: string }> {
  const session = getSession()
  if (!session) throw new Error('No session — please connect')

  if (isWalletSession()) {
    return signWithWallet(txBytes)
  }
  return signWithZkLogin(txBytes, session)
}

// ── Sponsor gas via Cloudflare Worker ─────────────────────────
export async function sponsorTx(tx: unknown, sender: string): Promise<{ sponsoredBytes: string; sponsorSig: string }> {
  const { Transaction } = await import('@mysten/sui/transactions')
  const { toB64 }       = await import('@mysten/sui/utils')
  const client          = await getSuiClient()

  const txBytes = await (tx as InstanceType<typeof Transaction>).build({
    client:              client as any,
    onlyTransactionKind: true,
  })

  const response = await fetch(`${PROXY}/gas`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ txBytes: toB64(txBytes), sender }),
  })

  if (!response.ok) throw new Error('Gas sponsor error: ' + response.status)
  const json = await response.json()
  if (json.error) throw new Error('Gas sponsor error: ' + json.error)
  return json
}

// ── Cross Paywall — read a cast or sound a cast ───────────────
export async function crossPaywall(opts: {
  vesselId:       string
  castId:         string
  amountUsdc:     number
  authorAddress?: string
  price?:         number
}): Promise<string> {
  const session = getSession()
  if (!session) return 'mock_tx_' + Date.now()

  const { Transaction } = await import('@mysten/sui/transactions')
  const { toB64, fromB64 } = await import('@mysten/sui/utils')
  const client  = await getSuiClient()
  const tx      = new Transaction()

  // Get USDC coins
  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC in Harbor — fund your Harbor first')

  const usdcCoinObj   = tx.object(coins.data[0].coinObjectId)
  const totalAmount   = opts.amountUsdc
  const authorAmount  = Math.floor(totalAmount * 0.97)
  const treasuryAmount = totalAmount - authorAmount
  const hasAuthor     = opts.authorAddress && opts.authorAddress !== opts.vesselId

  if (hasAuthor && authorAmount > 0) {
    const [authorPayment, treasuryPayment] = tx.splitCoins(usdcCoinObj, [
      tx.pure.u64(authorAmount),
      tx.pure.u64(treasuryAmount),
    ])
    tx.transferObjects([authorPayment],  tx.pure.address(opts.authorAddress!))
    tx.transferObjects([treasuryPayment], tx.pure.address(ADDRESSES.TREASURY))
  } else {
    const [usdcPayment] = tx.splitCoins(usdcCoinObj, [tx.pure.u64(totalAmount)])
    tx.transferObjects([usdcPayment], tx.pure.address(ADDRESSES.TREASURY))
  }

  tx.setSender(session.address)

  // Get sponsored gas from Cloudflare Worker
  const { sponsoredBytes, sponsorSig } = await sponsorTx(tx, session.address)

  // Sign with zkLogin or wallet
  const { bytes, signature } = await signTx(sponsoredBytes)

  // Execute with both signatures — user + sponsor
  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature:        [signature, sponsorSig],
    options:          { showEffects: true },
  })

  if (result.effects?.status?.status !== 'success') {
    throw new Error('Transaction failed: ' + JSON.stringify(result.effects?.status))
  }

  return result.digest
}

export function getStatus() {
  return {
    network:  NETWORK,
    package:  PACKAGES.CONK,
    treasury: ADDRESSES.TREASURY,
    gas:      'self-hosted',
    sui_rpc:  SUI_RPC,
  }
}

export function isReady(): boolean {
  return !!PACKAGES.CONK
}
