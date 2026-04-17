/**
 * VesselSubscribeButton
 * Drop into apps/conk/src/components/VesselSubscribeButton.tsx
 *
 * Shows subscribe/unsubscribe for a vessel.
 * Used on Beacon profiles, Lighthouse feeds, and cast cards.
 *
 * @example
 * <VesselSubscribeButton
 *   vesselId={cast.vesselId}
 *   displayName={cast.vesselDisplayName}
 *   priceUsdc={500000}   // $0.50/month
 *   interval="monthly"
 * />
 */

import { useState } from 'react'
import { useStore } from '../store/store'
import { crossPaywall } from '../sui/client'
import { getSession } from '../sui/zklogin'

interface Props {
  vesselId:     string
  displayName?: string
  priceUsdc?:   number    // USDC base units, default 100000 = $0.10/month
  interval?:    'daily' | 'weekly' | 'monthly' | 'yearly'
  compact?:     boolean
}

const INTERVAL_MS = {
  daily:   86_400_000,
  weekly:  604_800_000,
  monthly: 2_592_000_000,
  yearly:  31_536_000_000,
}

const INTERVAL_LABEL = {
  daily:   '/day',
  weekly:  '/week',
  monthly: '/mo',
  yearly:  '/yr',
}

export function VesselSubscribeButton({
  vesselId,
  displayName,
  priceUsdc  = 100_000,   // $0.10/month default
  interval   = 'monthly',
  compact    = false,
}: Props) {
  const vessel            = useStore((s) => s.vessel)
  const subscriptions     = useStore((s) => s.subscriptions ?? [])
  const addSubscription   = useStore((s) => s.addSubscription)
  const cancelSubscription = useStore((s) => s.cancelSubscription)

  const [pending, setPending] = useState(false)
  const [error,   setError]   = useState('')

  const existing = subscriptions.find(
    (s: any) => s.vesselId === vesselId && s.active && s.renewsAt > Date.now()
  )
  const isSubscribed = !!existing

  const priceDisplay = `$${(priceUsdc / 1_000_000).toFixed(2)}${INTERVAL_LABEL[interval]}`

  async function handleSubscribe() {
    if (!vessel) { setError('Need a vessel to subscribe'); return }
    const session = getSession()
    if (!session) { setError('Not logged in'); return }

    setPending(true)
    setError('')

    try {
      const txDigest = await crossPaywall({
        vesselId:      vessel.onChainId ?? vessel.id,
        castId:        `sub_${vesselId}`,
        amountUsdc:    priceUsdc,
        authorAddress: vesselId,
      })

      addSubscription({
        id:           `sub_${Date.now()}`,
        vesselId,
        subscriberId: vessel.id,
        displayName,
        interval,
        priceUsdc,
        startedAt:    Date.now(),
        renewsAt:     Date.now() + INTERVAL_MS[interval],
        active:       true,
        txDigest,
      } as any)

    } catch (err: unknown) {
      setError((err as Error).message ?? 'Subscribe failed')
    } finally {
      setPending(false)
    }
  }

  function handleCancel() {
    if (existing) cancelSubscription(existing.id)
  }

  if (compact) return (
    <button
      onClick={isSubscribed ? handleCancel : handleSubscribe}
      disabled={pending}
      style={{
        background:   isSubscribed ? 'rgba(0,184,230,0.1)' : 'var(--teal)',
        border:       `1px solid ${isSubscribed ? 'rgba(0,184,230,0.3)' : 'transparent'}`,
        borderRadius: 'var(--radius)',
        color:        isSubscribed ? 'var(--teal)' : 'var(--text-inv)',
        fontFamily:   'var(--font-mono)',
        fontSize:     '9px',
        padding:      '3px 8px',
        cursor:       pending ? 'not-allowed' : 'pointer',
        letterSpacing: '0.04em',
        opacity:      pending ? 0.7 : 1,
      }}
    >
      {pending ? '…' : isSubscribed ? '✓ subscribed' : `subscribe`}
    </button>
  )

  return (
    <div style={{
      padding:      '12px',
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
    }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600 }}>
            {displayName ?? vesselId.slice(0, 12) + '…'}
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'2px' }}>
            {isSubscribed
              ? `renews ${new Date(existing.renewsAt).toLocaleDateString()}`
              : `${priceDisplay} · access all their casts`}
          </div>
        </div>

        {isSubscribed ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
            <span style={{
              fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--teal)',
              border:'1px solid rgba(0,184,230,0.3)', borderRadius:'var(--radius)',
              padding:'2px 6px',
            }}>
              ✓ active
            </span>
            <button onClick={handleCancel} style={{
              background:'none', border:'none', color:'var(--text-off)',
              fontFamily:'var(--font-mono)', fontSize:'9px',
              cursor:'pointer', padding:0,
            }}>
              cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={pending || !vessel}
            style={{
              background:   !vessel ? 'var(--surface2)' : 'var(--teal)',
              border:       'none',
              borderRadius: 'var(--radius)',
              color:        !vessel ? 'var(--text-off)' : 'var(--text-inv)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '10px',
              fontWeight:   600,
              padding:      '7px 14px',
              cursor:       pending || !vessel ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              opacity:      pending ? 0.7 : 1,
              flexShrink:   0,
            }}
          >
            {pending ? '…' : `Subscribe · ${priceDisplay}`}
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--burn)', marginTop:'4px' }}>
          {error}
        </div>
      )}

      <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', lineHeight:1.6 }}>
        97% → vessel · 3% → treasury · auto-renews {interval}
      </div>
    </div>
  )
}
