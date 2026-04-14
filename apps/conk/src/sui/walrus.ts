/**
 * CONK Walrus Storage — Upload files/images anonymously
 * Routes through Cloudflare proxy to avoid CORS.
 */

import { RPC } from './index'

const PROXY      = RPC.PROXY
const AGGREGATOR = 'https://aggregator.walrus.site'

export interface WalrusUploadResult {
  blobId: string
  url: string
  size: number
}

export async function uploadToWalrus(file: File | Blob): Promise<WalrusUploadResult> {
  const resp = await fetch(`${PROXY}/walrus-upload?epochs=5`, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  if (!resp.ok) throw new Error(`Walrus upload failed: ${resp.status}`)
  const data = await resp.json()
  const blobId = data.newlyCreated?.blobObject?.blobId ?? data.alreadyCertified?.blobId
  if (!blobId) throw new Error('No blobId returned from Walrus')
  return {
    blobId,
    url: `${AGGREGATOR}/v1/blobs/${blobId}`,
    size: file.size,
  }
}

export function getWalrusUrl(blobId: string): string {
  return `${AGGREGATOR}/v1/blobs/${blobId}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
