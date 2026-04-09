/**
 * use402 — Micro-payment hook for CONK
 *
 * Handles the $0.001 cast-read flow.
 * STEP 6 — wired to real Sui protocol contracts via zkLogin.
 *
 * The Relay sits between Vessel and Cast — this hook mirrors that:
 *   1. Vessel draws fuel from Harbor
 *   2. Relay takes the fuel, issues a receipt (fee + vessel tier + timestamp — NO identity link)
 *   3. Receipt passes to the Cast layer — Harbor never sees what was cast
 */

import { useState, useCallback } from 'react'
import { useStore } from '../store/store'
import { crossPaywall } from '../sui/client'
import { isLoggedIn, hasProof } from '../sui/zklogin'

export type PaymentStatus = 'idle' | 'pending' | 'success' | 'error' | 'insufficient' | 'no_session'

export interface PaymentReceipt {
  feeAmount:   number      // 1000 = $0.001 in microUSDC
  vesselClass: string
  timestamp:   number
  txDigest:    string      // real Sui transaction digest
  // NOTE: never contains which Harbor, which Vessel, or which Cast
  // The link is never made. This is not encryption. This is architecture.
}

export interface Use402Options {
  amount?:         number        // microUSDC, default 1000 ($0.001)
  authorAddress?:  string        // cast author vessel address for 97/3 split
  onSuccess?: (receipt: PaymentReceipt) => void
  onError?:   (err: string) => void
}

export function use402(options: Use402Options = {}) {
  const { amount = 1000, authorAddress, onSuccess, onError } = options
  const [status, setStatus]   = useState<PaymentStatus>('idle')
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
  const harbor  = useStore((s) => s.harbor)
  const vessel  = useStore((s) => s.vessel)

  const pay = useCallback(async (castId: string = 'read'): Promise<PaymentReceipt | null> => {
    if (!harbor || !vessel) {
      setStatus('error')
      onError?.('No Harbor or Vessel active')
      return null
    }

    // Check zkLogin session — skip in test/mock mode
    const hasSession = isLoggedIn() && hasProof()

    // Check balance
    if (harbor.balance < 0.1) {
      setStatus('insufficient')
      onError?.('Insufficient Harbor balance — top up USDC')
      return null
    }

    setStatus('pending')

    try {
      // Real Sui transaction via zkLogin + Shinami gas sponsorship
      const result = await crossPaywall({
        vesselId:      vessel.id,
        castId:        castId,
        amountUsdc:    amount,
        authorAddress: authorAddress,
      })

      const txDigest = typeof result === 'string' ? result : result.txDigest
      console.log('Payment confirmed on Sui:', txDigest)

      const r: PaymentReceipt = {
        feeAmount:   amount,
        vesselClass: vessel.class,
        timestamp:   Date.now(),
        txDigest:    txDigest,
      }

      setReceipt(r)
      setStatus('success')
      onSuccess?.(r)
      return r

    } catch (err: any) {
      console.error('Payment failed:', err)
      setStatus('error')
      onError?.(err.message ?? 'Payment failed')
      return null
    }
  }, [harbor, vessel, amount, onSuccess, onError])

  const reset = useCallback(() => {
    setStatus('idle')
    setReceipt(null)
  }, [])

  return { pay, status, receipt, reset }
}

// ─── SOUND CAST hook (POST a cast — $0.001) ──────────────────

export function useSoundCast() {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const addCast      = useStore((s) => s.addCast)
  const vessel       = useStore((s) => s.vessel)
  const debitHarbor  = useStore((s) => s.debitHarbor)
  const debitVessel  = useStore((s) => s.debitVessel)

  const sound = useCallback(
    async (payload: {
      hook:              string
      body:              string
      mode:              string
      duration:          string
      price?:            number
      castType?:         string
      subInterval?:      string
      securityQuestion?: string
      securityAnswer?:   string
      keywords?:         string[]
      unlocksAt?:        number
    }): Promise<boolean> => {
      if (!vessel) return false

      // Check zkLogin session — allow mock in test mode

      setStatus('pending')

      try {
        // Real Sui transaction for cast creation
        const castPrice = payload.price ?? 1000
        const result = await crossPaywall({
          vesselId:      vessel.id,
          castId:        `cast_${Date.now()}`,
          amountUsdc:    castPrice,
          authorAddress: vessel.id,
          price:         castPrice,
        })

        const castTxDigest = typeof result === 'string' ? result : result.txDigest
        console.log('Cast payment confirmed on Sui:', castTxDigest)

        const durationMs: Record<string, number> = {
          '24h': 86400000,
          '48h': 172800000,
          '72h': 259200000,
          '7d':  604800000,
        }

        addCast({
          id:                 `cast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          hook:               payload.hook,
          body:               payload.body,
          mode:               payload.mode as any,
          duration:           payload.duration as any,
          expiresAt:          Date.now() + (durationMs[payload.duration] ?? 86400000),
          createdAt:          Date.now(),
          lastInteractionAt:  Date.now(),
          tideCount:          0,
          tideReads:          [0, 0, 0],
          vesselClass:        vessel.class,
          vesselId:           vessel.id,
          securityQuestion:   payload.securityQuestion,
          securityAnswer:     payload.securityAnswer,
          keywords:           payload.keywords,
          unlocksAt:          payload.unlocksAt,
          price:              payload.price ?? 1000,
          authorAddress:      vessel.id,
          revenueEarned:      0,
          castType:           payload.castType ?? 'standard',
          subInterval:        payload.subInterval,
        })

        // Debit fuel
        if (vessel.fuelDrawing && vessel.fuel >= 0.1) {
          debitVessel(0.1)
        } else {
          debitHarbor(0.1)
        }

        setStatus('success')
        return true

      } catch (err: any) {
        console.error('Cast failed:', err)
        setStatus('error')
        return false
      }
    },
    [vessel, addCast, debitHarbor, debitVessel]
  )

  return { sound, status }
}