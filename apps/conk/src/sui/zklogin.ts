/**
 * CONK zkLogin Integration
 * Users sign transactions with Google — no seed phrase needed.
 * Vessel addresses derived from JWT — anonymous on-chain.
 */

import { RPC } from './index'

export const GOOGLE_CLIENT_ID = '628835024151-6u8eqr51da1ldcteub2986451sg69kpo.apps.googleusercontent.com'

export interface ZkLoginSession {
  address:    string
  maxEpoch:   number
  salt:       string
  proof?:     unknown
}

// ── STEP 1: START LOGIN ───────────────────────────────────────
export async function startZkLogin(): Promise<void> {
  const { generateRandomness } = await import('@mysten/sui/zklogin')
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519')
  const { getSuiClient } = await import('./client')

  // Generate ephemeral keypair for this session
  const ephemeralKeypair = new Ed25519Keypair()
  const randomness = generateRandomness()

  // Get current epoch from Sui
  const client = await getSuiClient() as any
  const { epoch } = await client.getLatestSuiSystemState()
  const maxEpoch = Number(epoch) + 10

  // Store session data
  sessionStorage.setItem('zklogin_ephemeral_secret', ephemeralKeypair.getSecretKey())
  sessionStorage.setItem('zklogin_randomness', randomness)
  sessionStorage.setItem('zklogin_maxEpoch', String(maxEpoch))

  // Generate nonce
  const { generateNonce } = await import('@mysten/sui/zklogin')
  const nonce = generateNonce(ephemeralKeypair.getPublicKey(), maxEpoch, randomness)

  // Redirect to Google OAuth
  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  window.location.origin,
    response_type: 'id_token',
    scope:         'openid',
    nonce:         nonce,
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── STEP 2: HANDLE RETURN FROM GOOGLE ────────────────────────
export async function handleZkLoginCallback(): Promise<ZkLoginSession | null> {
  // JWT comes back in URL hash: #id_token=...
  const hash = window.location.hash
  if (!hash.includes('id_token')) return null

  const params = new URLSearchParams(hash.slice(1))
  const jwt = params.get('id_token')
  if (!jwt) return null

  // Clear hash from URL
  window.history.replaceState(null, '', window.location.pathname)

  const { jwtToAddress } = await import('@mysten/sui/zklogin')

  // Get or create salt — stored locally, never on server
  let salt = localStorage.getItem('zklogin_salt')
  if (!salt) {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    salt = Array.from(array).map(b => b.toString(16).padStart(2,'0')).join('')
    localStorage.setItem('zklogin_salt', salt)
  }

  const address  = jwtToAddress(jwt, BigInt('0x' + salt))
  const maxEpoch = Number(sessionStorage.getItem('zklogin_maxEpoch') ?? 0)

  // Generate ZK proof
  const randomness   = sessionStorage.getItem('zklogin_randomness') ?? ''
  const secretKey    = sessionStorage.getItem('zklogin_ephemeral_secret') ?? ''
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519')
  const ephemeralKeypair   = Ed25519Keypair.fromSecretKey(secretKey)
  const extendedKey        = ephemeralKeypair.getPublicKey().toSuiBytes()
  const extendedKeyB64     = btoa(String.fromCharCode(...extendedKey))

  let proof: unknown = null
  try {
    const proverUrl = RPC.SHINAMI_KEY
      ? `https://api.shinami.com/zklogin/v1/prove`
      : 'https://prover-dev.mystenlabs.com/v1'

    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    if (RPC.SHINAMI_KEY) headers['X-API-Key'] = RPC.SHINAMI_KEY

    const resp = await fetch(proverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jwt,
        extendedEphemeralPublicKey: extendedKeyB64,
        maxEpoch,
        jwtRandomness: randomness,
        salt: BigInt('0x' + salt).toString(),
        keyClaimName: 'sub',
      }),
    })
    if (resp.ok) proof = await resp.json()
  } catch (e) {
    console.warn('ZK proof generation failed:', e)
  }

  const session: ZkLoginSession = { address, maxEpoch, salt, proof }
  sessionStorage.setItem('zklogin_session', JSON.stringify(session))
  sessionStorage.setItem('zklogin_jwt', jwt)

  return session
}

// ── SIGN TRANSACTION ──────────────────────────────────────────
export async function signWithZkLogin(
  tx: unknown,
  session: ZkLoginSession
): Promise<{ bytes: string; signature: string }> {
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519')
  const { getZkLoginSignature } = await import('@mysten/sui/zklogin')
  const { toB64 } = await import('@mysten/sui/utils')
  const { Transaction } = await import('@mysten/sui/transactions')
  const { getSuiClient } = await import('./client')

  const secretKey       = sessionStorage.getItem('zklogin_ephemeral_secret') ?? ''
  const ephemeralKeypair = Ed25519Keypair.fromSecretKey(secretKey)
  const client          = await getSuiClient()

  const txBytes = await (tx as InstanceType<typeof Transaction>).build({ client } as any)
  const { signature: ephemeralSig } = await ephemeralKeypair.signTransaction(txBytes)

  const zkLoginSig = getZkLoginSignature({
    inputs:           session.proof as any,
    maxEpoch:         session.maxEpoch,
    userSignature:    ephemeralSig,
  })

  return { bytes: toB64(txBytes), signature: zkLoginSig }
}

// ── HELPERS ───────────────────────────────────────────────────
export function getSession(): ZkLoginSession | null {
  try {
    const raw = sessionStorage.getItem('zklogin_session')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function isLoggedIn(): boolean {
  return !!getSession()
}

export function clearSession(): void {
  sessionStorage.removeItem('zklogin_session')
  sessionStorage.removeItem('zklogin_jwt')
  sessionStorage.removeItem('zklogin_randomness')
  sessionStorage.removeItem('zklogin_maxEpoch')
  sessionStorage.removeItem('zklogin_ephemeral_secret')
}

export function getAddress(): string | null {
  return getSession()?.address ?? null
}
