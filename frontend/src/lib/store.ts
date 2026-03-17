import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type VesselType = 'ghost' | 'shadow' | 'open'

export interface Harbor {
  address:     string
  createdAt:   number
  lastActive:  number
  expiresAt:   number
  vesselCount: number
  dockCount:   number
}

export interface Vessel {
  id:          string
  type:        VesselType
  createdAt:   number
  lastActive:  number
  expiresAt:   number
  currentDock: string | null
}

export interface QuickPass {
  enabled:   boolean
  limit:     number
  spent:     number
  remaining: number
}

export interface ChartEntry {
  id:        string
  type:      'lighthouse' | 'siren_dock'
  address:   string
  title:     string
  visitedAt: number
  shielded:  boolean
}

export const FEES = {
  HARBOR:      0.05,
  VESSEL:      0.01,
  SIREN:       0.03,
  FLARE:       0.03,
  DOCK:        0.50,
  MESSAGE:     0.001,
  DRIFT_READ:  0.001,
  DRIFT_24H:   0.001,
  DRIFT_48H:   0.005,
  DRIFT_72H:   0.010,
  DRIFT_7D:    0.050,
  DRIFT_MEDIA: 0.010,
  COMMENT:     0.001,
  LH_VISIT:    0.001,
}

interface ConkStore {
  harbor:           Harbor | null
  setHarbor:        (h: Harbor) => void
  clearHarbor:      () => void
  touchHarbor:      () => void
  activeVessel:     Vessel | null
  vessels:          Vessel[]
  setActiveVessel:  (v: Vessel) => void
  addVessel:        (v: Vessel) => void
  removeVessel:     (id: string) => void
  touchVessel:      (id: string) => void
  quickPass:        QuickPass
  setQuickPassLimit:(limit: number) => void
  spendQuickPass:   (amount: number) => boolean
  resetQuickPass:   () => void
  chart:            ChartEntry[]
  addChartEntry:    (entry: ChartEntry) => void
  removeChartEntry: (id: string) => void
  shieldEntry:      (id: string, shielded: boolean) => void
  realTime:         boolean
  setRealTime:      (on: boolean) => void
  network:          'mainnet' | 'testnet'
  setNetwork:       (n: 'mainnet' | 'testnet') => void
}

export const useConkStore = create<ConkStore>()(
  persist(
    (set, get) => ({
      harbor:       null,
      setHarbor:    (h) => set({ harbor: h }),
      clearHarbor:  ()  => set({ harbor: null, activeVessel: null, vessels: [] }),
      touchHarbor:  ()  => set((s) => ({
        harbor: s.harbor ? {
          ...s.harbor,
          lastActive: Date.now(),
          expiresAt:  Date.now() + 365 * 24 * 60 * 60 * 1000
        } : null
      })),
      activeVessel:    null,
      vessels:         [],
      setActiveVessel: (v) => set({ activeVessel: v }),
      addVessel:  (v) => set((s) => ({ vessels: [...s.vessels, v] })),
      removeVessel: (id) => set((s) => ({
        vessels:      s.vessels.filter(v => v.id !== id),
        activeVessel: s.activeVessel?.id === id ? null : s.activeVessel,
      })),
      touchVessel: (id) => set((s) => ({
        vessels: s.vessels.map(v =>
          v.id === id ? {
            ...v,
            lastActive: Date.now(),
            expiresAt:  Date.now() + 365 * 24 * 60 * 60 * 1000
          } : v
        ),
      })),
      quickPass: {
        enabled:   true,
        limit:     5.00,
        spent:     0,
        remaining: 5.00,
      },
      setQuickPassLimit: (limit) => set((s) => ({
        quickPass: { ...s.quickPass, limit, remaining: limit - s.quickPass.spent }
      })),
      spendQuickPass: (amount) => {
        const { quickPass } = get()
        if (!quickPass.enabled) return false
        if (quickPass.spent + amount > quickPass.limit) return false
        set((s) => ({
          quickPass: {
            ...s.quickPass,
            spent:     s.quickPass.spent + amount,
            remaining: s.quickPass.remaining - amount,
          }
        }))
        return true
      },
      resetQuickPass: () => set((s) => ({
        quickPass: { ...s.quickPass, spent: 0, remaining: s.quickPass.limit }
      })),
      chart:            [],
      addChartEntry:    (entry) => set((s) => ({ chart: [entry, ...s.chart.filter(e => e.id !== entry.id)] })),
      removeChartEntry: (id)    => set((s) => ({ chart: s.chart.filter(e => e.id !== id) })),
      shieldEntry: (id, shielded) => set((s) => ({
        chart: s.chart.map(e => e.id === id ? { ...e, shielded } : e)
      })),
      realTime:   false,
      setRealTime: (on) => set({ realTime: on }),
      network:    'mainnet',
      setNetwork: (n) => set({ network: n }),
    }),
    {
      name:    'conk-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
