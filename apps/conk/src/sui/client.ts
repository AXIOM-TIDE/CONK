/**
 * CONK Sui Client — Mainnet
 * Axiom Tide LLC — April 2026
 *
 * Wired to deployed Move contracts.
 * Package: 0x8cde30c2af7523193689e2f3eaca6dc4fadf6fd486471a6c31b14bc9db5164b2
 * Gas sponsored — users never pay gas. Privacy preserved.
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
const CLOCK   = '0x6'  // Sui system clock object

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
  // Check authType directly from session — not from sessionStorage wallet_name
  const authType = (session as any).authType
  if (authType === 'wallet') return signWithWallet(txBytes)
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

// ── Execute sponsored transaction ─────────────────────────────
async function executeTx(tx: unknown, sender: string): Promise<any> {
  const client = await getSuiClient()
  const { sponsoredBytes, sponsorSig } = await sponsorTx(tx, sender)
  const { bytes, signature }           = await signTx(sponsoredBytes)

  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature:        [signature, sponsorSig],
    options:          { showEffects: true, showObjectChanges: true },
  })

  if (result.effects?.status?.status !== 'success') {
    throw new Error('Transaction failed: ' + JSON.stringify(result.effects?.status))
  }
  return result
}

// ── Read on-chain USDC balance ────────────────────────────────
export async function getUsdcBalance(address: string): Promise<number> {
  try {
    const resp = await fetch(`${PROXY}/sui`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'suix_getBalance',
        params:  [address, USDC_TYPE],
      }),
    })
    const json = await resp.json()
    const total = Number(json.result?.totalBalance ?? 0)
    // microUSDC (6 decimals) → cents: divide by 10000
    return Math.floor(total / 10000)
  } catch (e) {
    console.warn('Balance read failed:', e)
    return 0
  }
}

// ── Open Harbor on-chain ──────────────────────────────────────
export async function openHarbor(tier: number = 1): Promise<{ harborId: string; harborCapId: string }> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()
  const tx     = new Transaction()

  // Get USDC for harbor open fee (TIER_1_COST + MINIMUM_BALANCE = 50000 + 100000 = 150000 microUSDC = $0.15)
  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC — fund your Harbor address first')

  const [payment] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [tx.pure.u64(150000)])

  const harborCap = tx.moveCall({
    target:    `${PACKAGE}::harbor::open`,
    arguments: [
      payment,
      tx.pure.u8(tier),
      tx.object(CLOCK),
    ],
  })

  // Transfer HarborCap to user
  tx.transferObjects([harborCap], tx.pure.address(session.address))
  tx.setSender(session.address)

  const result = await executeTx(tx, session.address)

  // Extract Harbor and HarborCap object IDs from transaction result
  const created = result.objectChanges?.filter((c: any) => c.type === 'created') ?? []
  const harborObj    = created.find((c: any) => c.objectType?.includes('::harbor::Harbor'))
  const harborCapObj = created.find((c: any) => c.objectType?.includes('::harbor::HarborCap'))

  if (!harborObj || !harborCapObj) throw new Error('Harbor creation failed — objects not found')

  return {
    harborId:    harborObj.objectId,
    harborCapId: harborCapObj.objectId,
  }
}

// ── Launch Vessel on-chain ────────────────────────────────────
export async function launchVessel(
  harborId:    string,
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
      tx.pure.u8(0), // GHOST tier — most anonymous
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

  if (!vesselObj || !vesselCapObj) throw new Error('Vessel launch failed — objects not found')

  return {
    vesselId:    vesselObj.objectId,
    vesselCapId: vesselCapObj.objectId,
  }
}

// ── Cross Paywall — read a cast via Relay ─────────────────────
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
  const client = await getSuiClient()
  const tx     = new Transaction()

  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC — fund your Harbor first')

  const totalAmount    = opts.amountUsdc
  const authorAmount   = Math.floor(totalAmount * 0.97)
  const treasuryAmount = totalAmount - authorAmount
  const hasAuthor      = opts.authorAddress && opts.authorAddress !== opts.vesselId

  const usdcCoinObj = tx.object(coins.data[0].coinObjectId)

  // If we have on-chain Harbor/Vessel objects use relay::process
  if (opts.harborId && opts.harborCapId && opts.vesselCapId) {
    const [feeCoin] = tx.splitCoins(usdcCoinObj, [tx.pure.u64(totalAmount)])

    // relay::process draws from Harbor, issues receipt
    tx.moveCall({
      target:    `${PACKAGE}::relay::process`,
      arguments: [
        tx.object(opts.harborId),
        tx.object(opts.harborCapId),
        tx.object(opts.vesselId),
        tx.object(opts.vesselCapId),
        tx.pure.u64(totalAmount),
        tx.object(CLOCK),
      ],
    })

    // Author payment
    if (hasAuthor && authorAmount > 0) {
      const [authorPayment, abyssPayment] = tx.splitCoins(feeCoin, [
        tx.pure.u64(authorAmount),
        tx.pure.u64(treasuryAmount),
      ])
      tx.transferObjects([authorPayment], tx.pure.address(opts.authorAddress!))
      tx.moveCall({
        target:    `${PACKAGE}::abyss::receive_read`,
        arguments: [tx.object(ABYSS), abyssPayment, tx.object(CLOCK)],
      })
    } else {
      tx.moveCall({
        target:    `${PACKAGE}::abyss::receive_read`,
        arguments: [tx.object(ABYSS), feeCoin, tx.object(CLOCK)],
      })
    }

  } else {
    // Fallback — direct USDC transfer without relay
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
  }

  tx.setSender(session.address)
  const result = await executeTx(tx, session.address)
  return result.digest
}

// ── Sound a Cast on-chain ─────────────────────────────────────
export async function soundCast(opts: {
  hook:         string
  body:         string
  mode:         number  // 0=open, 1=sealed, 2=eyes_only, 3=ghost
  duration:     number  // 1=24h, 2=48h, 3=72h, 4=7d
  price:        number  // microUSDC
  vesselId:     string
  vesselCapId:  string
}): Promise<string> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()
  const tx     = new Transaction()

  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC — fund your Harbor first')

  const [feeCoin] = tx.splitCoins(
    tx.object(coins.data[0].coinObjectId),
    [tx.pure.u64(1000)] // $0.001 sound fee
  )

  tx.moveCall({
    target:    `${PACKAGE}::cast::sound`,
    arguments: [
      feeCoin,
      tx.object(ABYSS),
      tx.object(opts.vesselId),
      tx.pure.u8(0), // vessel_tier — ghost
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(opts.hook))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(opts.body))),
      tx.pure.option('vector<u8>', null), // no media
      tx.pure.u8(opts.mode),
      tx.pure.address(session.address), // recipient
      tx.pure.u8(opts.duration),
      tx.pure.u64(opts.price),
      tx.object(CLOCK),
    ],
  })

  tx.setSender(session.address)
  const result = await executeTx(tx, session.address)
  return result.digest
}

// ── Withdraw Harbor — 100% to user, no protocol fee ──────────
export async function withdrawHarbor(opts: {
  toAddress:  string
  amountUsdc: number
}): Promise<string> {
  const session = getSession()
  if (!session) throw new Error('No session — please connect')

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()
  const tx     = new Transaction()

  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC to withdraw')

  const [payment] = tx.splitCoins(
    tx.object(coins.data[0].coinObjectId),
    [tx.pure.u64(opts.amountUsdc)]
  )
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
