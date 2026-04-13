/**
 * CONK Sui Client — Mainnet
 * All blockchain calls via raw JSON-RPC — no SDK version dependency.
 * Gas sponsored via Cloudflare Worker. Users never pay gas.
 */

import { ADDRESSES, PACKAGES, RPC } from './index'
import { getSession, signWithZkLogin } from './zklogin'
import { isWalletSession, signWithWallet } from './walletSession'

export const NETWORK   = 'mainnet'
export const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
export const SUI_RPC   = 'https://fullnode.mainnet.sui.io:443'

const PROXY   = RPC.PROXY
const PACKAGE = PACKAGES.CONK
const ABYSS   = ADDRESSES.ABYSS
const CLOCK   = '0x6'

// ── Raw RPC call ──────────────────────────────────────────────
async function rpc(method: string, params: any[]): Promise<any> {
  const resp = await fetch(`${PROXY}/sui`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await resp.json()
  if (json.error) throw new Error('RPC error: ' + JSON.stringify(json.error))
  return json.result
}

// ── Get USDC coins ────────────────────────────────────────────
async function getUsdcCoins(address: string): Promise<any[]> {
  const result = await rpc('suix_getCoins', [address, USDC_TYPE, null, 10])
  if (!result?.data?.length) throw new Error('No USDC — fund your Harbor address first')
  return result.data
}

// ── Get Sui client (for Transaction building only) ────────────
let _client: unknown = null
export async function getSuiClient() {
  if (_client) return _client
  const { SuiClient } = await import('@mysten/sui/client')
  _client = new SuiClient({ url: SUI_RPC })
  return _client as InstanceType<typeof import('@mysten/sui/client').SuiClient>
}

// ── Read on-chain USDC balance ────────────────────────────────
export async function getUsdcBalance(address: string): Promise<number> {
  try {
    const result = await rpc('suix_getBalance', [address, USDC_TYPE])
    const total  = Number(result?.totalBalance ?? 0)
    return Math.floor(total / 10000)
  } catch (e) {
    console.warn('Balance read failed:', e)
    return 0
  }
}

// ── Sign transaction ──────────────────────────────────────────
async function signTx(txBytes: string): Promise<{ bytes: string; signature: string }> {
  const session = getSession()
  if (!session) throw new Error('No session — please connect')
  const authType = (session as any).authType
  const walletName = sessionStorage.getItem('wallet_name')
  console.log('[signTx] authType:', authType, 'wallet_name:', walletName)
  if (authType === 'wallet' && walletName) return signWithWallet(txBytes)
  // Clear any stale wallet_name
  sessionStorage.removeItem('wallet_name')
  return signWithZkLogin(txBytes, session)
}

// ── Sponsor gas via Cloudflare Worker ─────────────────────────
export async function sponsorTx(tx: unknown, sender: string): Promise<{ sponsoredBytes: string; sponsorSig: string }> {
  const { Transaction } = await import('@mysten/sui/transactions')
  const { toB64 }       = await import('@mysten/sui/utils')
  const client          = await getSuiClient()

  // Build transaction kind only — worker adds gas
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

// ── Execute transaction via raw RPC ───────────────────────────
async function executeTx(tx: unknown, sender: string): Promise<any> {
  const { sponsoredBytes, sponsorSig } = await sponsorTx(tx, sender)
  const { bytes, signature }           = await signTx(sponsoredBytes)

  const result = await rpc('sui_executeTransactionBlock', [
    bytes,
    [signature, sponsorSig],
    { showEffects: true, showObjectChanges: true },
    'WaitForLocalExecution',
  ])

  if (result?.effects?.status?.status !== 'success') {
    throw new Error('Transaction failed: ' + JSON.stringify(result?.effects?.status))
  }
  return result
}

// ── Open Harbor on-chain ──────────────────────────────────────
export async function openHarbor(tier: number = 1): Promise<{ harborId: string; harborCapId: string }> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const tx     = new Transaction()
  const coins  = await getUsdcCoins(session.address)

  const [payment] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(150000)])

  const harborCap = tx.moveCall({
    target:    `${PACKAGE}::harbor::open`,
    arguments: [payment, tx.pure.u8(tier), tx.object(CLOCK)],
  })

  tx.transferObjects([harborCap], tx.pure.address(session.address))
  tx.setSender(session.address)

  const result = await executeTx(tx, session.address)
  const created = result.objectChanges?.filter((c: any) => c.type === 'created') ?? []
  const harborObj    = created.find((c: any) => c.objectType?.includes('::harbor::Harbor'))
  const harborCapObj = created.find((c: any) => c.objectType?.includes('::harbor::HarborCap'))

  if (!harborObj || !harborCapObj) throw new Error('Harbor creation failed')

  return { harborId: harborObj.objectId, harborCapId: harborCapObj.objectId }
}

// ── Launch Vessel on-chain ────────────────────────────────────
export async function launchVessel(
  harborId: string,
  harborCapId: string,
  burnAfterCast: boolean = false
): Promise<{ vesselId: string; vesselCapId: string }> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const tx = new Transaction()

  const vesselCap = tx.moveCall({
    target:    `${PACKAGE}::vessel::launch`,
    arguments: [
      tx.object(harborId),
      tx.pure.u8(0),
      tx.pure.bool(burnAfterCast),
      tx.object(CLOCK),
    ],
  })

  tx.transferObjects([vesselCap], tx.pure.address(session.address))
  tx.setSender(session.address)

  const result = await executeTx(tx, session.address)
  const created = result.objectChanges?.filter((c: any) => c.type === 'created') ?? []
  const vesselObj    = created.find((c: any) => c.objectType?.includes('::vessel::Vessel'))
  const vesselCapObj = created.find((c: any) => c.objectType?.includes('::vessel::VesselCap'))

  if (!vesselObj || !vesselCapObj) throw new Error('Vessel launch failed')

  return { vesselId: vesselObj.objectId, vesselCapId: vesselCapObj.objectId }
}

// ── Cross Paywall ─────────────────────────────────────────────
export async function crossPaywall(opts: {
  vesselId:       string
  castId:         string
  amountUsdc:     number
  authorAddress?: string
  price?:         number
  harborId?:      string
  harborCapId?:   string
  vesselCapId?:   string
}): Promise<string> {
  const session = getSession()
  if (!session) return 'mock_tx_' + Date.now()

  const { Transaction } = await import('@mysten/sui/transactions')
  const tx    = new Transaction()
  const coins = await getUsdcCoins(session.address)

  const totalAmount    = opts.amountUsdc
  const authorAmount   = Math.floor(totalAmount * 0.97)
  const treasuryAmount = totalAmount - authorAmount
  const hasAuthor      = opts.authorAddress && opts.authorAddress !== opts.vesselId
  const usdcCoinObj    = tx.object(coins[0].coinObjectId)

  if (hasAuthor && authorAmount > 0) {
    const [authorPayment, treasuryPayment] = tx.splitCoins(usdcCoinObj, [
      tx.pure.u64(authorAmount),
      tx.pure.u64(treasuryAmount),
    ])
    tx.transferObjects([authorPayment],   tx.pure.address(opts.authorAddress!))
    tx.transferObjects([treasuryPayment], tx.pure.address(ADDRESSES.TREASURY))
  } else {
    const [usdcPayment] = tx.splitCoins(usdcCoinObj, [tx.pure.u64(totalAmount)])
    tx.transferObjects([usdcPayment], tx.pure.address(ADDRESSES.TREASURY))
  }

  tx.setSender(session.address)
  const result = await executeTx(tx, session.address)
  return result.digest
}

// ── Sound a Cast on-chain ─────────────────────────────────────
export async function soundCast(opts: {
  hook:        string
  body:        string
  mode:        number
  duration:    number
  price:       number
  vesselId:    string
  vesselCapId: string
}): Promise<string> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const tx    = new Transaction()
  const coins = await getUsdcCoins(session.address)

  const [feeCoin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(1000)])

  tx.moveCall({
    target:    `${PACKAGE}::cast::sound`,
    arguments: [
      feeCoin,
      tx.object(ABYSS),
      tx.object(opts.vesselId),
      tx.pure.u8(0),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(opts.hook))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(opts.body))),
      tx.pure.option('vector<u8>', null),
      tx.pure.u8(opts.mode),
      tx.pure.address(session.address),
      tx.pure.u8(opts.duration),
      tx.pure.u64(opts.price),
      tx.object(CLOCK),
    ],
  })

  tx.setSender(session.address)
  const result = await executeTx(tx, session.address)
  return result.digest
}

// ── Withdraw Harbor ───────────────────────────────────────────
export async function withdrawHarbor(opts: {
  toAddress:  string
  amountUsdc: number
}): Promise<string> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const tx    = new Transaction()
  const coins = await getUsdcCoins(session.address)

  const [payment] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(opts.amountUsdc)])
  tx.transferObjects([payment], tx.pure.address(opts.toAddress))
  tx.setSender(session.address)

  const result = await executeTx(tx, session.address)
  return result.digest
}

export function getStatus() {
  return {
    network:  NETWORK,
    package:  PACKAGES.CONK,
    treasury: ADDRESSES.TREASURY,
    abyss:    ADDRESSES.ABYSS,
    gas:      'self-hosted',
    sui_rpc:  SUI_RPC,
  }
}

export function isReady(): boolean {
  return !!PACKAGES.CONK
}
