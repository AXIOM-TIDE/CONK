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
}): Promise<string> {
  const session = getSession()
  if (!session) return 'mock_tx_' + Date.now()

  const { Transaction } = await import('@mysten/sui/transactions')
  const client = await getSuiClient()
  const tx = new Transaction()

  const coins = await client.getCoins({ owner: session.address, coinType: USDC_TYPE })
  if (!coins.data.length) throw new Error('No USDC coins found')

  const usdcCoinObj = tx.object(coins.data[0].coinObjectId)
  const [usdcPayment] = tx.splitCoins(usdcCoinObj, [tx.pure.u64(opts.amountUsdc)])
  tx.transferObjects([usdcPayment], tx.pure.address(ADDRESSES.TREASURY))

  const suiCoins = await client.getCoins({ owner: session.address, coinType: '0x2::sui::SUI' })
  if (!suiCoins.data.length) throw new Error('No SUI for gas')

  tx.setSender(session.address)
  tx.setGasBudget(10000000)
  tx.setGasPayment([{ objectId: suiCoins.data[0].coinObjectId, version: suiCoins.data[0].version, digest: suiCoins.data[0].digest }])
  const { bytes, signature } = await signWithZkLogin(tx, session)

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

  const response = await fetch(`${PROXY}/gas`, {
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
    network: NETWORK,
    package: PACKAGES.CONK,
    treasury: ADDRESSES.TREASURY,
    shinami: RPC.SHINAMI_KEY ? 'ok' : 'missing',
    sui_rpc: SUI_RPC,
  }
}

export function isReady(): boolean {
  return !!(RPC.SHINAMI_KEY && PACKAGES.CONK)
}
