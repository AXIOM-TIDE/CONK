/**
 * scrubber.ts — Media scrubber and time utilities for CONK
 *
 * Handles:
 *  - Cast expiry countdown formatting
 *  - Tide count formatting
 *  - Video scrubber state helpers
 *  - Duration picker options
 */

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'

dayjs.extend(relativeTime)
dayjs.extend(duration)

// ─── TIME / EXPIRY ────────────────────────────────────────────

export function timeUntilExpiry(expiresAt: number): {
  label: string
  urgent: boolean
  dead: boolean
} {
  const now = Date.now()
  const diff = expiresAt - now

  if (diff <= 0) return { label: 'expired', urgent: true, dead: true }

  const hours = diff / 3_600_000
  const minutes = diff / 60_000

  if (minutes < 60) {
    return { label: `${Math.floor(minutes)}m`, urgent: true, dead: false }
  }
  if (hours < 24) {
    return { label: `${Math.floor(hours)}h`, urgent: hours < 6, dead: false }
  }
  const days = Math.floor(hours / 24)
  return { label: `${days}d`, urgent: false, dead: false }
}

export function formatTimeAgo(ts: number): string {
  return dayjs(ts).fromNow(true)
}

export function castDurationMs(d: '24h' | '48h' | '72h' | '7d'): number {
  const map: Record<string, number> = {
    '24h': 86_400_000,
    '48h': 172_800_000,
    '72h': 259_200_000,
    '7d':  604_800_000,
  }
  return map[d] ?? 86_400_000
}

// ─── TIDE COUNT FORMATTING ────────────────────────────────────

export function formatTide(n: number): string {
  if (n < 1_000)     return String(n)
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`
  return `${(n / 1_000_000).toFixed(2)}M`
}

// Lighthouse thresholds
export const LIGHTHOUSE_INSTANT = 1_000_000   // 1M reads in 24h
export const LIGHTHOUSE_EARNED  = 500_000      // 500K reads × 3 tides

export function lighthouseProgress(tideCount: number, path: 'instant' | 'earned'): number {
  const target = path === 'instant' ? LIGHTHOUSE_INSTANT : LIGHTHOUSE_EARNED
  return Math.min(1, tideCount / target)
}

// ─── DURATION PICKER OPTIONS ──────────────────────────────────

export const DURATION_OPTIONS: Array<{
  value: '24h' | '48h' | '72h' | '7d'
  label: string
  cost: string
}> = [
  { value: '24h', label: '24h',    cost: '$0.001' },
  { value: '48h', label: '48h',    cost: '$0.001' },
  { value: '72h', label: '72h',    cost: '$0.001' },
  { value: '7d',  label: '7 days', cost: '$0.001' },
]

// ─── VIDEO SCRUBBER ───────────────────────────────────────────

export interface ScrubberState {
  currentTime: number
  duration: number
  playing: boolean
  progress: number  // 0–1
}

export function createScrubberState(): ScrubberState {
  return { currentTime: 0, duration: 0, playing: false, progress: 0 }
}

export function updateScrubber(
  state: ScrubberState,
  currentTime: number
): ScrubberState {
  const progress = state.duration > 0 ? currentTime / state.duration : 0
  return { ...state, currentTime, progress }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── MOCK CAST GENERATOR (for dev — remove in STEP 6) ─────────

import type { Cast } from '../store/store'

const MOCK_HOOKS = [
  'The protocol cannot tell if you are human or machine.',
  'Three laws. Seven primitives. One mission.',
  'Truth earns permanence. Everything else crumbles.',
  'The Harbor knows only that balance decreased.',
  'Something is happening in the deep.',
  'A vessel surfaced and then sank.',
  'The connection was never built.',
  'Vessels cast into the tide. The masses decide.',
  'I watched a Lighthouse earn its light.',
  '1,000,000 reads in 24 hours. It happened.',
  'The Abyss receives. Nothing returns.',
  'Sealed. Only for one.',
  'Read this and it burns.',
  'The tide votes with every read.',
  'This cast expires in 24 hours.',
]

export function generateMockCasts(count = 12): Cast[] {
  const modes: Cast['mode'][] = ['open', 'open', 'open', 'sealed', 'eyes_only', 'burn']
  const durations: Cast['duration'][] = ['24h', '48h', '72h', '7d']
  const tiers: Cast['vesselClass'][] = ['vessel', 'vessel', 'vessel', 'daemon']

  return Array.from({ length: count }, (_, i) => {
    const mode = modes[Math.floor(Math.random() * modes.length)]
    const dur  = durations[Math.floor(Math.random() * durations.length)]
    const tide = Math.floor(Math.random() * 50000)
    const created = Date.now() - Math.random() * 86400000 * 2

    return {
      id: `mock_${i}_${Math.random().toString(36).slice(2, 6)}`,
      hook: MOCK_HOOKS[i % MOCK_HOOKS.length],
      body: undefined,
      mode,
      duration: dur,
      expiresAt: created + castDurationMs(dur),
      createdAt: created,
      lastInteractionAt: created,
      tideCount: tide,
      tideReads: [tide, 0, 0],
      vesselClass: tiers[Math.floor(Math.random() * tiers.length)],
    }
  })
}

// ─── TIDE DECAY STATE ─────────────────────────────────────────
// 3 tides = 3 × 24h = 72h total. After that → void.
// Returns which tide the cast is in based on age.

export type TideState = 'active' | 'tide1' | 'tide2' | 'final' | 'void'

export function getTideState(createdAt: number, durationMs: number): TideState {
  const age       = Date.now() - createdAt
  const tideLen   = durationMs
  const elapsed   = age / tideLen

  if (elapsed < 1)   return 'active'
  if (elapsed < 1.5) return 'tide1'
  if (elapsed < 2)   return 'tide2'
  if (elapsed < 3)   return 'final'
  return 'void'
}

export function getTideLabel(state: TideState): string | null {
  switch (state) {
    case 'tide1': return 'tide 1 of 3'
    case 'tide2': return 'tide 2 of 3'
    case 'final': return 'final tide'
    case 'void':  return 'void'
    default:      return null
  }
}
