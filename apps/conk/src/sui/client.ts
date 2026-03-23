/**
 * CONK Sui Client — STEP 6 implementation
 * Treasury: 0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204
 */

import { ADDRESSES, PACKAGES, RPC } from './index'

export const NETWORK = 'testnet' as string

// Use Shinami RPC for all Sui calls — faster and gas-sponsored
export const SUI_RPC = RPC.SHINAMI_RPC || RPC.TESTNET_RPC

export const WALRUS_AGG = NETWORK === 'mainnet'
  ? 'https://aggregator.walrus.space'
  : ADDRESSES.WALRUS_AGG

export const WALRUS_PUB = NETWORK === 'mainnet'
  ? 'https://publisher.walrus.space'
  : ADDRESSES.WALRUS_PUB

export const USDC_TYPE = NETWORK === 'mainnet'
  ? '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
  : '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'

export async function crossPaywall(opts: {
  vesselId: string; castId: string; amountUsdc: number; keypair: unknown
}): Promise<{ txDigest: string }> {
  // TODO (STEP 6A): implement with @mysten/sui.js TransactionBlock
  // 1. Split USDC coin for amountUsdc cents
  // 2. Transfer to ADDRESSES.TREASURY
  // 3. Call PACKAGES.CONK::cast::authorize_read(vesselId, castId)
  // 4. Sponsor gas via Shinami: RPC.SHINAMI_KEY
  throw new Error('crossPaywall: add Shinami key + deploy contracts first')
}

export async function uploadToWalrus(opts: {
  content: string; sealKey?: string
}): Promise<{ blobId: string; size: number }> {
  // TODO (STEP 6B):
  // 1. Encrypt: sealClient.encrypt(content, { key: sealKey })
  // 2. PUT to WALRUS_AGG/v1/store
  // 3. Return { blobId, size }
  throw new Error('uploadToWalrus: add Shinami key first')
}

export async function fetchFromWalrus(opts: {
  blobId: string; sealKey?: string
}): Promise<string> {
  // TODO (STEP 6C):
  // 1. GET WALRUS_PUB/v1/{blobId}
  // 2. Decrypt: sealClient.decrypt(encrypted, { key: sealKey })
  // 3. Return plaintext
  throw new Error('fetchFromWalrus: add Shinami key first')
}

export async function sponsorTransaction(txBytes: string): Promise<string> {
  if (!RPC.SHINAMI_KEY) throw new Error('Add SHINAMI_KEY to src/sui/index.ts')
  const response = await fetch('https://api.shinami.com/gas/v1/sponsor_transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': RPC.SHINAMI_KEY },
    body: JSON.stringify({ txBytes, gasBudget: 10000000 }),
  })
  const { sponsoredTxBytes } = await response.json()
  return sponsoredTxBytes
}

export function isReady(): boolean {
  return !!(RPC.SHINAMI_KEY && PACKAGES.CONK)
}

export function getStatus(): Record<string, string> {
  return {
    network:     NETWORK,
    treasury:    ADDRESSES.TREASURY,
    shinami:     RPC.SHINAMI_KEY ? '✓ configured' : '✗ missing',
    package:     PACKAGES.CONK   ? '✓ deployed'   : '✗ not deployed',
    relay:       ADDRESSES.RELAY_POOL ? '✓ deployed' : '✗ not deployed',
    walrus:      WALRUS_AGG,
  }
}
