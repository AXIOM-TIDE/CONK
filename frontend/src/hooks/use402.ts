// CONK — 402 Paywall Hook
// Quick Pass makes every fee invisible.
// Pre-authorized session. Fires silently. Never interrupts.

import { useCallback } from 'react'
import { useConkStore, FEES } from '../lib/store'

export const CONK_PACKAGE = import.meta.env.VITE_CONK_PACKAGE ?? '0x0'
export const ABYSS_ID     = import.meta.env.VITE_ABYSS_ID     ?? '0x0'

export function use402() {
  const { quickPass, spendQuickPass, touchHarbor, touchVessel, activeVessel } = useConkStore()

  const pay = useCallback((
    action:      keyof typeof FEES,
    onSuccess?:  () => void,
    onLimitHit?: () => void,
  ) => {
    const fee    = FEES[action]
    const passed = spendQuickPass(fee)
    if (!passed) {
      onLimitHit?.()
      return false
    }
    touchHarbor()
    if (activeVessel) touchVessel(activeVessel.id)
    onSuccess?.()
    return true
  }, [quickPass, spendQuickPass, touchHarbor, touchVessel, activeVessel])

  const payMessage = useCallback((
    burn:      boolean,
    hasMedia:  boolean,
    onSuccess?: () => void,
  ) => {
    return pay(hasMedia ? 'DRIFT_MEDIA' : 'MESSAGE', onSuccess)
  }, [pay])

  const payDriftRead = useCallback((onSuccess?: () => void) => {
    return pay('DRIFT_READ', onSuccess)
  }, [pay])

  const payLhVisit = useCallback((onSuccess?: () => void) => {
    return pay('LH_VISIT', onSuccess)
  }, [pay])

  const payComment = useCallback((onSuccess?: () => void) => {
    return pay('COMMENT', onSuccess)
  }, [pay])

  return {
    pay,
    payMessage,
    payDriftRead,
    payLhVisit,
    payComment,
    quickPassRemaining: quickPass.remaining,
    quickPassLimit:     quickPass.limit,
    quickPassSpent:     quickPass.spent,
    isLow: quickPass.remaining < 0.50,
  }
}
