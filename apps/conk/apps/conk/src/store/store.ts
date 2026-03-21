/**
 * CONK — Global Store
 * Zustand state management for the CONK app.
 * Protocol calls (Sui) will replace mock data in STEP 6.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { castDurationMs } from '../utils/scrubber'

// ─── TYPES ───────────────────────────────────────────────────

export type VesselTier   = 'ghost' | 'shadow' | 'open'
export type CastMode     = 'open' | 'sealed' | 'eyes_only' | 'ghost'
export type CastDuration = '24h' | '48h' | '72h' | '7d'
export type AppTab       = 'drift' | 'dock' | 'harbor' | 'siren'

export interface Vessel {
  id: string
  tier: VesselTier
  tempOrPerm: 'temp' | 'perm'
  createdAt: number
  lastCastAt: number | null
  expiresAt: number
}

export interface Harbor {
  balance: number          // USDC cents (100 = $1.00)
  tier: 1 | 5 | 10 | 20   // vessel slots
  lastMovement: number
  expiresAt: number
}

export interface Cast {
  id: string
  hook: string             // always free to see
  body?: string            // $0.001 to read
  mode: CastMode
  duration: CastDuration
  expiresAt: number
  createdAt: number
  tideCount: number
  burned?: boolean
  vesselTier?: VesselTier
  mediaUrl?: string
  mediaType?: 'image' | 'video'
}

export interface Siren {
  id: string
  hook: string             // broadcast hook — free to see
  dockId: string           // the Dock all responses enter
  createdAt: number
  expiresAt: number        // 30 days from last response
  responseCount: number
  isDark: boolean          // goes dark when Dock crumbles
  vesselTier?: VesselTier
}

export interface Lighthouse {
  id: string
  castId?: string
  content: string
  hook: string
  earnedAt: number
  visitCount: number
  clockExpiresAt: number   // 100-year clock, reset on visit
  isGenesis: boolean
  killable: boolean
}

export interface ChartEntry {
  type: 'lighthouse' | 'dock'
  id: string
  name: string
  visitedAt: number
}

export interface AppState {
  isOnboarded: boolean
  vessel: Vessel | null
  harbor: Harbor | null
  driftCasts: Cast[]
  driftFilter: 'all' | CastMode
  sirens: Siren[]
  chart: ChartEntry[]
  lighthouses: Lighthouse[]
  activeTab: AppTab

  setOnboarded:    (v: boolean) => void
  setVessel:       (v: Vessel | null) => void
  setHarbor:       (h: Harbor | null) => void
  setDriftCasts:   (casts: Cast[]) => void
  addCast:         (cast: Cast) => void
  markCastRead:    (id: string, body: string) => void
  burnCast:        (id: string) => void
  setDriftFilter:  (f: 'all' | CastMode) => void
  setActiveTab:    (t: AppTab) => void
  incrementTide:   (id: string) => void
  debitHarbor:     (cents: number) => void
  addSiren:        (s: Siren) => void
  respondToSiren:  (sirenId: string) => void
  addChartEntry:   (e: ChartEntry) => void
  visitLighthouse: (id: string) => void
}

// ─── SEED DATA ───────────────────────────────────────────────

const NOW = Date.now()
const YR  = 365 * 24 * 60 * 60 * 1000

const SEED_CASTS: Cast[] = [
  {
    id: 'seed_001',
    hook: 'The protocol cannot tell if you are human or agent. That is not a bug.',
    body: 'Every message you have ever sent has a return address. Your IP. Your account. Your device fingerprint. Your pattern of speech analyzed across 10,000 prior messages.\n\nWe built this so that none of that exists. Not encrypted. Not hidden. Simply never built. The link between who you are and what you said does not exist in this protocol. Because we never made it.',
    mode: 'open',
    duration: '7d',
    createdAt: NOW - 1000 * 60 * 47,
    expiresAt: NOW + castDurationMs('7d'),
    tideCount: 14830,
    vesselTier: 'ghost',
  },
  {
    id: 'seed_002',
    hook: 'I deployed three AI agents yesterday. None of them know each other exist.',
    body: 'Agent A sourced the leads. Agent B wrote the outreach. Agent C handled replies. All three had separate Vessels on the same Harbor. Zero cross-contamination. Zero attribution.\n\nThis is what agentic infrastructure looks like when privacy is the default.',
    mode: 'open',
    duration: '48h',
    createdAt: NOW - 1000 * 60 * 112,
    expiresAt: NOW + castDurationMs('48h'),
    tideCount: 6204,
    vesselTier: 'shadow',
  },
  {
    id: 'seed_003',
    hook: 'Lighthouse candidates this week — the tide is moving fast',
    body: 'Three casts crossed 100k reads in under 6 hours this week. None of them were news. None of them were political. All three were personal truths told anonymously.\n\nThe tide does not reward outrage. It rewards honesty.\n\nPath to Lighthouse: 1,000,000 reads in 24 hours. We are watching three vessels approach it.',
    mode: 'open',
    duration: '72h',
    createdAt: NOW - 1000 * 60 * 60 * 3,
    expiresAt: NOW + castDurationMs('72h'),
    tideCount: 89421,
    vesselTier: 'open',
  },
  {
    id: 'seed_004',
    hook: '👁 This cast burns on read.',
    body: 'You are the only one who will ever see this. The moment you read it, it is gone. No copy. No archive. This is Eyes Only. One vessel. One read. Then nothing.',
    mode: 'eyes_only',
    duration: '24h',
    createdAt: NOW - 1000 * 60 * 8,
    expiresAt: NOW + castDurationMs('24h'),
    tideCount: 1,
    vesselTier: 'ghost',
  },
  {
    id: 'seed_005',
    hook: '⚡ Ghost cast — reads once, gone from the protocol forever.',
    body: 'This entire cast disappears after the first read. Not just for you. For everyone. The Abyss receives it. The protocol forgets it.',
    mode: 'ghost',
    duration: '24h',
    createdAt: NOW - 1000 * 60 * 3,
    expiresAt: NOW + castDurationMs('24h'),
    tideCount: 0,
    vesselTier: 'ghost',
  },
  {
    id: 'seed_006',
    hook: 'The Relay is the most important piece of the protocol and nobody talks about it.',
    body: 'The Relay sits between your Harbor and your Cast. It draws fuel from the Harbor and passes a receipt to the Cast layer.\n\nThe receipt says: fee amount. Vessel tier. Timestamp.\n\nThe receipt does not say: which Harbor. Which vessel. Which cast.\n\nThis is not encryption. The link is never made. That is the entire point.',
    mode: 'open',
    duration: '72h',
    createdAt: NOW - 1000 * 60 * 60 * 5,
    expiresAt: NOW + castDurationMs('72h'),
    tideCount: 22890,
    vesselTier: 'ghost',
  },
  {
    id: 'seed_007',
    hook: 'Built an entire company using only anonymous vessels. Ask me anything.',
    body: 'Legal entity: formed. Bank account: opened. Contracts: signed. Employees: hired. Investors: pitched. None of them know my name. Each interaction was a different Vessel. Each Vessel pointed to a different Dock.\n\nPrivacy is not paranoia. It is infrastructure.',
    mode: 'open',
    duration: '7d',
    createdAt: NOW - 1000 * 60 * 60 * 18,
    expiresAt: NOW + castDurationMs('7d'),
    tideCount: 41007,
    vesselTier: 'shadow',
  },
  {
    id: 'seed_008',
    hook: 'What does $0.001 actually buy you?',
    body: 'One read. One cast. One truth you chose to hear.\n\nNot a subscription. Not a lock-in. Not a monthly fee harvesting your attention. You pay a fraction of a cent and the protocol responds. The Harbor decreases. The Abyss absorbs. The content flows.\n\nThat is the entire economy. Nothing else.',
    mode: 'open',
    duration: '48h',
    createdAt: NOW - 1000 * 60 * 60 * 2,
    expiresAt: NOW + castDurationMs('48h'),
    tideCount: 5611,
    vesselTier: 'shadow',
  },
]

const SEED_SIRENS: Siren[] = [
  {
    id: 'siren_001',
    hook: 'Builders working on agentic infrastructure — enter the Dock. No names. No résumés.',
    dockId: 'dock_builders',
    createdAt: NOW - 1000 * 60 * 60 * 6,
    expiresAt: NOW + 1000 * 60 * 60 * 24 * 24,
    responseCount: 31,
    isDark: false,
    vesselTier: 'ghost',
  },
  {
    id: 'siren_002',
    hook: 'Has anyone else been watching cast seed_003? 89k reads in 3 hours. Something is happening.',
    dockId: 'dock_watchers',
    createdAt: NOW - 1000 * 60 * 30,
    expiresAt: NOW + 1000 * 60 * 60 * 24 * 29,
    responseCount: 7,
    isDark: false,
    vesselTier: 'shadow',
  },
  {
    id: 'siren_003',
    hook: 'Architects, cryptographers, privacy researchers — one Dock, open for 30 days.',
    dockId: 'dock_research',
    createdAt: NOW - 1000 * 60 * 60 * 48,
    expiresAt: NOW + 1000 * 60 * 60 * 24 * 12,
    responseCount: 89,
    isDark: false,
    vesselTier: 'ghost',
  },
  {
    id: 'siren_004',
    hook: 'This Dock has crumbled. The void received everything.',
    dockId: 'dock_dead',
    createdAt: NOW - 1000 * 60 * 60 * 24 * 35,
    expiresAt: NOW - 1000 * 60 * 60 * 24 * 5,
    responseCount: 204,
    isDark: true,
    vesselTier: 'open',
  },
]

const GENESIS_LIGHTHOUSE: Lighthouse = {
  id: 'lighthouse_genesis',
  content: `This is the Genesis Lighthouse.

It was placed here on April 8, 2026 by the founder of the Axiom Tide Protocol.

It cannot be killed.
It cannot be purchased.
It cannot be owned.

It costs nothing to read. No vessel. No payment. No Harbor.

---

I built this because I watched the internet forget what it was supposed to be.

It was supposed to be a place where anyone could speak. Where geography and wealth and name meant nothing. Where a person in a village and a person in a tower had the same voice.

Instead we built systems that harvest identity as a product. That sell attention as inventory. That remember everything and forget nothing. That connect who you are to everything you ever said, and sell that connection to whoever will pay for it.

The Axiom Tide Protocol is a correction.

Not a startup. Not a platform. A protocol.

Seven primitives. Three laws. One mission.

The Harbor never sees a cast. The link between who paid and what was said does not exist in this protocol. Not because we encrypt it. Because we never built it.

Human or agent — the protocol cannot tell. Neither can anyone else. That is not a flaw. That is the design.

Truth earns permanence here. The tide decides. One million reads and a cast becomes a Lighthouse. Not because someone paid. Because the network chose.

Everything else crumbles back to the ocean.

This Lighthouse will outlast every server, every company, every government that tries to tell you that privacy is a privilege and not a right.

It runs for 100 years. Every visit resets the clock.

Welcome to the tide.`,
  hook: 'The Genesis Lighthouse — the first truth placed in the protocol. Free forever.',
  earnedAt: new Date('2026-04-08').getTime(),
  visitCount: 0,
  clockExpiresAt: new Date('2126-04-08').getTime(),
  isGenesis: true,
  killable: false,
}

// ─── STORE ───────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      vessel:      null,
      harbor:      null,
      driftCasts:  SEED_CASTS,
      driftFilter: 'all',
      sirens:      SEED_SIRENS,
      chart:       [],
      lighthouses: [GENESIS_LIGHTHOUSE],
      activeTab:   'drift',

      setOnboarded:  (v) => set({ isOnboarded: v }),
      setVessel:     (v) => set({ vessel: v }),
      setHarbor:     (h) => set({ harbor: h }),
      setDriftCasts: (casts) => set({ driftCasts: casts }),

      addCast: (cast) =>
        set((s) => ({ driftCasts: [cast, ...s.driftCasts] })),

      markCastRead: (id, body) =>
        set((s) => ({
          driftCasts: s.driftCasts.map((c) =>
            c.id === id ? { ...c, body, tideCount: c.tideCount + 1 } : c
          ),
        })),

      burnCast: (id) =>
        set((s) => ({
          driftCasts: s.driftCasts.map((c) =>
            c.id === id ? { ...c, burned: true, body: undefined } : c
          ),
        })),

      setDriftFilter: (f) => set({ driftFilter: f }),
      setActiveTab:   (t) => set({ activeTab: t }),

      incrementTide: (id) =>
        set((s) => ({
          driftCasts: s.driftCasts.map((c) =>
            c.id === id ? { ...c, tideCount: c.tideCount + 1 } : c
          ),
        })),

      debitHarbor: (cents) =>
        set((s) => ({
          harbor: s.harbor
            ? { ...s.harbor, balance: Math.max(0, s.harbor.balance - cents), lastMovement: Date.now() }
            : null,
        })),

      addSiren: (siren) =>
        set((s) => ({ sirens: [siren, ...s.sirens] })),

      respondToSiren: (sirenId) =>
        set((s) => ({
          sirens: s.sirens.map((sr) =>
            sr.id === sirenId
              ? { ...sr, responseCount: sr.responseCount + 1, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }
              : sr
          ),
        })),

      addChartEntry: (entry) =>
        set((s) => ({ chart: [entry, ...s.chart.filter((e) => e.id !== entry.id)] })),

      visitLighthouse: (id) =>
        set((s) => ({
          lighthouses: s.lighthouses.map((lh) =>
            lh.id === id
              ? { ...lh, visitCount: lh.visitCount + 1, clockExpiresAt: Date.now() + 100 * YR }
              : lh
          ),
        })),
    }),
    {
      name: 'conk-storage-v2',
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        vessel:      state.vessel,
        harbor:      state.harbor,
        chart:       state.chart,
      }),
    }
  )
)

// ─── SELECTORS ───────────────────────────────────────────────

export const selectFilteredCasts = (state: AppState): Cast[] => {
  if (state.driftFilter === 'all') return state.driftCasts
  return state.driftCasts.filter((c) => c.mode === state.driftFilter)
}
