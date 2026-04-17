/**
 * CONK Sui Client — Permanent Lighthouse Extension
 *
 * Add these exports to apps/conk/src/sui/client.ts
 * They follow the exact same pattern as soundCast() but with:
 *   - duration = 255 (permanent — max u8)
 *   - blobId attached in the body metadata
 *   - lighthouseType flag in the cast body
 *
 * DO NOT replace client.ts — paste these functions at the bottom,
 * above the getStatus() and isReady() exports.
 */

import { ADDRESSES, PACKAGES, RPC } from './index'
import { getSession, signWithZkLogin } from './zklogin'
import { isWalletSession, signWithWallet } from './walletSession'

// Re-use the internals already in client.ts (these are already defined there):
// rpc(), getUsdcCoins(), getSuiClient(), executeTx(), sponsorTx(), signTx()
// ── We reference them here as imports for standalone use ──

const PROXY   = RPC.PROXY
const PACKAGE = PACKAGES.CONK
const ABYSS   = ADDRESSES.ABYSS
const CLOCK   = '0x6'

// ─── Permanent lighthouse duration value ──────────────────────────────────────
const DURATION_PERMANENT = 255  // max u8 — no expiry

// ─── Upload to Walrus ─────────────────────────────────────────────────────────

export async function uploadToWalrus(
  file:       File | Blob | Uint8Array,
  mediaType?: string,
): Promise<{ blobId: string; url: string; sizeBytes: number }> {
  const mtype = mediaType ?? (file instanceof File ? file.type : 'application/octet-stream') ?? 'application/octet-stream'

  const body =
    file instanceof Uint8Array
      ? file
      : file instanceof File
        ? new Uint8Array(await file.arrayBuffer())
        : new Uint8Array(await (file as Blob).arrayBuffer())

  const sizeBytes = body.byteLength
  const MAX_BYTES = 500 * 1024 * 1024  // 500 MB

  if (sizeBytes > MAX_BYTES) {
    throw new Error(`File too large: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB (max 500 MB)`)
  }

  const res = await fetch(`${ADDRESSES.WALRUS_PUB}/v1/store`, {
    method:  'PUT',
    headers: { 'Content-Type': mtype },
    body:    body as BodyInit,
  })

  if (!res.ok) throw new Error(`Walrus upload failed: ${res.status} ${res.statusText}`)

  const data = await res.json() as {
    newlyCreated?:    { blobObject: { blobId: string } }
    alreadyCertified?: { blobId: string }
  }

  const blobId =
    data.newlyCreated?.blobObject?.blobId ??
    data.alreadyCertified?.blobId

  if (!blobId) throw new Error('Walrus upload returned no blobId')

  return {
    blobId,
    url:       `${ADDRESSES.WALRUS_AGG}/v1/${blobId}`,
    sizeBytes,
  }
}

// ─── Sound a permanent lighthouse on-chain ────────────────────────────────────

export async function soundPermanentLighthouse(opts: {
  hook:        string
  description: string
  blobId:      string
  mediaType:   string
  category:    string
  price:       number        // USDC base units
  tags:        string[]
  vesselId:    string
  vesselCapId: string
}): Promise<{ digest: string; castId: string }> {
  const session = getSession()
  if (!session) throw new Error('No session')

  const { Transaction } = await import('@mysten/sui/transactions')
  const tx    = new Transaction()

  // Build cast body — JSON metadata agents can parse
  const meta = JSON.stringify({
    v:          1,
    type:       'lighthouse',
    lighthouseType: 'permanent',
    mediaType:  opts.mediaType,
    category:   opts.category,
    tags:       opts.tags,
    blobId:     opts.blobId,
    beaconId:   opts.vesselId,
  })

  const body = `${opts.description}\n\n${meta}`

  const coins = await (window as any).__conkGetUsdcCoins(session.address)
  // Note: replace __conkGetUsdcCoins with the actual getUsdcCoins() call
  // from client.ts — it's already defined there, just not exported.
  // Easiest: export getUsdcCoins from client.ts and import it here.

  const [feeCoin] = tx.splitCoins(
    tx.object(coins[0].coinObjectId),
    [tx.pure.u64(1000)],
  )

  tx.moveCall({
    target:    `${PACKAGE}::cast::sound`,
    arguments: [
      feeCoin,
      tx.object(ABYSS),
      tx.object(opts.vesselId),
      tx.pure.u8(0),   // vessel index
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(opts.hook))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(body))),
      tx.pure.option('vector<u8>', null),
      tx.pure.u8(0),                    // mode: open
      tx.pure.address(session.address),
      tx.pure.u8(DURATION_PERMANENT),   // 255 = permanent
      tx.pure.u64(opts.price),
      tx.object(CLOCK),
    ],
  })

  tx.setSender(session.address)

  const result   = await (window as any).__conkExecuteTx(tx, session.address)
  // Same note: replace __conkExecuteTx with executeTx() from client.ts

  const created  = result.objectChanges?.filter((c: any) => c.type === 'created') ?? []
  const castObj  = created.find((c: any) => c.objectType?.includes('::cast::Cast'))

  return {
    digest: result.digest,
    castId: castObj?.objectId ?? '',
  }
}

// ─── How to wire these into client.ts ────────────────────────────────────────
//
// 1. Export getUsdcCoins from client.ts (just add 'export' to the function)
// 2. Export executeTx from client.ts (just add 'export' to the function)
// 3. Import both here and remove the __conk* placeholders above
// 4. Add uploadToWalrus and soundPermanentLighthouse to client.ts exports
//
// That's it. The soundCast() pattern is identical — same Move target,
// same arg order, just duration=255 and the body carries the blobId metadata.
