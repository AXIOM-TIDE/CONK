/**
 * use402 — Micro-payment hook for CONK
 *
 * Handles the $0.001 cast-read flow.
 * In STEP 6 (testnet), this calls the Sui protocol contracts.
 * For now, it simulates the flow with a short delay.
 *
 * The Relay sits between Harbor and Cast — this hook mirrors that:
 *   1. Deduct $0.001 from Harbor (via Relay)
 *   2. Get a receipt (fee + vessel tier + timestamp — NO identity link)
 *   3. Pass receipt to the Cast layer to unlock content
 */

import { useState, useCallback } from 'react'
import { useStore } from '../store/store'

export type PaymentStatus = 'idle' | 'pending' | 'success' | 'error' | 'insufficient'

export interface PaymentReceipt {
  feeAmount: number      // 1000 = $0.001 in microUSDC
  vesselTier: string     // 'ghost' | 'shadow' | 'open'
  timestamp: number
  // NOTE: never contains which Harbor, which Vessel, or which Cast
  // The link is never made. This is not encryption. This is architecture.
}

export interface Use402Options {
  amount?: number        // microUSDC, default 1000 ($0.001)
  onSuccess?: (receipt: PaymentReceipt) => void
  onError?: (err: string) => void
}

export function use402(options: Use402Options = {}) {
  const { amount = 1000, onSuccess, onError } = options
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
  const harbor = useStore((s) => s.harbor)
  const vessel = useStore((s) => s.vessel)

  const pay = useCallback(async (): Promise<PaymentReceipt | null> => {
    if (!harbor || !vessel) {
      setStatus('error')
      onError?.('No Harbor or Vessel active')
      return null
    }

    // Check minimum balance
    if (harbor.balance < amount / 1000) {
      setStatus('insufficient')
      onError?.('Insufficient Harbor balance')
      return null
    }

    setStatus('pending')

    try {
      // TODO (STEP 6): Call Sui relay contract
      // const tx = await suiClient.executeTransactionBlock(...)
      // const receipt = await relayContract.drawFuel(vesselId, amount)

      // Simulated relay delay (remove in STEP 6)
      await new Promise((r) => setTimeout(r, 600))

      const r: PaymentReceipt = {
        feeAmount: amount,
        vesselTier: vessel.tier,
        timestamp: Date.now(),
      }

      setReceipt(r)
      setStatus('success')
      onSuccess?.(r)
      return r
    } catch (err) {
      setStatus('error')
      onError?.('Payment failed')
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
  const addCast = useStore((s) => s.addCast)
  const vessel = useStore((s) => s.vessel)

  const sound = useCallback(
    async (payload: {
      hook: string
      body: string
      mode: string
      duration: string
      mediaUrl?: string
    }): Promise<boolean> => {
      if (!vessel) return false
      setStatus('pending')

      try {
        // TODO (STEP 6): Call cast.move::sound_cast on Sui
        await new Promise((r) => setTimeout(r, 700))

        const durationMs: Record<string, number> = {
          '24h': 86400000,
          '48h': 172800000,
          '72h': 259200000,
          '7d':  604800000,
        }

        addCast({
          id: `cast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          hook: payload.hook,
          body: payload.body,
          mode: payload.mode as any,
          duration: payload.duration as any,
          expiresAt: Date.now() + (durationMs[payload.duration] ?? 86400000),
          createdAt: Date.now(),
          tideCount: 0,
          vesselTier: vessel.tier,
          mediaUrl: payload.mediaUrl,
        })

        setStatus('success')
        return true
      } catch {
        setStatus('error')
        return false
      }
    },
    [vessel, addCast]
  )

  return { sound, status }
}
