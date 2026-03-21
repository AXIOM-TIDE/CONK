/**
 * CONK Daemon API
 * Six core functions agents call directly — no UI required.
 *
 * Harbor → Shore → Daemon Vessel → Protocol Actions
 *
 * TODO (STEP 6): Replace mock implementations with real Sui transactions,
 * Walrus blob upload/fetch, and Seal encryption/decryption.
 */

import { useStore } from '../store/store'
import type { CastMode, CastDuration } from '../store/store'

export interface DaemonReceipt {
  id: string
  action: string
  timestamp: number
  fuelConsumed: number
  success: boolean
  // TODO (STEP 6): txDigest, blobId, sealPolicyId
}

function mkReceipt(action: string, fuelConsumed = 0.1): DaemonReceipt {
  return {
    id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    action,
    timestamp: Date.now(),
    fuelConsumed,
    success: true,
  }
}

/** cast — Post a signal to the tide */
export async function cast(
  hook: string,
  body: string,
  mode: CastMode = 'open',
  duration: CastDuration = '24h',
  opts?: { keywords?: string[]; securityQuestion?: string; securityAnswer?: string; unlocksAt?: number }
): Promise<DaemonReceipt> {
  const store = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')
  // TODO (STEP 6): encrypt body with Seal, upload to Walrus, write metadata to Sui
  await new Promise(r => setTimeout(r, 400))
  const { castDurationMs } = await import('../utils/scrubber')
  store.addCast({
    id: `cast_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    hook, mode, duration,
    expiresAt: Date.now() + castDurationMs(duration),
    createdAt: Date.now(),
    lastInteractionAt: Date.now(),
    tideCount: 0, tideReads: [0,0,0],
    vesselClass: vessel.class, vesselId: vessel.id,
    keywords: opts?.keywords,
    securityQuestion: opts?.securityQuestion,
    securityAnswer: opts?.securityAnswer,
    unlocksAt: opts?.unlocksAt,
  })
  store.debitVessel(0.1)
  return mkReceipt('cast')
}

/** read — Cross the payway and read a signal */
export async function read(castId: string): Promise<DaemonReceipt & { body: string }> {
  const store = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')
  // TODO (STEP 6): verify Sui paywall, fetch Walrus blob, decrypt via Seal
  await new Promise(r => setTimeout(r, 400))
  store.markCastRead(castId, '')
  store.debitVessel(0.1)
  store.addChartEntry({ type:'cast', id:castId, name:castId, visitedAt:Date.now() })
  const body = useStore.getState().driftCasts.find(c => c.id === castId)?.body ?? ''
  return { ...mkReceipt('read'), body }
}

/** enterDock — Join a sealed room */
export async function enterDock(dockId: string): Promise<DaemonReceipt> {
  const store = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')
  // TODO (STEP 6): verify dock membership on Sui, get Seal decryption key
  await new Promise(r => setTimeout(r, 400))
  store.debitVessel(0.1)
  return mkReceipt('enterDock')
}

/** respond — Answer a siren and cast into its dock */
export async function respond(sirenId: string, body: string): Promise<DaemonReceipt> {
  const store = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')
  // TODO (STEP 6): encrypt body, upload to Walrus, write to Sui dock thread
  await new Promise(r => setTimeout(r, 400))
  store.respondToSiren(sirenId)
  store.debitVessel(0.1)
  return mkReceipt('respond')
}

/** drawFuel — Pull funds from Shore into daemon vessel */
export async function drawFuel(amount: number): Promise<DaemonReceipt> {
  const store = useStore.getState()
  if (!store.vessel) throw new Error('No active vessel')
  if (!store.harbor || store.harbor.balance < amount) throw new Error('Insufficient Shore balance')
  // TODO (STEP 6): Sui tx — Shore → Relay pool → Vessel fuel note
  await new Promise(r => setTimeout(r, 300))
  store.fuelVessel(amount)
  return mkReceipt('drawFuel', 0)
}

/** burn — Emergency identity reset. Call immediately if vessel is compromised. */
export async function burn(): Promise<DaemonReceipt> {
  const store = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  // TODO (STEP 6): revoke Seal session keys, mark vessel dead on Sui
  await new Promise(r => setTimeout(r, 200))
  store.compromiseVessel(vessel.id)
  return mkReceipt('burn', 0)
}

/** status — Current daemon state snapshot */
export function status() {
  const { vessel, harbor } = useStore.getState()
  return {
    active:       !!vessel,
    vesselId:     vessel?.id ?? null,
    vesselClass:  vessel?.class ?? null,
    fuel:         vessel?.fuel ?? 0,
    shoreBalance: harbor?.balance ?? 0,
    autoBurn:     vessel?.autoBurn ?? true,
    autofuel:     vessel?.fuelDrawing ?? true,
  }
}
