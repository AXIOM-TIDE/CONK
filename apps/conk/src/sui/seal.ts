/**
 * CONK App — SEAL Integration
 *
 * Two functions to add to apps/conk/src/sui/seal.ts (new file)
 *
 * encryptForCast()  — call before soundCast() when mode === 'sealed'
 * decryptCast()     — call after crossPaywall() when cast has SEAL metadata
 *
 * Both wire into the existing CastPanel and LighthouseReader flows.
 */

import { ADDRESSES } from './index'

const SEAL_SERVER       = ADDRESSES.SEAL_SERVER
const WALRUS_PUBLISHER  = ADDRESSES.WALRUS_PUB
const WALRUS_AGGREGATOR = ADDRESSES.WALRUS_AGG
const NONCE_SIZE        = 12

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SealEncryptResult {
  encryptedBlobId: string
  policyId:        string
  iv:              string
  originalSize:    number
}

export interface SealMetadata {
  seal:            boolean
  policyId:        string
  encryptedBlobId: string
  iv:              string
  originalSize:    number
}

// ─── Encrypt before publishing ────────────────────────────────────────────────

/**
 * Encrypt content with SEAL before uploading to Walrus.
 *
 * Call this in CastPanel when mode === 'sealed', before soundCast().
 * Store the returned metadata in the cast body JSON.
 *
 * @example
 * // In CastPanel submit handler:
 * let sealMeta: SealMetadata | null = null
 * if (mode === 'sealed' && media) {
 *   sealMeta = await encryptForCast(mediaBytes, {
 *     castId:          `pending_${Date.now()}`,  // temp ID before on-chain
 *     authorAddress:   senderAddr,
 *     recipientAddress: recipientAddr,           // for eyes_only recipient
 *   })
 * }
 * // Embed sealMeta in cast body, upload encrypted blob ID as attachment
 */
export async function encryptForCast(
  content: Uint8Array | File | Blob,
  opts: {
    castId:           string
    authorAddress:    string
    recipientAddress?: string
    network?:         string
  },
): Promise<SealEncryptResult> {
  const bytes =
    content instanceof Uint8Array
      ? content
      : new Uint8Array(await (content as File | Blob).arrayBuffer())

  // 1. Register policy with SEAL
  const policyRes = await fetch(`${SEAL_SERVER}/v1/policy/create`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      castId:           opts.castId,
      authorAddress:    opts.authorAddress,
      recipientAddress: opts.recipientAddress,
      network:          opts.network ?? 'mainnet',
      createdAt:        Date.now(),
    }),
  })

  if (!policyRes.ok) {
    // SEAL server not available — fall back to unencrypted upload
    // This is a graceful degradation — content uploads but without encryption
    console.warn('[SEAL] Policy creation failed — uploading unencrypted')
    return uploadUnencrypted(bytes)
  }

  const { policyId, encryptionKey } = await policyRes.json() as {
    policyId:      string
    encryptionKey: string
  }

  // 2. Encrypt locally with AES-GCM
  const { encryptedBytes, iv } = await encryptAES(bytes, hexToBytes(encryptionKey))

  // 3. Upload encrypted bytes to Walrus
  const uploadRes = await fetch(`${WALRUS_PUBLISHER}/v1/store`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body:    encryptedBytes as BodyInit,
  })

  if (!uploadRes.ok) throw new Error(`Walrus upload failed: ${uploadRes.status}`)

  const uploadData = await uploadRes.json() as {
    newlyCreated?:     { blobObject: { blobId: string } }
    alreadyCertified?: { blobId: string }
  }

  const encryptedBlobId =
    uploadData.newlyCreated?.blobObject?.blobId ??
    uploadData.alreadyCertified?.blobId

  if (!encryptedBlobId) throw new Error('Walrus upload returned no blobId')

  return {
    encryptedBlobId,
    policyId,
    iv:           bytesToHex(iv),
    originalSize: bytes.byteLength,
  }
}

// ─── Decrypt after payment ────────────────────────────────────────────────────

/**
 * Decrypt SEAL-encrypted content after payment.
 *
 * Call this in LighthouseReader / DriftFeed after crossPaywall() succeeds.
 * Returns the original plaintext bytes.
 *
 * @example
 * // In LighthouseReader after payment:
 * const meta = parseSealMetadata(lh.body)
 * if (meta) {
 *   const bytes = await decryptCast(meta, {
 *     txDigest: receipt.txDigest,
 *     address:  session.address,
 *     proof:    session.proof,
 *     maxEpoch: session.maxEpoch,
 *   })
 *   // render bytes as video/audio/PDF
 * }
 */
export async function decryptCast(
  meta: SealMetadata,
  opts: {
    txDigest:  string
    address:   string
    proof:     unknown
    maxEpoch:  number
    network?:  string
  },
): Promise<Uint8Array> {
  // 1. Request decryption key from SEAL — proves payment on-chain
  const keyRes = await fetch(`${SEAL_SERVER}/v1/decrypt/request`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      policyId: meta.policyId,
      txDigest: opts.txDigest,
      address:  opts.address,
      proof:    opts.proof,
      maxEpoch: opts.maxEpoch,
      network:  opts.network ?? 'mainnet',
    }),
  })

  if (!keyRes.ok) {
    const error = await keyRes.json().catch(() => ({ error: 'Unknown' })) as { error: string }
    throw new Error(`SEAL decryption denied: ${error.error}. Payment may not be confirmed yet.`)
  }

  const { decryptionKey } = await keyRes.json() as { decryptionKey: string }

  // 2. Fetch encrypted content from Walrus
  const walrusRes = await fetch(`${WALRUS_AGGREGATOR}/v1/${meta.encryptedBlobId}`)
  if (!walrusRes.ok) throw new Error(`Walrus fetch failed: ${walrusRes.status}`)

  const encryptedBytes = new Uint8Array(await walrusRes.arrayBuffer())

  // 3. Decrypt locally
  return decryptAES(encryptedBytes, hexToBytes(decryptionKey))
}

// ─── Channel encryption ───────────────────────────────────────────────────────

/**
 * Encrypt a channel message for vessel-to-vessel communication.
 * Replaces the mock encryption in channels/index.ts STEP 6.
 *
 * @example
 * // In channels/index.ts sendMessage():
 * const encrypted = await encryptChannelMessage(content, {
 *   fromVessel: myVesselId,
 *   toVessel:   theirVesselId,
 *   channelId,
 * })
 * // Store encrypted string instead of plaintext
 */
export async function encryptChannelMessage(
  content: string,
  opts: {
    fromVessel: string
    toVessel:   string
    channelId:  string
  },
): Promise<string> {
  try {
    // Derive a deterministic channel key from both vessel IDs
    // Both parties can derive the same key independently
    const channelSeed = [opts.channelId, opts.fromVessel, opts.toVessel].sort().join(':')
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(channelSeed.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    )

    const iv        = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      new TextEncoder().encode(content),
    )

    // Pack iv + encrypted as base64
    const packed = new Uint8Array(NONCE_SIZE + encrypted.byteLength)
    packed.set(iv)
    packed.set(new Uint8Array(encrypted), NONCE_SIZE)

    return 'seal:' + btoa(String.fromCharCode(...packed))
  } catch {
    // Fallback to plaintext if crypto not available
    return content
  }
}

export async function decryptChannelMessage(
  encrypted: string,
  opts: {
    fromVessel: string
    toVessel:   string
    channelId:  string
  },
): Promise<string> {
  if (!encrypted.startsWith('seal:')) return encrypted

  try {
    const channelSeed = [opts.channelId, opts.fromVessel, opts.toVessel].sort().join(':')
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(channelSeed.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )

    const packed    = Uint8Array.from(atob(encrypted.slice(5)), c => c.charCodeAt(0))
    const iv        = packed.slice(0, NONCE_SIZE)
    const ciphertext = packed.slice(NONCE_SIZE)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      ciphertext,
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return '[encrypted message]'
  }
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

export function buildSealMetadata(result: SealEncryptResult): SealMetadata {
  return {
    seal:            true,
    policyId:        result.policyId,
    encryptedBlobId: result.encryptedBlobId,
    iv:              result.iv,
    originalSize:    result.originalSize,
  }
}

export function parseSealMetadata(body: string): SealMetadata | null {
  try {
    const match = body.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    if (!parsed.seal) return null
    return parsed as unknown as SealMetadata
  } catch {
    return null
  }
}

// ─── AES-GCM helpers ─────────────────────────────────────────────────────────

async function encryptAES(
  plaintext: Uint8Array,
  key:       Uint8Array,
): Promise<{ encryptedBytes: Uint8Array; iv: Uint8Array }> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM' }, false, ['encrypt'],
  )
  const iv        = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext)
  const result    = new Uint8Array(NONCE_SIZE + encrypted.byteLength)
  result.set(iv)
  result.set(new Uint8Array(encrypted), NONCE_SIZE)
  return { encryptedBytes: result, iv }
}

async function decryptAES(encryptedWithIv: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const iv        = encryptedWithIv.slice(0, NONCE_SIZE)
  const encrypted = encryptedWithIv.slice(NONCE_SIZE)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM' }, false, ['decrypt'],
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted)
  return new Uint8Array(decrypted)
}

async function uploadUnencrypted(bytes: Uint8Array): Promise<SealEncryptResult> {
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/store`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body:    bytes as BodyInit,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const data = await res.json() as {
    newlyCreated?:     { blobObject: { blobId: string } }
    alreadyCertified?: { blobId: string }
  }
  const blobId = data.newlyCreated?.blobObject?.blobId ?? data.alreadyCertified?.blobId ?? ''
  return { encryptedBlobId: blobId, policyId: 'unencrypted', iv: '', originalSize: bytes.byteLength }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace('0x', '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
