/**
 * CONK Daemon Heartbeat
 * 30-minute sleep/wake cycle.
 * Daemon wakes, scans Drift for matching signals, acts within policy, sleeps.
 * Shore costs only accrue when daemon acts — not while sleeping.
 */

import { inbox } from './inbox'
import { classify } from './classifier'
import { checkRateLimit, recordAction } from './ratelimiter'
import { useStore } from '../store/store'
import type { DaemonPolicy } from './types'
import { DEFAULT_POLICY } from './types'

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

export interface HeartbeatConfig {
  intervalMs?:      number
  keywords?:        string[]         // scan Drift for these keywords
  autoRead?:        boolean          // auto-read matching signals within policy
  autoRespond?:     boolean          // auto-respond to matching sirens
  policy?:          DaemonPolicy
  onWake?:          (summary: HeartbeatSummary) => void
  onAlert?:         (message: string) => void
}

export interface HeartbeatSummary {
  wakeTime:       number
  signalsFound:   number
  signalsRead:    number
  sirensFound:    number
  sirensResponded:number
  fuelConsumed:   number
  flagged:        number
  nextWakeAt:     number
}

class DaemonHeartbeat {
  private timer:    ReturnType<typeof setInterval> | null = null
  private config:   HeartbeatConfig = {}
  private running:  boolean = false
  private wakeCount: number = 0

  start(config: HeartbeatConfig = {}): void {
    if (this.running) this.stop()
    this.config  = config
    this.running = true

    // Run immediately on start
    this.wake()

    // Then on interval
    this.timer = setInterval(() => this.wake(), config.intervalMs ?? DEFAULT_INTERVAL_MS)
    console.log(`[CONK Daemon] Heartbeat started — interval: ${(config.intervalMs ?? DEFAULT_INTERVAL_MS) / 60000}min`)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.running = false
    console.log('[CONK Daemon] Heartbeat stopped')
  }

  isRunning(): boolean { return this.running }

  private async wake(): Promise<void> {
    this.wakeCount++
    const wakeTime = Date.now()
    const store    = useStore.getState()
    const vessel   = store.vessel
    const policy   = this.config.policy ?? DEFAULT_POLICY

    if (!vessel || vessel.fuel < 0.1) {
      // Push low fuel alert to inbox
      inbox.push({
        type:     'alert',
        trust:    'system',
        content:  vessel ? 'fuel_low: vessel fuel below threshold' : 'no_active_vessel',
        metadata: { fuel: vessel?.fuel ?? 0 },
      })
      this.config.onAlert?.('Daemon sleeping — no vessel or insufficient fuel')
      return
    }

    const summary: HeartbeatSummary = {
      wakeTime,
      signalsFound:    0,
      signalsRead:     0,
      sirensFound:     0,
      sirensResponded: 0,
      fuelConsumed:    0,
      flagged:         0,
      nextWakeAt:      wakeTime + (this.config.intervalMs ?? DEFAULT_INTERVAL_MS),
    }

    // Push heartbeat to inbox
    inbox.push({
      type:     'heartbeat',
      trust:    'system',
      content:  `heartbeat:${this.wakeCount}`,
      metadata: { wakeTime, vesselId: vessel.id, fuel: vessel.fuel },
    })

    // Scan Drift for matching signals
    const keywords  = this.config.keywords ?? []
    const driftCasts = store.driftCasts.filter(c =>
      !c.burned &&
      !(c.burnedBy ?? []).includes(vessel.id) &&
      !c.body && // not yet read
      (!c.unlocksAt || c.unlocksAt <= Date.now()) &&
      (keywords.length === 0 || keywords.some(kw =>
        c.hook.toLowerCase().includes(kw.toLowerCase()) ||
        (c.keywords ?? []).some(k => k.toLowerCase().includes(kw.toLowerCase()))
      ))
    )

    summary.signalsFound = driftCasts.length

    // Classify each signal through gateway
    for (const cast of driftCasts.slice(0, 10)) { // max 10 per wake
      const msg = classify({
        content:       cast.hook,
        source:        cast.vesselId ?? 'network',
        ownerVesselId: vessel.id,
        policy,
      })

      if (!msg.allowed) {
        summary.flagged++
        inbox.push({
          type:     'alert',
          trust:    'system',
          content:  `flagged_signal: ${cast.id}`,
          metadata: { castId: cast.id, flags: msg.flags, risk: msg.risk },
        })
        continue
      }

      // Push to inbox as signal
      inbox.push({
        type:     'signal',
        trust:    msg.trust,
        content:  cast.hook,
        metadata: { castId: cast.id, mode: cast.mode, tideCount: cast.tideCount },
      })

      // Auto-read if configured and rate limit allows
      if (this.config.autoRead && vessel.fuel >= 0.1) {
        const rl = checkRateLimit(vessel.id, 'read', policy)
        if (rl.allowed) {
          store.markCastRead(cast.id, '')
          store.debitVessel(0.1)
          recordAction(vessel.id, 'read')
          summary.signalsRead++
          summary.fuelConsumed += 0.1
        }
      }
    }

    // Scan Sirens
    const sirens = store.sirens.filter(s =>
      s.expiresAt > Date.now() &&
      (keywords.length === 0 || keywords.some(kw =>
        s.hook.toLowerCase().includes(kw.toLowerCase())
      ))
    )

    summary.sirensFound = sirens.length

    for (const siren of sirens.slice(0, 3)) {
      const msg = classify({
        content:       siren.hook,
        source:        siren.vesselId ?? 'network',
        ownerVesselId: vessel.id,
        policy,
      })

      if (!msg.allowed) { summary.flagged++; continue }

      inbox.push({
        type:     'siren',
        trust:    msg.trust,
        content:  siren.hook,
        metadata: { sirenId: siren.id, dockId: siren.dockId, responseCount: siren.responseCount },
      })
    }

    this.config.onWake?.(summary)
    console.log(`[CONK Daemon] Wake #${this.wakeCount} — signals: ${summary.signalsFound} read: ${summary.signalsRead} fuel: $${(summary.fuelConsumed/100).toFixed(3)}`)
  }

  getStatus() {
    return {
      running:   this.running,
      wakeCount: this.wakeCount,
      nextWakeAt: this.timer ? Date.now() + (this.config.intervalMs ?? DEFAULT_INTERVAL_MS) : null,
      config:    this.config,
    }
  }
}

export const heartbeat = new DaemonHeartbeat()
