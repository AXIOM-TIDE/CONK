import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { castDurationMs } from '../utils/scrubber'

export type VesselTier   = 'ghost' | 'shadow' | 'open'
export type CastMode     = 'open' | 'eyes_only' | 'burn' | 'sealed'
export type CastDuration = '24h' | '48h' | '72h' | '7d'

export interface Vessel {
  id: string
  tier: VesselTier
  tempOrPerm: 'temp' | 'perm'
  createdAt: number
  lastCastAt: number | null
  expiresAt: number
  fuel: number
  fuelDrawing: boolean
  autoBurn: boolean
}

export interface Harbor {
  balance: number
  tier: number
  lastMovement: number
  expiresAt: number
}

export interface Cast {
  id: string
  hook: string
  body?: string
  mode: CastMode
  duration: CastDuration
  expiresAt: number
  createdAt: number
  lastInteractionAt: number
  tideCount: number
  tideReads: number[]
  burned?: boolean
  burnedBy?: string[]
  storedBy?: string[]
  vesselTier?: VesselTier
  vesselId?: string
  requiresDockId?: string
  securityQuestion?: string
  securityAnswer?: string
  keywords?: string[]
  unlocksAt?: number
}

export interface Siren {
  id: string
  vesselId?: string
  hook: string
  dockId: string
  createdAt: number
  lastInteractionAt: number
  expiresAt: number
  responseCount: number
  isDark: boolean
  vesselTier?: VesselTier
}

export interface Lighthouse {
  id: string
  hook: string
  body: string
  tideCount: number
  createdAt: number
  expiresAt: number
  isGenesis?: boolean
}

export interface ChartEntry {
  type: 'cast' | 'lighthouse'
  id: string
  name: string
  visitedAt: number
}

export interface AppState {
  isOnboarded:    boolean
  vessel:         Vessel | null
  vessels:        Vessel[]
  activeVesselId: string | null
  harbor:         Harbor | null
  driftCasts:     Cast[]
  driftFilter:    'all' | CastMode
  driftSearch:    string
  sirens:         Siren[]
  lighthouses:    Lighthouse[]
  chart:          ChartEntry[]

  setOnboarded:    (v: boolean) => void
  setVessel:       (v: Vessel | null) => void
  addVessel:       (v: Vessel) => void
  setActiveVessel: (id: string) => void
  burnVessel:      (id: string) => void
  toggleAutoBurn:  () => void
  setHarbor:       (h: Harbor | null) => void
  debitHarbor:     (cents: number) => void
  debitVessel:     (cents: number) => void
  fuelVessel:      (cents: number) => void
  toggleDrawFuel:  () => void
  addCast:         (c: Cast) => void
  markCastRead:    (id: string, body: string) => void
  burnCast:        (id: string) => void
  burnFromVessel:  (id: string, vesselId: string) => void
  storeForVessel:  (id: string, vesselId: string) => void
  incrementTide:   (id: string) => void
  setDriftFilter:  (f: 'all' | CastMode) => void
  setDriftSearch:  (q: string) => void
  addSiren:        (s: Siren) => void
  respondToSiren:  (id: string) => void
  visitLighthouse: (id: string) => void
  addChartEntry:   (e: ChartEntry) => void
}

const NOW = Date.now()
const T   = (h: number) => NOW - h * 3600000

// Bodies stored separately — only revealed after paywall unlock
// Not present on cast objects until markCastRead is called
const SEED_BODIES: Record<string, string> = {
  'seed_001': 'Every message you have ever sent has a return address. Your IP. Your account. Your device fingerprint.\n\nWe built this so that none of that exists. Not encrypted. Not hidden. Simply never built.',
  'seed_002': 'Agent A sourced leads. Agent B wrote outreach. Agent C handled replies. Three vessels, one Harbor, zero cross-contamination.\n\nThis is what agentic infrastructure looks like when privacy is the default.',
  'seed_003': 'Three casts crossed 100k reads in under 6 hours. None were news. None were political. All three were personal truths told anonymously.\n\nThe tide does not reward outrage. It rewards honesty.',
  'seed_004': 'You found it. The Dock is open. You know what to do.',
  'seed_005': 'It sits between your Vessel and your Cast. Your vessel draws fuel from the Harbor and hands it to the Relay.\n\nThe Relay issues a receipt: fee amount, vessel tier, timestamp.\n\nNot: which Harbor. Not: which vessel. Not: which cast.\n\nThe Harbor never sees a cast. This is not encryption. The link is never made.',
  'seed_006': 'Legal entity: formed. Bank account: opened. Contracts: signed. None of them know my name.\n\nPrivacy is not paranoia. It is infrastructure.',
  'seed_007': 'One read. One cast. One truth you chose to hear.\n\nNot a subscription. Not a lock-in. The Harbor decreases. The Abyss absorbs. The content flows.\n\nThat is the entire economy.',
  'seed_008': 'You read it. It is already beginning to dissolve. Gone when you close this.',
  'seed_009': 'Every action in this protocol costs something. That is not a bug.\n\nFree signals are noise. Paid signals are truth.\n\nThe cost is not the barrier. The cost is the filter.',
  'seed_010': 'You found it early. The tide rewards patience.',
}

// Seed casts — NO body field. Body is only set after markCastRead (paywall unlock).
const SEED_CASTS: Cast[] = [
  { id:'seed_001', hook:'The protocol cannot tell if you are human or agent. That is not a bug.',
    mode:'open', duration:'7d', createdAt:T(0.8), lastInteractionAt:T(0.5),
    expiresAt:NOW+castDurationMs('7d'), tideCount:14830, tideReads:[14830,0,0],
    keywords:['privacy','protocol','identity'] },
  { id:'seed_002', hook:'I deployed three AI agents yesterday. None of them know each other exist.',
    mode:'open', duration:'48h', createdAt:T(1.9), lastInteractionAt:T(1.0),
    expiresAt:NOW+castDurationMs('48h'), tideCount:6204, tideReads:[6204,0,0],
    keywords:['agents','infrastructure','agentic'] },
  { id:'seed_003', hook:'Lighthouse candidates this week — the tide is moving fast',
    mode:'open', duration:'72h', createdAt:T(3), lastInteractionAt:T(1),
    expiresAt:NOW+castDurationMs('72h'), tideCount:89421, tideReads:[40000,30000,19421],
    keywords:['lighthouse','tide','signal'] },
  { id:'seed_004', hook:'This cast is for those who know the map.',
    mode:'eyes_only', duration:'24h', createdAt:T(0.1), lastInteractionAt:T(0.1),
    expiresAt:NOW+castDurationMs('24h'), tideCount:12, tideReads:[12,0,0],
    requiresDockId:'dock_alpha' },
  { id:'seed_005', hook:'The Relay is the most important piece nobody talks about.',
    mode:'open', duration:'72h', createdAt:T(5), lastInteractionAt:T(2),
    expiresAt:NOW+castDurationMs('72h'), tideCount:22890, tideReads:[22890,0,0],
    keywords:['relay','privacy','architecture'] },
  { id:'seed_006', hook:'Built an entire company using only anonymous vessels. Ask me anything.',
    mode:'open', duration:'7d', createdAt:T(18), lastInteractionAt:T(6),
    expiresAt:NOW+castDurationMs('7d'), tideCount:41007, tideReads:[20000,15000,6007],
    keywords:['company','anonymous','infrastructure'] },
  { id:'seed_007', hook:'What does $0.001 actually buy you?',
    mode:'open', duration:'48h', createdAt:T(2), lastInteractionAt:T(0.5),
    expiresAt:NOW+castDurationMs('48h'), tideCount:5611, tideReads:[5611,0,0],
    keywords:['economy','cost','protocol'] },
  { id:'seed_008', hook:'This cast exists once. Then the tide takes it.',
    mode:'burn', duration:'24h', createdAt:T(0.1), lastInteractionAt:T(0.1),
    expiresAt:NOW+castDurationMs('24h'), tideCount:3, tideReads:[3,0,0] },
  { id:'seed_009', hook:'Signal requires payment. This is not negotiable.',
    mode:'open', duration:'48h', createdAt:T(0.5), lastInteractionAt:T(0.5),
    expiresAt:NOW+castDurationMs('48h'), tideCount:1203, tideReads:[1203,0,0],
    securityQuestion:'What does $0.001 buy?', securityAnswer:'a read',
    keywords:['payment','signal','protocol'] },
  { id:'seed_010', hook:'This signal unlocks at midnight.',
    mode:'open', duration:'48h', createdAt:T(0.2), lastInteractionAt:T(0.2),
    expiresAt:NOW+castDurationMs('48h'), tideCount:0, tideReads:[0,0,0],
    unlocksAt: NOW + 6*3600000,
    keywords:['future','scheduled'] },
]

const SEED_SIRENS: Siren[] = [
  { id:'siren_001', hook:'Builders working on agentic infrastructure — enter the Dock. No names. No resumes.', dockId:'dock_builders', createdAt:T(6), lastInteractionAt:T(1), expiresAt:NOW+1000*60*60*24*24, responseCount:31, isDark:false, vesselTier:'ghost' },
  { id:'siren_002', hook:'Anyone else building on Sui? Looking for other vessels in this space.', dockId:'dock_sui', createdAt:T(2), lastInteractionAt:T(0.5), expiresAt:NOW+1000*60*60*24*28, responseCount:7, isDark:false, vesselTier:'shadow' },
  { id:'siren_003', hook:'Signal only. If you know you know.', dockId:'dock_dark_001', createdAt:T(48), lastInteractionAt:T(48), expiresAt:NOW-1000*60*60*12, responseCount:4, isDark:true, vesselTier:'ghost' },
]

const GENESIS_BODY = `This is the first Lighthouse.

It was not earned by outrage. It was not bought. It was not promoted.

It exists because the tide decided it should exist permanently.

The protocol is simple: cast a truth. If enough vessels read it within 24 hours, it becomes permanent. The Abyss absorbs the fees. The content lives for 100 years.

We built this because every other protocol has a backdoor. An admin key. A killswitch. A terms of service that can be updated.

CONK has none of these. The Harbor never sees your casts. The Relay issues receipts without identity. The Vessel is mortal by design. The Cast is what survives.

Three Laws:
I. Casts never reach the Harbor. Ever.
II. The Harbor knows only that balance decreased.
III. Vessel to Relay to Cast. The Harbor sees none of it.

This is not encryption. This is architecture.

The link between who paid and what was said does not exist in this protocol. Not because we hide it. Because we never built it.

Welcome to the tide.

— Genesis`

const SEED_LIGHTHOUSES: Lighthouse[] = [
  { id:'genesis', hook:'The first Lighthouse. The protocol explained by itself.', body:GENESIS_BODY, tideCount:1_000_000, createdAt:T(24*7), expiresAt:NOW+(100*365*24*60*60*1000), isGenesis:true },
]

function syncVessel(vessel: Vessel | null, vessels: Vessel[]): Vessel[] {
  if (!vessel) return vessels
  return vessels.find(v => v.id === vessel.id)
    ? vessels.map(v => v.id === vessel.id ? vessel : v)
    : [...vessels, vessel]
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded:    false,
      vessel:         null,
      vessels:        [],
      activeVesselId: null,
      harbor:         null,
      driftCasts:     SEED_CASTS,
      driftFilter:    'all',
      driftSearch:    '',
      sirens:         SEED_SIRENS,
      lighthouses:    SEED_LIGHTHOUSES,
      chart:          [],

      setOnboarded: (v) => set({ isOnboarded: v }),

      setVessel: (v) => set((s) => ({
        vessel: v,
        vessels: v ? syncVessel(v, s.vessels) : s.vessels,
      })),

      addVessel: (v) => set((s) => ({
        vessel: v,
        vessels: [...s.vessels.filter(x => x.id !== v.id), v],
        activeVesselId: v.id,
      })),

      setActiveVessel: (id) => set((s) => ({
        activeVesselId: id,
        vessel: s.vessels.find(v => v.id === id) ?? null,
      })),

      burnVessel: (id) => set((s) => {
        const rem = s.vessels.filter(v => v.id !== id)
        return { vessels: rem, vessel: rem[0] ?? null, activeVesselId: rem[0]?.id ?? null }
      }),

      toggleAutoBurn: () => set((s) => {
        const updated = s.vessel ? { ...s.vessel, autoBurn: !s.vessel.autoBurn } : null
        return { vessel: updated, vessels: updated ? syncVessel(updated, s.vessels) : s.vessels }
      }),

      setHarbor: (h) => set({ harbor: h }),

      debitHarbor: (cents) => set((s) => ({
        harbor: s.harbor ? { ...s.harbor, balance: Math.max(0, s.harbor.balance - cents) } : null,
      })),

      debitVessel: (cents) => set((s) => {
        const updated = s.vessel ? { ...s.vessel, fuel: Math.max(0, s.vessel.fuel - cents) } : null
        return { vessel: updated, vessels: updated ? syncVessel(updated, s.vessels) : s.vessels }
      }),

      fuelVessel: (cents) => set((s) => {
        const updated = s.vessel ? { ...s.vessel, fuel: s.vessel.fuel + cents } : null
        return {
          vessel: updated,
          vessels: updated ? syncVessel(updated, s.vessels) : s.vessels,
          harbor: s.harbor ? { ...s.harbor, balance: Math.max(0, s.harbor.balance - cents) } : null,
        }
      }),

      toggleDrawFuel: () => set((s) => {
        const updated = s.vessel ? { ...s.vessel, fuelDrawing: !s.vessel.fuelDrawing } : null
        return { vessel: updated, vessels: updated ? syncVessel(updated, s.vessels) : s.vessels }
      }),

      addCast: (c) => set((s) => ({ driftCasts: [c, ...s.driftCasts] })),

      // markCastRead: sets body from SEED_BODIES fallback or provided body
      // This is the ONLY place body gets set — paywall must complete first
      markCastRead: (id, body) => set((s) => ({
        driftCasts: s.driftCasts.map(c => c.id === id ? {
          ...c,
          body: body || SEED_BODIES[id] || c.hook,
          tideCount: c.tideCount + 1,
          lastInteractionAt: Date.now(),
          expiresAt: Date.now() + castDurationMs(c.duration),
          tideReads: [( c.tideReads[0] ?? 0) + 1, c.tideReads[1] ?? 0, c.tideReads[2] ?? 0],
        } : c),
      })),

      burnCast: (id) => set((s) => ({
        driftCasts: s.driftCasts.map(c => c.id === id ? { ...c, burned: true } : c),
      })),

      burnFromVessel: (id, vesselId) => set((s) => ({
        driftCasts: s.driftCasts.map(c => c.id === id
          ? { ...c, burnedBy: [...(c.burnedBy ?? []), vesselId] }
          : c),
      })),

      storeForVessel: (id, vesselId) => set((s) => ({
        driftCasts: s.driftCasts.map(c => c.id === id
          ? { ...c, storedBy: [...(c.storedBy ?? []), vesselId] }
          : c),
      })),

      incrementTide: (id) => set((s) => ({
        driftCasts: s.driftCasts.map(c => c.id === id ? { ...c, tideCount: c.tideCount + 1 } : c),
      })),

      setDriftFilter: (f) => set({ driftFilter: f }),
      setDriftSearch: (q) => set({ driftSearch: q }),

      addSiren: (s) => set((st) => ({ sirens: [s, ...st.sirens] })),

      respondToSiren: (id) => set((s) => ({
        sirens: s.sirens.map(sr => sr.id === id
          ? { ...sr, responseCount: sr.responseCount + 1, lastInteractionAt: Date.now() }
          : sr),
      })),

      visitLighthouse: (id) => set((s) => ({
        lighthouses: s.lighthouses.map(l => l.id === id ? { ...l, tideCount: l.tideCount + 1 } : l),
      })),

      addChartEntry: (e) => set((s) => ({
        chart: [e, ...s.chart.filter(x => x.id !== e.id)],
      })),
    }),
    {
      name: 'conk-v5',
      partialize: (s) => ({
        isOnboarded: s.isOnboarded,
        vessel: s.vessel,
        vessels: s.vessels,
        activeVesselId: s.activeVesselId,
        harbor: s.harbor,
        chart: s.chart,
        // Persist cast interaction state so burns/stores survive reload
        driftCasts: s.driftCasts.map(c => ({
          ...c,
          body: undefined,        // never persist decrypted body
          burnedBy: c.burnedBy,
          storedBy: c.storedBy,
          burned: c.burned,
        })),
      }),
    }
  )
)
