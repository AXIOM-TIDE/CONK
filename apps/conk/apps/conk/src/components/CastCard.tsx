import { useState, useCallback } from 'react'
import type { Cast } from '../store/store'
import { useStore } from '../store/store'
import { use402 } from '../hooks/use402'
import { formatTide, timeUntilExpiry, formatTimeAgo } from '../utils/scrubber'

interface CastCardProps {
  cast: Cast
  style?: React.CSSProperties
}

const MODE_META = {
  open:      { label: 'Open',      cls: 'badge-open',   icon: '◎' },
  sealed:    { label: 'Sealed',    cls: 'badge-sealed',  icon: '⬡' },
  eyes_only: { label: 'Eyes Only', cls: 'badge-eyes',    icon: '👁' },
  ghost:     { label: 'Ghost',     cls: 'badge-ghost',   icon: '◌' },
}

const TIER_ICON = {
  ghost:  '◌',
  shadow: '◑',
  open:   '●',
}

export function CastCard({ cast, style }: CastCardProps) {
  const { markCastRead, burnCast } = useStore()
  const { pay, status } = use402({
    amount: 1000,
    onSuccess: async (receipt) => {
      // Simulate fetch of cast body from Walrus/chain
      await new Promise((r) => setTimeout(r, 200))
      markCastRead(cast.id, cast.body ?? '')

      // Auto-burn for ghost/eyes_only after display
      if (cast.mode === 'ghost' || cast.mode === 'eyes_only') {
        setTimeout(() => burnCast(cast.id), 3500)
      }
    },
  })

  const [burnAnim, setBurnAnim] = useState(false)
  const expiry = timeUntilExpiry(cast.expiresAt)
  const isUnlocked = cast.body !== undefined && !cast.burned
  const isPending  = status === 'pending'
  const isGhost    = cast.mode === 'ghost' || cast.mode === 'eyes_only'
  const modeMeta   = MODE_META[cast.mode]

  const handleUnlock = useCallback(async () => {
    if (isUnlocked || isPending || cast.burned) return
    if (isGhost) setBurnAnim(true)
    await pay()
    setTimeout(() => setBurnAnim(false), 1000)
  }, [isUnlocked, isPending, cast.burned, isGhost, pay])

  return (
    <article
      className={`cast-card ${isGhost ? 'cast-ghost' : ''} ${cast.burned ? 'cast-burned' : ''} ${burnAnim ? 'cast-burning' : ''}`}
      style={style}
    >
      {/* Mode + tier header */}
      <div className="cast-meta">
        <span className={`badge ${modeMeta.cls}`}>
          {modeMeta.icon} {modeMeta.label}
        </span>
        <span className="cast-vessel-tier" title={`${cast.vesselTier} vessel`}>
          {TIER_ICON[cast.vesselTier ?? 'ghost']}
        </span>
        <span className="cast-age">{formatTimeAgo(cast.createdAt)}</span>
      </div>

      {/* Hook — always free */}
      <h3 className="cast-hook">{cast.hook}</h3>

      {/* Body — locked until paid */}
      {cast.burned ? (
        <div className="cast-body cast-burned-msg">
          <span>🌊 Consumed by the tide.</span>
        </div>
      ) : isUnlocked ? (
        <div className="cast-body cast-body-open">
          {(cast.body ?? '').split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {isGhost && (
            <div className="cast-burn-warning">
              This cast will be consumed momentarily.
            </div>
          )}
        </div>
      ) : (
        <button
          className={`cast-unlock ${isPending ? 'loading' : ''}`}
          onClick={handleUnlock}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="spinner" />
              Relaying...
            </>
          ) : (
            <>
              <LockIcon />
              Read full cast · $0.001
            </>
          )}
        </button>
      )}

      {/* Footer — tide + expiry */}
      <div className="cast-footer">
        <div className="cast-tide">
          <TideIcon />
          <span className="tide-count">{formatTide(cast.tideCount)}</span>
          <span className="tide-label">reads</span>
        </div>
        <div className={`cast-expiry ${expiry.urgent ? 'urgent' : ''}`}>
          {expiry.label}
        </div>
      </div>

      {/* Lighthouse proximity bar */}
      {cast.tideCount > 10000 && (
        <div className="lighthouse-bar-wrap">
          <div
            className="lighthouse-bar"
            style={{ width: `${Math.min(100, (cast.tideCount / 1_000_000) * 100)}%` }}
          />
          <span className="lighthouse-label">
            {cast.tideCount >= 1_000_000
              ? '🔆 Lighthouse'
              : `${((cast.tideCount / 1_000_000) * 100).toFixed(1)}% to Lighthouse`}
          </span>
        </div>
      )}
    </article>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function TideIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
