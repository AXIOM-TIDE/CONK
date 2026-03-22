/**
 * CONK Daemon API — v2
 * All actions now flow through the gateway layer.
 * Content informs. Policy executes. Your agent cannot be hijacked.
 *
 * TODO (STEP 6): Replace mock implementations with Sui/Walrus/Seal
 */

import { useStore } from '../store/store'
import { receive, check, record, heartbeat } from '../gateway'
import type { CastMode, CastDuration } from '../store/store'
import type { DaemonPolicy } from '../gateway/types'
import type { HeartbeatConfig } from '../gateway/heartbeat'
import { DEFAULT_POLICY } from '../gateway/types'

export interface DaemonReceipt {
  id:           string
  action:       string
  timestamp:    number
  fuelConsumed: number
  success:      boolean
  gatewayId?:   string
}

function mkReceipt(action: string, fuelConsumed = 0.1, gatewayId?: string): DaemonReceipt {
  return {
    id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    action, timestamp: Date.now(), fuelConsumed, success: true, gatewayId,
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
  const store  = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')

  // Rate limit check
  const rl = check(vessel.id, 'cast')
  if (!rl.allowed) throw new Error(`Rate limit: ${rl.reason}. Resets at ${new Date(rl.resetAt).toLocaleTimeString()}`)

  // TODO (STEP 6): encrypt body, upload to Walrus, write metadata to Sui
  await new Promise(r => setTimeout(r, 400))

  const { castDurationMs: getDuration } = await import('../utils/scrubber')
  store.addCast({
    id: `cast_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    hook, mode, duration,
    expiresAt: Date.now() + getDuration(duration),
    createdAt: Date.now(), lastInteractionAt: Date.now(),
    tideCount: 0, tideReads: [0,0,0],
    vesselClass: vessel.class, vesselId: vessel.id,
    keywords: opts?.keywords,
    securityQuestion: opts?.securityQuestion,
    securityAnswer: opts?.securityAnswer,
    unlocksAt: opts?.unlocksAt,
  })
  store.debitVessel(0.1)
  record(vessel.id, 'cast')
  return mkReceipt('cast')
}

/** read — Cross the payway and read a signal */
export async function read(castId: string): Promise<DaemonReceipt & { body: string }> {
  const store  = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')

  const rl = check(vessel.id, 'read')
  if (!rl.allowed) throw new Error(`Rate limit: ${rl.reason}`)

  // TODO (STEP 6): verify Sui paywall, fetch Walrus blob, decrypt via Seal
  await new Promise(r => setTimeout(r, 400))

  store.markCastRead(castId, '')
  store.debitVessel(0.1)
  store.addChartEntry({ type:'cast', id:castId, name:castId, visitedAt:Date.now() })
  record(vessel.id, 'read')

  const body = useStore.getState().driftCasts.find(c => c.id === castId)?.body ?? ''
  return { ...mkReceipt('read'), body }
}

/** enterDock — Join an information port */
export async function enterDock(dockId: string): Promise<DaemonReceipt> {
  const store  = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')

  const rl = check(vessel.id, 'dock')
  if (!rl.allowed) throw new Error(`Rate limit: ${rl.reason}`)

  // TODO (STEP 6): verify dock membership on Sui, get Seal decryption key
  await new Promise(r => setTimeout(r, 400))

  store.debitVessel(0.1)
  record(vessel.id, 'dock')
  return mkReceipt('enterDock')
}

/** respond — Answer a siren */
export async function respond(sirenId: string, body: string): Promise<DaemonReceipt> {
  const store  = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')
  if (vessel.fuel < 0.1) throw new Error('Insufficient fuel')

  const rl = check(vessel.id, 'siren')
  if (!rl.allowed) throw new Error(`Rate limit: ${rl.reason}`)

  // Gateway classify the response body before sending
  const msg = receive({
    content:       body,
    source:        vessel.id,
    ownerVesselId: vessel.id,
  })
  if (!msg.allowed) throw new Error('Gateway blocked response — flagged content')

  // TODO (STEP 6): encrypt body, upload to Walrus, write to Sui dock thread
  await new Promise(r => setTimeout(r, 400))

  store.respondToSiren(sirenId)
  store.debitVessel(0.1)
  record(vessel.id, 'siren')
  return mkReceipt('respond', 0.1, msg.id)
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

/** burn — Emergency identity reset */
export async function burn(): Promise<DaemonReceipt> {
  const store  = useStore.getState()
  const vessel = store.vessel
  if (!vessel) throw new Error('No active vessel')

  // TODO (STEP 6): revoke Seal session keys, mark vessel dead on Sui
  await new Promise(r => setTimeout(r, 200))

  store.compromiseVessel(vessel.id)
  return mkReceipt('burn', 0)
}

/** startHeartbeat — begin 30min sleep/wake cycle */
export function startHeartbeat(config: HeartbeatConfig = {}): void {
  const store  = useStore.getState()
  const vessel = store.vessel
  heartbeat.start({
    ...config,
    onWake: (summary) => {
      console.log('[CONK] Heartbeat wake:', summary)
      config.onWake?.(summary)
    },
  })
}

/** stopHeartbeat */
export function stopHeartbeat(): void {
  heartbeat.stop()
}

/** status — Current daemon state snapshot */
export function status() {
  const { vessel, harbor, shore } = useStore.getState()
  return {
    active:       !!vessel,
    vesselId:     vessel?.id ?? null,
    vesselClass:  vessel?.class ?? null,
    fuel:         vessel?.fuel ?? 0,
    shoreBalance: shore?.balance ?? harbor?.balance ?? 0,
    autoBurn:     vessel?.autoBurn ?? true,
    autofuel:     vessel?.fuelDrawing ?? true,
    heartbeat:    heartbeat.getStatus(),
  }
}
