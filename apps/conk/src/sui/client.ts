// CONK Sui Client
import { ADDRESSES, PACKAGES, RPC } from './index'
import { getSession, signWithZkLogin } from './zklogin'

export const NETWORK = 'testnet'
export const WALRUS_AGG = 'https://aggregator.walrus-testnet.walrus.space'
export const WALRUS_PUB = 'https://publisher.walrus-testnet.walrus.space'
export const USDC_TYPE = '0xcdd397f2cffb7f5d439f56fc01afe5585c5f06e3bcd2ee3a21753c566de313d9::usdc::USDC'

const IS_PROD = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
const PROXY = 'https://conk-zkproxy-v2.italktonumbers.workers.dev'

export const SUI_RPC = IS_PROD
  ? 'https://sui-testnet-rpc.publicnode.com'
  : 'https://fullnode.testnet.sui.io:443'

let _client: unknown = null

export async function getSuiClient() {
  if (_client) return _client
  const { SuiClient } = await import('@mysten/sui/client')
  const url = IS_PROD
    ? 'https://sui-testnet-rpc.publicnode.com'
    : 'https://fullnode.testnet.sui.io:443'
  console.log('[CONK] SuiClient URL:', url)
  _client = new SuiClient({ url })
  return _client as InstanceType<typeof import('@mysten/sui/client').SuiClient>
}

export async function crossPaywall(opts: {
  vesselId: string
  castId: string
  amountUsdc: number
  authorAddress?: string
  price?: number
}): Promise<string> {
  const session = getSession()
  if (!session) return 'mock_tx_' + Date.now()

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()
  const tx = new Transaction()

  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC coins found')

  const usdcCoinObj = tx.object(coins.data[0].coinObjectId)

  // 97/3 split — author gets 97%, treasury gets 3%
  const totalAmount = opts.amountUsdc
  const authorAmount = Math.floor(totalAmount * 0.97)
  const treasuryAmount = totalAmount - authorAmount

  const hasAuthor = opts.authorAddress && opts.authorAddress !== opts.vesselId

  if (hasAuthor && authorAmount > 0) {
    // Split into author + treasury
    const [authorPayment, treasuryPayment] = tx.splitCoins(usdcCoinObj, [
      tx.pure.u64(authorAmount),
      tx.pure.u64(treasuryAmount),
    ])
    tx.transferObjects([authorPayment], tx.pure.address(opts.authorAddress!))
    tx.transferObjects([treasuryPayment], tx.pure.address(ADDRESSES.TREASURY))
  } else {
    // No author or same vessel — 100% to treasury
    const [usdcPayment] = tx.splitCoins(usdcCoinObj, [tx.pure.u64(totalAmount)])
    tx.transferObjects([usdcPayment], tx.pure.address(ADDRESSES.TREASURY))
  }

  const suiCoins = await client.getCoins({ owner: session.address, coinType: '0x2::sui::SUI' })
  if (!suiCoins.data.length) throw new Error('No SUI for gas')

  tx.setSender(session.address)
  tx.setGasBudget(10000000)
  tx.setGasPayment([{ objectId: suiCoins.data[0].coinObjectId, version: suiCoins.data[0].version, digest: suiCoins.data[0].digest }])
  const txBytes = await tx.build({ client: client as any })
  const { toB64 } = await (await import('@mysten/sui/utils'))
  const { bytes, signature } = await signWithZkLogin(toB64(txBytes), session)

  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature: [signature],
    options: { showEffects: true },
  })

  if (result.effects?.status?.status !== 'success') {
    throw new Error('Transaction failed: ' + JSON.stringify(result.effects?.status))
  }
  return result.digest
}

export async function sponsorTx(tx: unknown, sender: string): Promise<{ sponsoredBytes: string; sponsorSig: string }> {
  const { Transaction } = await import('@mysten/sui/transactions')
  const { toB64 }       = await import('@mysten/sui/utils')
  const client          = await getSuiClient()

  const txBytes = await (tx as InstanceType<typeof Transaction>).build({
    client: client as any,
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

export function getStatus() {
  return {
    network: NETWORK,
    package: PACKAGES.CONK,
    treasury: ADDRESSES.TREASURY,
    gas: 'self-hosted',
    sui_rpc: SUI_RPC,
  }
}

export function isReady(): boolean {
  return !!PACKAGES.CONK
}
