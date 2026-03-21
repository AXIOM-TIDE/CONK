import { useState, useEffect, useRef } from 'react'
import { useStore, type CastMode } from '../store/store'
import { generateMockCasts } from '../utils/scrubber'
import { CastCard } from '../components/CastCard'
import { CastComposer } from '../components/CastComposer'
import { LighthouseStrip } from '../components/LighthouseView'
import { formatTide } from '../utils/scrubber'

type FilterMode = 'all' | CastMode

const FILTER_OPTIONS: { id: FilterMode; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'open',      label: 'Open' },
  { id: 'eyes_only', label: 'Eyes Only' },
  { id: 'ghost',     label: 'Ghost' },
]

export function Drift() {
  const { driftCasts, driftFilter, setDriftCasts, setDriftFilter } = useStore()
  const setOnboarded = useStore((s) => s.setOnboarded)
  const setVessel    = useStore((s) => s.setVessel)
  const setHarbor    = useStore((s) => s.setHarbor)
  const [composerOpen, setComposerOpen]   = useState(false)
  const [refreshing, setRefreshing]       = useState(false)
  const [newCount, setNewCount]           = useState(0)
  const [visible, setVisible]             = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  // Seed mock casts on first load if feed is empty
  useEffect(() => {
    if (driftCasts.length < 8) {
      setDriftCasts([...driftCasts, ...generateMockCasts(6)])
    }
  }, [])

  // Staggered card entrance via IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.castId
            if (id) setVisible((v) => new Set(v).add(id))
          }
        })
      },
      { rootMargin: '40px', threshold: 0.05 }
    )
    return () => observerRef.current?.disconnect()
  }, [])

  const observeCard = (el: HTMLElement | null) => {
    if (el && observerRef.current) observerRef.current.observe(el)
  }

  // Simulate live tide — random increments on high-count casts
  useEffect(() => {
    const interval = setInterval(() => {
      const { driftCasts: casts, incrementTide } = useStore.getState()
      const candidates = casts.filter((c) => c.tideCount > 100)
      if (candidates.length === 0) return
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      incrementTide(pick.id)
    }, 2400)
    return () => clearInterval(interval)
  }, [])

  // Simulate new cast indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setNewCount((n) => n + 1)
    }, 18000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setNewCount(0)
    setTimeout(() => setRefreshing(false), 800)
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredCasts = driftFilter === 'all'
    ? driftCasts
    : driftCasts.filter((c) => c.mode === driftFilter)

  return (
    <div className="drift-page" ref={feedRef}>
      {/* Header */}
      <header className="drift-header">
        <div className="drift-wordmark">CONK</div>
        <div className="drift-header-right">
          <button
            className="nav-btn"
            onClick={() => { setVessel(null); setHarbor(null); setOnboarded(false) }}
            title="Reset (dev)"
            style={{ opacity: 0.4, fontSize: 10 }}
          >
            ↺
          </button>
        </div>
      </header>

      {/* New casts banner */}
      {newCount > 0 && (
        <button className="new-casts-banner" onClick={handleRefresh}>
          {newCount} new cast{newCount > 1 ? 's' : ''} · tap to surface
        </button>
      )}

      {/* Filter strip */}
      <div className="filter-strip">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            className={`filter-chip ${driftFilter === f.id ? 'active' : ''}`}
            onClick={() => setDriftFilter(f.id as any)}
          >
            {f.label}
          </button>
        ))}
        <div className="filter-strip-right">
          <LivePulse />
        </div>
      </div>

      {/* Lighthouse strip */}
      <LighthouseStrip />

      {/* Feed */}
      <div className={`cast-feed ${refreshing ? 'refreshing' : ''}`}>
        {filteredCasts.length === 0 ? (
          <div className="empty-state">
            <TideIcon />
            <h3>The tide is still</h3>
            <p>No casts match this filter. Sound something.</p>
          </div>
        ) : (
          filteredCasts.map((cast, i) => (
            <div
              key={cast.id}
              data-cast-id={cast.id}
              ref={observeCard}
              className={`cast-wrapper ${visible.has(cast.id) ? 'visible' : ''}`}
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
            >
              <CastCard cast={cast} />
            </div>
          ))
        )}

        {/* Tide footer */}
        {filteredCasts.length > 0 && (
          <div className="tide-footer">
            <div className="tide-footer-line" />
            <span className="tide-footer-text">
              {formatTide(filteredCasts.reduce((a, c) => a + c.tideCount, 0))} total reads in this tide
            </span>
            <div className="tide-footer-line" />
          </div>
        )}
      </div>

      {/* FAB — Sound a cast */}
      <button className="fab" onClick={() => setComposerOpen(true)} aria-label="Sound a cast">
        <CastIcon />
      </button>

      {/* Composer modal */}
      {composerOpen && <CastComposer onClose={() => setComposerOpen(false)} />}

      <style>{`
        .drift-page {
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .drift-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 52px;
          background: rgba(3,10,13,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .drift-wordmark {
          font-family: var(--font-ui);
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: var(--teal);
          text-shadow: var(--teal-glow-sm);
          text-transform: uppercase;
        }
        .drift-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* New casts banner */
        .new-casts-banner {
          position: sticky;
          top: 52px;
          z-index: 18;
          width: 100%;
          padding: 8px 16px;
          background: rgba(0,200,180,0.1);
          border-bottom: 1px solid var(--border-hot);
          color: var(--teal);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          border: none;
          text-align: center;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        /* Filter strip */
        .filter-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          overflow-x: auto;
          scrollbar-width: none;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
        }
        .filter-strip::-webkit-scrollbar { display: none; }
        .filter-strip-right {
          margin-left: auto;
          flex-shrink: 0;
        }
        .filter-chip {
          flex-shrink: 0;
          padding: 5px 12px;
          border-radius: 100px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-ui);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .filter-chip:hover { border-color: var(--border2); color: var(--text); }
        .filter-chip.active {
          background: var(--teal-dim);
          border-color: var(--border-hot);
          color: var(--teal);
        }

        /* Live pulse */
        .live-pulse {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          color: var(--teal);
          font-family: var(--font-cast);
          letter-spacing: 0.06em;
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--teal);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(0,200,180,0.4); }
          50%       { opacity: 0.7; transform: scale(1.1); box-shadow: 0 0 0 4px rgba(0,200,180,0); }
        }

        /* Cast feed */
        .cast-feed {
          padding: 12px 0 80px;
          transition: opacity 0.2s;
        }
        .cast-feed.refreshing { opacity: 0.4; }

        /* Card entrance animation */
        .cast-wrapper {
          opacity: 0;
          transform: translateY(16px);
        }
        .cast-wrapper.visible {
          animation: castIn 0.35s ease both;
        }
        @keyframes castIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── CAST CARD ─────────────────────────────────────── */
        .cast-card {
          margin: 0 12px 10px;
          padding: 14px 14px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }
        .cast-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,200,180,0.03) 0%, transparent 60%);
          pointer-events: none;
        }
        .cast-card:hover {
          border-color: var(--border2);
        }
        .cast-card.cast-ghost {
          border-color: rgba(255,64,96,0.1);
        }
        .cast-card.cast-ghost:hover {
          border-color: rgba(255,64,96,0.25);
          box-shadow: 0 0 16px rgba(255,64,96,0.06);
        }
        .cast-card.cast-burning {
          animation: burnFlash 0.6s ease;
        }
        @keyframes burnFlash {
          0%   { border-color: var(--burn); box-shadow: 0 0 20px rgba(255,64,96,0.4); }
          100% { border-color: rgba(255,64,96,0.1); box-shadow: none; }
        }
        .cast-card.cast-burned {
          opacity: 0.4;
        }

        /* Cast header */
        .cast-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .cast-vessel-tier {
          font-size: 11px;
          color: var(--text-ghost);
          margin-left: auto;
        }
        .cast-age {
          font-size: 11px;
          color: var(--text-ghost);
          font-family: var(--font-cast);
        }

        /* Hook */
        .cast-hook {
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
          line-height: 1.45;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        /* Body states */
        .cast-body {
          margin-bottom: 10px;
        }
        .cast-body-open {
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.65;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        .cast-body-open p { margin: 0; }
        .cast-burn-warning {
          font-size: 11px;
          color: var(--burn);
          font-family: var(--font-cast);
          margin-top: 6px;
          letter-spacing: 0.04em;
        }
        .cast-burned-msg {
          font-size: 12px;
          color: var(--text-ghost);
          font-family: var(--font-cast);
          font-style: italic;
        }

        /* Unlock button */
        .cast-unlock {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 9px 12px;
          background: var(--surface2);
          border: 1px dashed var(--border2);
          border-radius: var(--radius);
          color: var(--teal);
          font-family: var(--font-cast);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 10px;
          justify-content: center;
          letter-spacing: 0.04em;
        }
        .cast-unlock:hover {
          background: var(--teal-dim);
          border-color: var(--border-hot);
          box-shadow: var(--teal-glow-sm);
        }
        .cast-unlock.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Spinner */
        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(0,200,180,0.3);
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer */
        .cast-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 6px;
        }
        .cast-tide {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-ghost);
        }
        .cast-tide svg { color: var(--teal); opacity: 0.7; }
        .tide-count {
          font-family: var(--font-cast);
          font-size: 12px;
          color: var(--teal);
          font-weight: 600;
        }
        .tide-label {
          font-size: 11px;
          color: var(--text-ghost);
        }
        .cast-expiry {
          font-family: var(--font-cast);
          font-size: 11px;
          color: var(--text-ghost);
          letter-spacing: 0.04em;
        }
        .cast-expiry.urgent {
          color: var(--burn);
        }

        /* Lighthouse bar */
        .lighthouse-bar-wrap {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }
        .lighthouse-bar {
          height: 2px;
          background: linear-gradient(90deg, var(--teal), rgba(0,200,180,0.3));
          border-radius: 1px;
          box-shadow: 0 0 8px rgba(0,200,180,0.4);
          transition: width 0.6s ease;
          margin-bottom: 4px;
        }
        .lighthouse-label {
          font-size: 10px;
          color: var(--teal);
          font-family: var(--font-cast);
          letter-spacing: 0.04em;
          opacity: 0.7;
        }

        /* Tide footer */
        .tide-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          margin-top: 8px;
        }
        .tide-footer-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .tide-footer-text {
          font-family: var(--font-cast);
          font-size: 10px;
          color: var(--text-ghost);
          white-space: nowrap;
          letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  )
}

function LivePulse() {
  return (
    <div className="live-pulse">
      <div className="pulse-dot" />
      LIVE
    </div>
  )
}

function CastIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/>
      <path d="M17.586 3.414a2 2 0 1 1 2.828 2.828L12 15l-4 1 1-4 8.586-8.586z"/>
    </svg>
  )
}

function TideIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
