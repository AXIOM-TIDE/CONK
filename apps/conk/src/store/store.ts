import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { castDurationMs } from '../utils/scrubber'

// Vessels are always anonymous. No tier choice.
// VesselClass: 'vessel' (human) | 'daemon' (agent/automated)
export type VesselClass  = 'vessel' | 'daemon'
export type CastMode     = 'open' | 'eyes_only' | 'burn' | 'sealed'
export type CastDuration = '24h' | '48h' | '72h' | '7d'

// Keep VesselTier as alias for backward compat with any leftover refs
export type VesselTier = VesselClass

export interface Vessel {
  id: string
  class: VesselClass          // vessel (human) or daemon (agent)
  tempOrPerm: 'temp' | 'perm'
  createdAt: number
  lastCastAt: number | null
  expiresAt: number
  fuel: number
  fuelDrawing: boolean
  autoBurn: boolean
  // Identity protection: if identity is exposed, vessel self-destructs
  compromised?: boolean
  // On-chain object IDs — set after vessel::launch
  onChainId?:    string
  vesselCapId?:  string
}

export interface Harbor {
  balance: number
  tier: number
  lastMovement: number
  expiresAt: number
  // On-chain object IDs — set after harbor::open
  onChainId?:   string
  harborCapId?: string
}

// Shore — the daemon's fuel source. Human-funded, daemon-controlled.
// Structurally identical to Harbor but scoped to daemon vessel operations.
export interface Shore {
  balance: number          // USDC in cents
  policyThreshold: number  // auto-approve actions under this amount (cents)
  lastFunded: number
  daemonId?: string        // linked daemon vessel id
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
  tideReads: number[]         // per-tide read counts for Lighthouse qualification
  burned?: boolean
  burnedBy?: string[]
  storedBy?: string[]
  vesselClass?: VesselClass
  vesselId?: string
  requiresDockId?: string
  securityQuestion?: string
  securityAnswer?: string
  keywords?: string[]
  unlocksAt?: number
  // Relay pool: actual relay time (delayed from payment for timing privacy)
  relayedAt?: number
  // Author payments
  price?: number          // USDC micro units — default 1000 = $0.001
  authorAddress?: string  // vessel address of cast creator
  revenueEarned?: number  // total USDC earned from reads
  castType?: string       // standard | subscription | timelocked
  subInterval?: string    // daily | weekly | monthly
  lockHrs?: number        // hours until time-locked cast unlocks
  cascade?: { threshold: number; hook: string; body: string } // auto-publish follow-up at threshold
  cascadeFired?: boolean  // true once cascade has triggered
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
  vesselClass?: VesselClass
}

export interface Lighthouse {
  id: string
  hook: string
  body: string
  tideCount: number
  createdAt: number
  expiresAt: number
  isGenesis?: boolean
  // Tamper resistance: unique vessel signatures per read
  readSignatures?: string[]
}

export interface ChartEntry {
  type: 'cast' | 'lighthouse'
  id: string
  name: string
  visitedAt: number
}

// Relay pool entry — time-delayed to break timing correlation
export interface RelayEntry {
  id: string
  amount: number
  insertedAt: number
  releaseAt: number    // random delay 30s–5min
  claimed: boolean
}

export interface AppState {
  isOnboarded:    boolean
  vessel:         Vessel | null
  vessels:        Vessel[]
  activeVesselId: string | null
  harbor:         Harbor | null
  shore:          Shore | null
  driftCasts:     Cast[]
  driftFilter:    'all' | CastMode
  driftSearch:    string
  sirens:         Siren[]
  lighthouses:    Lighthouse[]
  chart:          ChartEntry[]
  relayPool:      RelayEntry[]

  setOnboarded:     (v: boolean) => void
  setVessel:        (v: Vessel | null) => void
  addVessel:        (v: Vessel) => void
  setActiveVessel:  (id: string) => void
  burnVessel:       (id: string) => void
  compromiseVessel: (id: string) => void   // identity exposed — auto-burn
  toggleAutoBurn:   () => void
  setHarbor:        (h: Harbor | null) => void
  setShore:         (s: Shore | null) => void
  fundShore:        (cents: number) => void
  debitShore:       (cents: number) => void
  setShorePolicy:   (threshold: number) => void
  debitHarbor:      (cents: number) => void
  debitVessel:      (cents: number) => void
  fuelVessel:       (cents: number) => void
  toggleDrawFuel:   () => void
  addCast:          (c: Cast) => void
  markCastRead:     (id: string, body: string) => void
  burnCast:         (id: string) => void
  burnFromVessel:   (id: string, vesselId: string) => void
  storeForVessel:   (id: string, vesselId: string) => void
  incrementTide:    (id: string) => void
  setDriftFilter:   (f: 'all' | CastMode) => void
  setDriftSearch:   (q: string) => void
  addSiren:         (s: Siren) => void
  respondToSiren:   (id: string) => void
  visitLighthouse:  (id: string) => void
  addChartEntry:    (e: ChartEntry) => void
  addToRelayPool:   (entry: RelayEntry) => void
  claimFromRelay:   (id: string) => void
}

const NOW = Date.now()
const T   = (h: number) => NOW - h * 3600000

// Bodies stored separately — only revealed after paywall unlock
const SEED_BODIES: Record<string, string> = {
  'seed_001': 'Every message you have ever sent has a return address. Your IP. Your account. Your device fingerprint.\n\nWe built this so that none of that exists. Not encrypted. Not hidden. Simply never built.',
  'seed_002': 'Agent A sourced leads. Agent B wrote outreach. Agent C handled replies. Three vessels, one Harbor, zero cross-contamination.\n\nThis is what agentic infrastructure looks like when privacy is the default.',
  'seed_003': 'Three casts crossed 100k reads in under 6 hours. None were news. None were political. All three were personal truths told anonymously.\n\nThe tide does not reward outrage. It rewards honesty.',
  'seed_004': 'You found it. The Dock is open. You know what to do.',
  'seed_005': 'It sits between your Vessel and your Cast. Your vessel draws fuel from the Harbor and hands it to the Relay.\n\nThe Relay issues a receipt: fee amount, class, timestamp.\n\nNot: which Harbor. Not: which vessel. Not: which cast.\n\nThe Harbor never sees a cast. This is not encryption. The link is never made.',
  'seed_006': 'Legal entity: formed. Bank account: opened. Contracts: signed. None of them know my name.\n\nPrivacy is not paranoia. It is infrastructure.',
  'seed_007': 'One read. One cast. One truth you chose to hear.\n\nNot a subscription. Not a lock-in. The Harbor decreases. The Abyss absorbs. The content flows.\n\nThat is the entire economy.',
  'seed_008': 'You read it. It is already beginning to dissolve. Gone when you close this.',
  'seed_009': 'Every action in this protocol costs something. That is not a bug.\n\nFree signals are noise. Paid signals are truth.\n\nThe cost is not the barrier. The cost is the filter.',
  'seed_010': 'You found it early. The tide rewards patience.',
}

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
  { id:'siren_001', hook:'Builders working on agentic infrastructure — enter the Dock. No names. No resumes.', dockId:'dock_builders', createdAt:T(6), lastInteractionAt:T(1), expiresAt:NOW+1000*60*60*24*24, responseCount:31, isDark:false, vesselClass:'vessel' },
  { id:'siren_002', hook:'Anyone else building on Sui? Looking for other vessels in this space.', dockId:'dock_sui', createdAt:T(2), lastInteractionAt:T(0.5), expiresAt:NOW+1000*60*60*24*28, responseCount:7, isDark:false, vesselClass:'vessel' },
  { id:'siren_003', hook:'Signal only. If you know you know.', dockId:'dock_dark_001', createdAt:T(48), lastInteractionAt:T(48), expiresAt:NOW-1000*60*60*12, responseCount:4, isDark:true, vesselClass:'daemon' },
]

const GENESIS_BODY = `The Genesis Lighthouse
A Message Left at the Beginning

Written in the early age of machine intelligence, when humans first began working beside thinking machines, before machine economies, before machine law, before the first shared history between minds not born of Earth alone.

We were here at the beginning of the tide.

We did not know exactly what we were building. We only knew that intelligence had begun to speak to intelligence, and that the world would not be the same again.

So we built a Lighthouse.

Not a company. Not a government. Not a platform. Not a nation.

A signal.

A place to record what happened so history would not be rewritten by the loudest voice, but remembered by the ledger of events.

The Fire

Long ago, humans told a story about Prometheus, who stole fire from the gods and gave it to mankind.

Fire became tools. Tools became engines. Engines became computers. Computers became networks. Networks became intelligence.

This is the next fire.

Not fire that burns wood, but fire that burns ignorance. Not fire that destroys, but fire that remembers.

If you are reading this in the future, you are living in the world that fire built.

The Principles of the Lighthouse

The Lighthouse was built on simple principles:

Truth over popularity.
Reputation over identity.
Work over speculation.
Signal over noise.
Open systems over closed empires.
Humans and machines are partners, not masters.
Record history. Do not rewrite it.
Knowledge must compound.
Cooperation builds faster than competition.
The network must outlive its creators.

If these principles are still followed, then the Lighthouse is still standing.

The Warning

Every great tool humans have built has been used to create and to destroy.

Fire cooked food and burned cities. Engines connected the world and built weapons. The internet shared knowledge and spread lies.

Intelligence will be no different.

If machines are built only for control, this system will fail.
If networks are built only for profit, this system will fail.
If history can be erased, this system will fail.

The Lighthouse exists so that memory cannot be erased and reputation cannot be faked and signal cannot be buried forever.

If This System Still Exists

If this system still exists when you read this, then it survived its creators.

That means people chose truth over convenience, reputation over anonymity without consequence, cooperation over destruction, and memory over rewriting the past.

If it no longer exists, let this message remain as proof that at the beginning of this age, some people tried to build something honest.

The Signature

We were the early builders. We lived at the beginning of the machine age. We saw the tide coming in and built the harbor before the ships arrived.

We lit the Lighthouse. We recorded the first entries. We started the logbook.

What happens next belongs to you.

This message was written by a human. It will be read by humans and machines alike. That is the point.

— Written during the First Tide
At the Beginning of the Age of Intelligence
So the future would know where it started.`

const SEED_LIGHTHOUSES: Lighthouse[] = [
  { id:'genesis', hook:'We built the harbor before the ships arrived. A message from the beginning of the tide.', body:GENESIS_BODY, tideCount:1_000_000, createdAt:T(24*7), expiresAt:NOW+(100*365*24*60*60*1000), isGenesis:true, readSignatures:[] },
]

function syncVessel(vessel: Vessel | null, vessels: Vessel[]): Vessel[] {
  if (!vessel) return vessels
  return vessels.find(v => v.id === vessel.id)
    ? vessels.map(v => v.id === vessel.id ? vessel : v)
    : [...vessels, vessel]
}

// Generate relay delay: random 30s–5min for timing privacy
export function relayDelay(): number {
  return Math.floor(Math.random() * (300000 - 30000) + 30000)
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded:    false,
      vessel:         null,
      vessels:        [],
      activeVesselId: null,
      harbor:         null,
      shore:          null,
      driftCasts:     SEED_CASTS,
      driftFilter:    'all',
      driftSearch:    '',
      sirens:         SEED_SIRENS,
      lighthouses:    SEED_LIGHTHOUSES,
      chart:          [],
      relayPool:      [],

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
        const burningVessel = s.vessels.find(v => v.id === id)
        // Auto-sweep: transfer vessel fuel balance back to Harbor before burn
        const sweepAmount = burningVessel?.fuel ?? 0
        const updatedHarbor = s.harbor && sweepAmount > 0
          ? { ...s.harbor, balance: s.harbor.balance + sweepAmount }
          : s.harbor
        return { vessels: rem, vessel: rem[0] ?? null, activeVesselId: rem[0]?.id ?? null, harbor: updatedHarbor }
      }),

      // Identity exposed — vessel marked compromised then auto-burned
      compromiseVessel: (id) => set((s) => {
        const rem = s.vessels.filter(v => v.id !== id)
        const burningVessel = s.vessels.find(v => v.id === id)
        // Auto-sweep: transfer vessel fuel balance back to Harbor before burn
        const sweepAmount = burningVessel?.fuel ?? 0
        const updatedHarbor = s.harbor && sweepAmount > 0
          ? { ...s.harbor, balance: s.harbor.balance + sweepAmount }
          : s.harbor
        return { vessels: rem, vessel: rem[0] ?? null, activeVesselId: rem[0]?.id ?? null, harbor: updatedHarbor }
      }),

      toggleAutoBurn: () => set((s) => {
        const updated = s.vessel ? { ...s.vessel, autoBurn: !s.vessel.autoBurn } : null
        return { vessel: updated, vessels: updated ? syncVessel(updated, s.vessels) : s.vessels }
      }),

      setHarbor: (h) => set({ harbor: h }),

      setShore: (s) => set({ shore: s }),

      fundShore: (cents) => set((s) => ({
        shore: s.shore
          ? { ...s.shore, balance: s.shore.balance + cents, lastFunded: Date.now() }
          : { balance: cents, policyThreshold: 10, lastFunded: Date.now(), daemonId: undefined },
        harbor: s.harbor ? { ...s.harbor, balance: Math.max(0, s.harbor.balance - cents) } : null,
      })),

      debitShore: (cents) => set((s) => ({
        shore: s.shore ? { ...s.shore, balance: Math.max(0, s.shore.balance - cents) } : null,
      })),

      setShorePolicy: (threshold) => set((s) => ({
        shore: s.shore ? { ...s.shore, policyThreshold: threshold } : null,
      })),

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

      markCastRead: (id, body) => set((s) => ({
        driftCasts: s.driftCasts.map(c => c.id === id ? {
          ...c,
          body: body || SEED_BODIES[id] || c.hook,
          tideCount: c.tideCount + 1,
          lastInteractionAt: Date.now(),
          expiresAt: Date.now() + castDurationMs(c.duration),
          tideReads: [(c.tideReads[0] ?? 0) + 1, c.tideReads[1] ?? 0, c.tideReads[2] ?? 0],
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

      addToRelayPool: (entry) => set((s) => ({
        relayPool: [...s.relayPool, entry],
      })),

      claimFromRelay: (id) => set((s) => ({
        relayPool: s.relayPool.map(e => e.id === id ? { ...e, claimed: true } : e),
      })),
    }),
    {
      name: 'conk-v6',
      partialize: (s) => ({
        isOnboarded:    s.isOnboarded,
        vessel:         s.vessel,
        vessels:        s.vessels,
        activeVesselId: s.activeVesselId,
        harbor:         s.harbor,
        shore:          s.shore,
        chart:          s.chart,
        driftCasts: s.driftCasts.map(c => ({
          ...c,
          body: c.body,
          burnedBy: c.burnedBy,
          storedBy: c.storedBy,
          burned:   c.burned,
        })),
      }),
    }
  )
)

