import { useState } from 'react'
import { useStore, type Siren as SirenType } from '../store/store'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function daysUntil(ts: number): string {
  const diff = ts - Date.now()
  if (diff <= 0) return 'dark'
  return `${Math.ceil(diff / (1000 * 60 * 60 * 24))}d`
}

const TIER_ICON = { ghost: '◌', shadow: '◑', open: '●' }

export function Siren() {
  const { sirens, addSiren, respondToSiren, vessel, setActiveTab } = useStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [respondTarget, setRespondTarget] = useState<SirenType | null>(null)
  const [sirenHook, setSirenHook] = useState('')
  const [castBody, setCastBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [responding, setResponding] = useState(false)

  const activeSirens = sirens.filter((s) => !s.isDark)
  const darkSirens   = sirens.filter((s) =>  s.isDark)

  const handleCreate = async () => {
    if (!sirenHook.trim()) return
    setCreating(true)
    await new Promise((r) => setTimeout(r, 700))
    addSiren({
      id: `siren_${Date.now()}`,
      hook: sirenHook.trim(),
      dockId: `dock_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      responseCount: 0,
      isDark: false,
      vesselTier: vessel?.tier ?? 'ghost',
    })
    setSirenHook('')
    setCreating(false)
    setCreateOpen(false)
  }

  const handleRespond = async () => {
    if (!respondTarget || !castBody.trim()) return
    setResponding(true)
    await new Promise((r) => setTimeout(r, 600))
    respondToSiren(respondTarget.id)
    setCastBody('')
    setResponding(false)
    setRespondTarget(null)
  }

  return (
    <div className="siren-page">
      {/* Header */}
      <header className="siren-header">
        <div>
          <h1 className="siren-title">Siren</h1>
          <span className="siren-subtitle">Open broadcasts. All responses enter one Dock.</span>
        </div>
        <button className="btn btn-teal-outline btn-sm" onClick={() => setCreateOpen(true)}>
          + Sound Siren
        </button>
      </header>

      {/* How it works */}
      <div className="siren-explainer">
        <div className="explainer-row">
          <span className="ex-icon">⚡</span>
          <span>One Siren points at one Dock. All responses enter the same sealed room.</span>
        </div>
        <div className="explainer-row">
          <span className="ex-icon">◌</span>
          <span>$0.03 to sound · goes dark when the Dock crumbles · 30 days from last response</span>
        </div>
      </div>

      {/* Active Sirens */}
      <section className="siren-section">
        <div className="section-label">
          Active <span className="section-count">{activeSirens.length}</span>
        </div>
        <div className="siren-list">
          {activeSirens.map((s) => (
            <SirenCard
              key={s.id}
              siren={s}
              onRespond={() => setRespondTarget(s)}
              onEnterDock={() => setActiveTab('dock')}
            />
          ))}
          {activeSirens.length === 0 && (
            <div className="siren-empty">
              <span style={{ fontSize: 28, opacity: 0.3 }}>⚡</span>
              <p>No active Sirens. Sound one.</p>
            </div>
          )}
        </div>
      </section>

      {/* Dark Sirens */}
      {darkSirens.length > 0 && (
        <section className="siren-section">
          <div className="section-label" style={{ color: 'var(--text-ghost)' }}>
            Gone dark <span className="section-count">{darkSirens.length}</span>
          </div>
          <div className="siren-list">
            {darkSirens.map((s) => (
              <SirenCard key={s.id} siren={s} isDark />
            ))}
          </div>
        </section>
      )}

      {/* Create Siren drawer */}
      {createOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setCreateOpen(false)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <h2 className="drawer-title">Sound a Siren</h2>
            <p className="drawer-sub">A Siren is an open broadcast. It points at one Dock. All vessels who respond enter that Dock.</p>

            <div className="drawer-field">
              <label className="drawer-label">
                Broadcast hook <span className="cost-tag">free to see</span>
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="What are you calling for?"
                value={sirenHook}
                onChange={(e) => setSirenHook(e.target.value)}
                maxLength={280}
              />
              <div className="char-count">{sirenHook.length}/280</div>
            </div>

            <div className="drawer-summary">
              <div className="summary-row">
                <span>Siren cost</span>
                <span className="summary-val">$0.03</span>
              </div>
              <div className="summary-row">
                <span>Dock opens automatically</span>
                <span className="summary-val">$0.50</span>
              </div>
              <div className="summary-row" style={{ borderBottom: 'none' }}>
                <span>Lifespan</span>
                <span className="summary-val">30d from last response</span>
              </div>
            </div>

            <button
              className="btn btn-primary drawer-submit"
              onClick={handleCreate}
              disabled={creating || !sirenHook.trim()}
            >
              {creating ? <><span className="spinner" />Sounding...</> : 'Sound Siren → $0.03'}
            </button>
          </div>
        </div>
      )}

      {/* Respond drawer */}
      {respondTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setRespondTarget(null)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="respond-siren-hook">"{respondTarget.hook}"</div>
            <p className="drawer-sub">
              Your response enters the Dock as a sealed cast. All other respondents are in the same Dock.
            </p>

            <div className="drawer-field">
              <label className="drawer-label">
                Your cast <span className="cost-tag">$0.001 to sound</span>
              </label>
              <textarea
                className="input"
                rows={4}
                placeholder="Cast into the Dock..."
                value={castBody}
                onChange={(e) => setCastBody(e.target.value)}
              />
            </div>

            <div className="respond-dock-note">
              <span style={{ color: 'var(--sealed)', opacity: 0.7 }}>⬡</span>
              Entering Dock · sealed by Seal protocol · Axiom Tide cannot read this
            </div>

            <button
              className="btn btn-primary drawer-submit"
              onClick={handleRespond}
              disabled={responding || !castBody.trim()}
            >
              {responding ? <><span className="spinner" />Entering Dock...</> : 'Enter Dock · $0.001'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .siren-page {
          display: flex;
          flex-direction: column;
          padding-bottom: 80px;
        }

        .siren-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 16px 12px;
          border-bottom: 1px solid var(--border);
          gap: 12px;
        }
        .siren-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.04em;
        }
        .siren-subtitle {
          display: block;
          font-size: 12px;
          color: var(--text-dim);
          margin-top: 2px;
          line-height: 1.4;
        }

        .siren-explainer {
          margin: 12px 16px;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .explainer-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.5;
        }
        .ex-icon {
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .siren-section {
          margin: 4px 16px 16px;
        }
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .section-count {
          background: var(--surface3);
          border-radius: 100px;
          padding: 1px 7px;
          font-size: 10px;
          color: var(--text-dim);
          font-weight: 500;
        }
        .siren-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .siren-empty {
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-ghost);
          font-size: 13px;
          text-align: center;
        }

        /* ── SIREN CARD ─── */
        .siren-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px;
          transition: border-color 0.15s;
          position: relative;
          overflow: hidden;
        }
        .siren-card:not(.dark):hover {
          border-color: var(--border2);
        }
        .siren-card.dark {
          opacity: 0.45;
        }
        .siren-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--teal);
          border-radius: 3px 0 0 3px;
          opacity: 0.5;
        }
        .siren-card.dark::before {
          background: var(--text-ghost);
        }

        .siren-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .siren-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--teal);
          animation: pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,200,180,0.4); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 4px rgba(0,200,180,0); }
        }
        .siren-dark-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-ghost);
          flex-shrink: 0;
        }
        .siren-tier-icon {
          font-size: 11px;
          color: var(--text-ghost);
          margin-left: auto;
        }
        .siren-age {
          font-family: var(--font-cast);
          font-size: 10px;
          color: var(--text-ghost);
        }

        .siren-hook {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          line-height: 1.45;
          margin-bottom: 10px;
        }
        .siren-card.dark .siren-hook {
          color: var(--text-dim);
        }

        .siren-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .siren-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: var(--text-dim);
          font-family: var(--font-cast);
        }
        .siren-stat-val {
          color: var(--teal);
          font-weight: 600;
        }
        .siren-expires {
          font-family: var(--font-cast);
          font-size: 10px;
          color: var(--text-ghost);
        }
        .siren-card-actions {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }

        /* Drawer shared */
        .drawer-title  { font-size: 17px; font-weight: 600; margin-bottom: 6px; }
        .drawer-sub    { font-size: 12px; color: var(--text-dim); line-height: 1.6; margin-bottom: 16px; }
        .drawer-field  { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .drawer-label  {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-dim);
          display: flex; align-items: center; gap: 8px;
        }
        .cost-tag {
          font-size: 10px; font-weight: 400; text-transform: none;
          letter-spacing: 0; color: var(--teal); font-family: var(--font-cast);
        }
        .char-count { font-size: 10px; color: var(--text-ghost); text-align: right; font-family: var(--font-cast); }
        .drawer-summary {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: var(--radius); overflow: hidden; margin-bottom: 14px;
        }
        .summary-row {
          display: flex; justify-content: space-between;
          padding: 9px 14px; border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .summary-row span:first-child { color: var(--text-dim); }
        .summary-val { color: var(--teal); font-weight: 600; font-family: var(--font-cast); }
        .drawer-submit { width: 100%; height: 48px; font-size: 15px; }
        .spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(0,200,180,0.3);
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.6s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .respond-siren-hook {
          font-size: 14px; font-style: italic;
          color: var(--text-dim); line-height: 1.5;
          padding: 10px 12px; margin-bottom: 12px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: var(--radius); border-left: 3px solid var(--teal);
        }
        .respond-dock-note {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: rgba(123,95,255,0.5);
          font-family: var(--font-cast);
          padding: 8px 12px; margin-bottom: 12px;
          background: rgba(123,95,255,0.05);
          border: 1px solid rgba(123,95,255,0.1);
          border-radius: var(--radius);
        }
      `}</style>
    </div>
  )
}

// ─── SIREN CARD ──────────────────────────────────────────────

interface SirenCardProps {
  siren: SirenType
  isDark?: boolean
  onRespond?: () => void
  onEnterDock?: () => void
}

function SirenCard({ siren, isDark = false, onRespond, onEnterDock }: SirenCardProps) {
  return (
    <div className={`siren-card ${isDark ? 'dark' : ''}`}>
      <div className="siren-card-header">
        {isDark
          ? <div className="siren-dark-dot" />
          : <div className="siren-live-dot" />}
        <span className="siren-age">{timeAgo(siren.createdAt)}</span>
        <span className="siren-tier-icon" title={`${siren.vesselTier ?? 'ghost'} vessel`}>
          {TIER_ICON[siren.vesselTier ?? 'ghost']}
        </span>
      </div>

      <p className="siren-hook">{siren.hook}</p>

      <div className="siren-card-footer">
        <div className="siren-stats">
          <span>
            <span className="siren-stat-val">{siren.responseCount}</span> responses
          </span>
          <span>
            {isDark
              ? <span style={{ color: 'var(--text-ghost)' }}>crumbled</span>
              : <><span className="siren-stat-val">{daysUntil(siren.expiresAt)}</span> left</>}
          </span>
        </div>
      </div>

      {!isDark && (
        <div className="siren-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={onRespond}>
            ↳ Respond to Siren
          </button>
          <button className="btn btn-teal-outline btn-sm" onClick={onEnterDock}>
            ⬡ Enter Dock
          </button>
        </div>
      )}
    </div>
  )
}
