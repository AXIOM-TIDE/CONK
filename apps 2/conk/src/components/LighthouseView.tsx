import { useState, useEffect } from 'react'
import { useStore, type Lighthouse } from '../store/store'

interface LighthouseViewProps {
  lighthouse: Lighthouse
  onClose: () => void
}

// ─── MAIN VIEW ───────────────────────────────────────────────

export function LighthouseView({ lighthouse, onClose }: LighthouseViewProps) {
  const { visitLighthouse, addChartEntry, debitHarbor, vessel } = useStore()
  const [visited,   setVisited]   = useState(false)
  const [visiting,  setVisiting]  = useState(false)
  const [clockMs,   setClockMs]   = useState(lighthouse.clockExpiresAt - Date.now())
  const [killOpen,  setKillOpen]  = useState(false)
  const [showKillWarning, setShowKillWarning] = useState(false)

  // Countdown clock
  useEffect(() => {
    const interval = setInterval(() => {
      setClockMs(lighthouse.clockExpiresAt - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [lighthouse.clockExpiresAt])

  const handleVisit = async () => {
    if (lighthouse.isGenesis) {
      // Genesis is always free
      setVisited(true)
      addChartEntry({ type: 'lighthouse', id: lighthouse.id, name: lighthouse.hook, visitedAt: Date.now() })
      visitLighthouse(lighthouse.id)
      return
    }

    if (visiting) return
    setVisiting(true)
    await new Promise((r) => setTimeout(r, 500))
    debitHarbor(0.1)  // $0.001
    visitLighthouse(lighthouse.id)
    addChartEntry({ type: 'lighthouse', id: lighthouse.id, name: lighthouse.hook, visitedAt: Date.now() })
    setVisited(true)
    setVisiting(false)
  }

  return (
    <div className="lh-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-panel">

        {/* Genesis ribbon */}
        {lighthouse.isGenesis && (
          <div className="lh-genesis-ribbon">
            ✦ GENESIS LIGHTHOUSE · FREE TO READ · PERMANENT · UNKILLABLE
          </div>
        )}

        {/* Header */}
        <div className="lh-header">
          <button className="lh-close" onClick={onClose}>✕</button>
          <div className="lh-beacon">
            <div className="lh-beacon-glow" />
            <span className="lh-beacon-icon">🔆</span>
          </div>
          <h2 className="lh-hook">{lighthouse.hook}</h2>
        </div>

        {/* Stats bar */}
        <div className="lh-stats">
          <div className="lh-stat">
            <span className="lh-stat-label">Visits</span>
            <span className="lh-stat-val">{(lighthouse.visitCount + (visited ? 1 : 0)).toLocaleString()}</span>
          </div>
          <div className="lh-stat">
            <span className="lh-stat-label">Clock</span>
            <span className="lh-stat-val">{formatClock(clockMs)}</span>
          </div>
          <div className="lh-stat">
            <span className="lh-stat-label">Earned</span>
            <span className="lh-stat-val">{new Date(lighthouse.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Content */}
        {visited || lighthouse.isGenesis ? (
          <div className="lh-content">
            {lighthouse.content.split('\n').map((line, i) => (
              line === '---'
                ? <hr key={i} className="lh-hr" />
                : line === ''
                ? <div key={i} className="lh-spacer" />
                : <p key={i} className="lh-line">{line}</p>
            ))}
          </div>
        ) : (
          <div className="lh-locked">
            <div className="lh-locked-inner">
              <span className="lh-locked-icon">🔆</span>
              <p className="lh-locked-text">
                Reading a Lighthouse resets its 100-year clock.<br />
                Your visit is permanent. The record remains.
              </p>
              <div className="lh-locked-cost">$0.001 · one visit · forever</div>
              <button
                className="btn btn-primary lh-visit-btn"
                onClick={handleVisit}
                disabled={visiting}
              >
                {visiting
                  ? <><span className="spinner" />Visiting...</>
                  : 'Read the Lighthouse · $0.001'}
              </button>
              {!vessel && (
                <p className="lh-no-vessel">You need a Vessel to visit a Lighthouse.</p>
              )}
            </div>
          </div>
        )}

        {/* Kill mechanic — only for killable non-genesis */}
        {lighthouse.killable && !lighthouse.isGenesis && (
          <div className="lh-kill-zone">
            <button
              className="lh-kill-trigger"
              onClick={() => setShowKillWarning(true)}
            >
              ⚠ Kill switch
            </button>
            {showKillWarning && (
              <div className="lh-kill-warning">
                <p>The kill switch costs $1,000,000. It is executed anonymously via smart contract. No human override. No platform override. No government override.</p>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowKillWarning(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        .lh-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3,10,13,0.92);
          backdrop-filter: blur(8px);
          z-index: 90;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .lh-panel {
          width: 100%;
          max-width: var(--max-w);
          max-height: 92dvh;
          background: var(--bg2);
          border: 1px solid rgba(0,200,180,0.2);
          border-bottom: none;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          overflow-y: auto;
          scrollbar-width: none;
          animation: slideUp 0.28s ease;
          box-shadow: 0 -20px 60px rgba(0,200,180,0.08);
        }
        .lh-panel::-webkit-scrollbar { display: none; }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Genesis ribbon */
        .lh-genesis-ribbon {
          background: rgba(0,200,180,0.08);
          border-bottom: 1px solid rgba(0,200,180,0.15);
          padding: 7px 16px;
          font-size: 9px;
          font-family: var(--font-cast);
          letter-spacing: 0.12em;
          color: var(--teal);
          text-align: center;
          font-weight: 600;
        }

        /* Header */
        .lh-header {
          padding: 20px 16px 16px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        .lh-close {
          position: absolute;
          top: 16px; right: 16px;
          background: none; border: none;
          color: var(--text-dim); cursor: pointer;
          font-size: 16px; padding: 4px;
        }
        .lh-beacon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lh-beacon-glow {
          position: absolute;
          width: 80px; height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,200,180,0.2) 0%, transparent 70%);
          animation: beaconPulse 3s ease-in-out infinite;
        }
        @keyframes beaconPulse {
          0%, 100% { transform: scale(1);   opacity: 0.7; }
          50%       { transform: scale(1.3); opacity: 0.3; }
        }
        .lh-beacon-icon {
          font-size: 32px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 12px rgba(0,200,180,0.8));
        }
        .lh-hook {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.4;
          max-width: 340px;
        }

        /* Stats */
        .lh-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .lh-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          gap: 3px;
          border-right: 1px solid var(--border);
        }
        .lh-stat:last-child { border-right: none; }
        .lh-stat-label {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-ghost);
        }
        .lh-stat-val {
          font-family: var(--font-cast);
          font-size: 13px;
          color: var(--teal);
          font-weight: 600;
        }

        /* Content */
        .lh-content {
          padding: 20px 20px 32px;
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .lh-line {
          font-size: 14px;
          color: var(--text-dim);
          line-height: 1.75;
          margin: 0;
        }
        .lh-spacer { height: 12px; }
        .lh-hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 16px 0;
        }

        /* Locked state */
        .lh-locked {
          padding: 32px 20px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lh-locked-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
          max-width: 280px;
        }
        .lh-locked-icon { font-size: 36px; opacity: 0.3; }
        .lh-locked-text {
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.6;
          margin: 0;
        }
        .lh-locked-cost {
          font-family: var(--font-cast);
          font-size: 11px;
          color: var(--teal);
          letter-spacing: 0.06em;
        }
        .lh-visit-btn { min-width: 240px; height: 46px; }
        .lh-no-vessel {
          font-size: 11px;
          color: var(--burn);
          margin: 0;
        }

        /* Kill zone */
        .lh-kill-zone {
          padding: 12px 16px 20px;
          border-top: 1px solid var(--border);
        }
        .lh-kill-trigger {
          background: none; border: none;
          font-size: 11px; color: var(--text-ghost);
          font-family: var(--font-cast);
          cursor: pointer; padding: 0;
          letter-spacing: 0.04em;
          opacity: 0.5;
          transition: opacity 0.15s;
        }
        .lh-kill-trigger:hover { opacity: 1; color: var(--burn); }
        .lh-kill-warning {
          margin-top: 10px;
          padding: 12px;
          background: var(--burn-dim);
          border: 1px solid rgba(255,64,96,0.2);
          border-radius: var(--radius);
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.6;
        }

        .spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(0,200,180,0.3);
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── LIGHTHOUSE STRIP (inline on Drift) ──────────────────────

export function LighthouseStrip() {
  const { lighthouses } = useStore()
  const [open, setOpen] = useState<Lighthouse | null>(null)

  return (
    <>
      <div className="lh-strip">
        <div className="lh-strip-label">
          <span className="lh-strip-icon">🔆</span>
          Lighthouses
        </div>
        <div className="lh-strip-list">
          {lighthouses.map((lh) => (
            <button
              key={lh.id}
              className={`lh-strip-pill ${lh.isGenesis ? 'genesis' : ''}`}
              onClick={() => setOpen(lh)}
            >
              {lh.isGenesis && <span className="genesis-star">✦</span>}
              <span className="lh-pill-hook">{lh.isGenesis ? 'Genesis' : lh.hook.slice(0, 28) + '…'}</span>
              {lh.isGenesis && <span className="lh-pill-free">free</span>}
            </button>
          ))}
          {lighthouses.length === 0 && (
            <span className="lh-strip-empty">None yet — the tide decides</span>
          )}
        </div>
      </div>

      {open && (
        <LighthouseView lighthouse={open} onClose={() => setOpen(null)} />
      )}

      <style>{`
        .lh-strip {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(0,200,180,0.02);
        }
        .lh-strip-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-ghost);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .lh-strip-icon { font-size: 12px; }
        .lh-strip-list {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .lh-strip-list::-webkit-scrollbar { display: none; }
        .lh-strip-pill {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 100px;
          font-size: 11px;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font-ui);
        }
        .lh-strip-pill:hover {
          border-color: var(--border2);
          color: var(--text);
        }
        .lh-strip-pill.genesis {
          border-color: rgba(0,200,180,0.3);
          background: rgba(0,200,180,0.05);
          color: var(--teal);
        }
        .genesis-star {
          font-size: 9px;
          color: var(--teal);
        }
        .lh-pill-hook { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lh-pill-free {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--teal);
          opacity: 0.7;
        }
        .lh-strip-empty {
          font-size: 11px;
          color: var(--text-ghost);
          font-family: var(--font-cast);
          padding: 4px 0;
          font-style: italic;
        }
      `}</style>
    </>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────

function formatClock(ms: number): string {
  if (ms <= 0) return 'expired'
  const years   = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
  const days    = Math.floor((ms % (365.25 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000))
  if (years > 0) return `${years}y ${days}d`
  const hours   = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
