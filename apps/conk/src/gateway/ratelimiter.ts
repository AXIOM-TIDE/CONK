/**
 * CONK Rate Limiter
 * Velocity limits per vessel per tide.
 * Two-layer spam wall: economic cost + velocity cap.
 */

import type { VelocityRecord, DaemonPolicy } from './types'
import { DEFAULT_POLICY } from './types'

const TIDE_MS = 24 * 60 * 60 * 1000 // 24 hours

// In-memory velocity store — persisted to localStorage in browser
const velocityStore = new Map<string, VelocityRecord>()

function getTideStart(): number {
  const now = Date.now()
  return now - (now % TIDE_MS)
}

function getRecord(vesselId: string): VelocityRecord {
  const tideStart = getTideStart()
  const existing  = velocityStore.get(vesselId)

  // Reset if new tide
  if (!existing || existing.tideStart < tideStart) {
    const fresh: VelocityRecord = {
      vesselId,
      tideStart,
      castCount:   0,
      readCount:   0,
      sirenCount:  0,
      dockCount:   0,
      flagCount:   0,
    }
    velocityStore.set(vesselId, fresh)
    return fresh
  }

  return existing
}

export type RateLimitAction = 'cast' | 'read' | 'siren' | 'dock' | 'flag'

export interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetAt:    number
  reason?:    string
}

export function checkRateLimit(
  vesselId: string,
  action: RateLimitAction,
  policy: DaemonPolicy = DEFAULT_POLICY
): RateLimitResult {
  const record   = getRecord(vesselId)
  const tideStart = getTideStart()
  const resetAt   = tideStart + TIDE_MS

  switch (action) {
    case 'cast': {
      const remaining = policy.maxCastsPerTide - record.castCount
      if (remaining <= 0) return { allowed: false, remaining: 0, resetAt, reason: 'cast_limit_reached' }
      return { allowed: true, remaining: remaining - 1, resetAt }
    }
    case 'read': {
      const remaining = policy.maxReadsPerTide - record.readCount
      if (remaining <= 0) return { allowed: false, remaining: 0, resetAt, reason: 'read_limit_reached' }
      return { allowed: true, remaining: remaining - 1, resetAt }
    }
    case 'siren': {
      const remaining = policy.maxSirenResponsesPerTide - record.sirenCount
      if (remaining <= 0) return { allowed: false, remaining: 0, resetAt, reason: 'siren_limit_reached' }
      return { allowed: true, remaining: remaining - 1, resetAt }
    }
    case 'dock': {
      const remaining = policy.maxDockEntriesPerTide - record.dockCount
      if (remaining <= 0) return { allowed: false, remaining: 0, resetAt, reason: 'dock_limit_reached' }
      return { allowed: true, remaining: remaining - 1, resetAt }
    }
    case 'flag': {
      // Too many flags this tide — vessel is behaving suspiciously
      if (record.flagCount >= 10) return { allowed: false, remaining: 0, resetAt, reason: 'too_many_flags' }
      return { allowed: true, remaining: 10 - record.flagCount, resetAt }
    }
  }
}

export function recordAction(vesselId: string, action: RateLimitAction): void {
  const record = getRecord(vesselId)
  switch (action) {
    case 'cast':  record.castCount++;  break
    case 'read':  record.readCount++;  break
    case 'siren': record.sirenCount++; break
    case 'dock':  record.dockCount++;  break
    case 'flag':  record.flagCount++;  break
  }
  velocityStore.set(vesselId, record)
}

export function getVelocityStatus(vesselId: string, policy: DaemonPolicy = DEFAULT_POLICY) {
  const record = getRecord(vesselId)
  return {
    casts:   { used: record.castCount,  limit: policy.maxCastsPerTide },
    reads:   { used: record.readCount,  limit: policy.maxReadsPerTide },
    sirens:  { used: record.sirenCount, limit: policy.maxSirenResponsesPerTide },
    docks:   { used: record.dockCount,  limit: policy.maxDockEntriesPerTide },
    flags:   { used: record.flagCount,  limit: 10 },
    resetAt: getTideStart() + TIDE_MS,
  }
}
