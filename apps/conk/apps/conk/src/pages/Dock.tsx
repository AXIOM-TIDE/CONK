import { useState } from 'react'
import { useStore } from '../store/store'

interface MockDock {
  id: string
  name: string
  members: number
  lastCast: number
  expiresAt: number
  castCount: number
  isOwner: boolean
}

const EXAMPLE_DOCKS: MockDock[] = [
  {
    id: 'dock_001',
    name: 'Protocol Alpha',
    members: 7,
    lastCast: Date.now() - 1000 * 60 * 14,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 18,
    castCount: 34,
    isOwner: true,
  },
  {
    id: 'dock_002',
    name: 'Vessel Collective',
    members: 23,
    lastCast: Date.now() - 1000 * 60 * 60 * 2,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 6,
    castCount: 112,
    isOwner: false,
  },
]

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function daysLeft(ts: number): string {
  const days = Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24))
  return `${days}d`
}

export function Dock() {
  const { vessel } = useStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen]     = useState(false)
  const [dockName, setDockName]     = useState('')
  const [joinCode, setJoinCode]     = useState('')
  const [activeDock, setActiveDock] = useState<MockDock | null>(null)

  if (activeDock) {
    return <DockRoom dock={activeDock} onBack={() => setActiveDock(null)} />
  }

  return (
    <div className="dock-page">
      <header className="page-header">
        <h1 className="page-title" style={{ color: 'var(--sealed)' }}>Dock</h1>
        <span className="page-subtitle">Sealed rooms. Private casts.</span>
      </header>

      {/* Info card */}
      <div className="dock-info-card">
        <div className="dock-info-row">
          <span className="dock-info-icon">⬡</span>
          <div>
            <div className="dock-info-title">Sealed by the Seal protocol</div>
            <div className="dock-info-desc">Axiom Tide cannot read what is inside. Nobody can. Max 50 vessels. Crumbles after 30 days of silence.</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="dock-actions">
        <button className="btn btn-teal-outline dock-action-btn" onClick={() => setCreateOpen(true)}>
          <span style={{ fontSize: 16 }}>⬡</span> Open a Dock · $0.50
        </button>
        <button className="btn btn-ghost dock-action-btn" onClick={() => setJoinOpen(true)}>
          Enter via invite
        </button>
      </div>

      {/* Dock list */}
      {EXAMPLE_DOCKS.length > 0 && (
        <section className="dock-section">
          <div className="section-label">Your Docks</div>
          <div className="dock-list">
            {EXAMPLE_DOCKS.map((dock) => (
              <button key={dock.id} className="dock-list-item" onClick={() => setActiveDock(dock)}>
                <div className="dock-item-left">
                  <div className="dock-item-icon">⬡</div>
                  <div className="dock-item-body">
                    <div className="dock-item-name">{dock.name}</div>
                    <div className="dock-item-meta">
                      {dock.members} vessels · {dock.castCount} casts · last cast {timeAgo(dock.lastCast)}
                    </div>
                  </div>
                </div>
                <div className="dock-item-right">
                  {dock.isOwner && <span className="dock-owner-badge">owner</span>}
                  <span className="dock-expire">{daysLeft(dock.expiresAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Create dock drawer */}
      {createOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setCreateOpen(false)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Open a Dock</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
              A sealed private room. Up to 50 vessels. Crumbles after 30 days without a cast.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Dock name</label>
              <input
                className="input"
                placeholder="Give it a name..."
                value={dockName}
                onChange={(e) => setDockName(e.target.value)}
              />
            </div>
            <div className="dock-create-summary">
              <div className="fee-row">
                <span className="fee-action">Dock open</span>
                <span className="fee-cost">$0.50</span>
              </div>
              <div className="fee-row">
                <span className="fee-action">Per cast inside</span>
                <span className="fee-cost">$0.001</span>
              </div>
              <div className="fee-row" style={{ borderBottom: 'none' }}>
                <span className="fee-action">Max vessels</span>
                <span className="fee-cost" style={{ color: 'var(--text-dim)' }}>50</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', height: 48, marginTop: 8 }}
              onClick={() => setCreateOpen(false)}>
              Open Dock (coming soon)
            </button>
          </div>
        </div>
      )}

      {/* Join dock drawer */}
      {joinOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setJoinOpen(false)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Enter a Dock</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
              Paste an invite Siren address to enter a sealed Dock.
            </p>
            <input
              className="input"
              placeholder="Siren address or Dock ID..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <button className="btn btn-primary" style={{ width: '100%', height: 48 }}
              onClick={() => setJoinOpen(false)}>
              Enter Dock (coming soon)
            </button>
          </div>
        </div>
      )}

      <style>{`
        .dock-page {
          display: flex;
          flex-direction: column;
          padding-bottom: 80px;
        }
        .page-header {
          padding: 20px 16px 12px;
          border-bottom: 1px solid var(--border);
        }
        .page-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .page-subtitle {
          font-size: 12px;
          color: var(--text-dim);
        }
        .dock-info-card {
          margin: 16px 16px 0;
          padding: 14px;
          background: rgba(123,95,255,0.06);
          border: 1px solid rgba(123,95,255,0.15);
          border-radius: var(--radius-lg);
        }
        .dock-info-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .dock-info-icon {
          font-size: 20px;
          margin-top: 1px;
          opacity: 0.7;
        }
        .dock-info-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--sealed);
          margin-bottom: 4px;
        }
        .dock-info-desc {
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.5;
        }
        .dock-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
        }
        .dock-action-btn { flex: 1; justify-content: center; }
        .dock-section { margin: 8px 16px 0; }
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }
        .dock-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dock-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          width: 100%;
        }
        .dock-list-item:hover {
          border-color: rgba(123,95,255,0.3);
          background: rgba(123,95,255,0.04);
        }
        .dock-item-left { display: flex; align-items: center; gap: 10px; }
        .dock-item-icon { font-size: 18px; opacity: 0.6; }
        .dock-item-name { font-size: 14px; font-weight: 500; color: var(--text); }
        .dock-item-meta { font-size: 11px; color: var(--text-dim); margin-top: 2px; font-family: var(--font-cast); }
        .dock-item-right { display: flex; align-items: center; gap: 8px; }
        .dock-owner-badge {
          padding: 2px 6px;
          border-radius: 100px;
          background: rgba(123,95,255,0.15);
          border: 1px solid rgba(123,95,255,0.2);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--sealed);
        }
        .dock-expire {
          font-family: var(--font-cast);
          font-size: 11px;
          color: var(--text-ghost);
        }
        .dock-create-summary {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          margin-bottom: 4px;
        }
        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 14px;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .fee-action { color: var(--text-dim); }
        .fee-cost { font-family: var(--font-cast); font-size: 12px; color: var(--teal); }
      `}</style>
    </div>
  )
}

function DockRoom({ dock, onBack }: { dock: MockDock; onBack: () => void }) {
  const [message, setMessage] = useState('')

  const MOCK_MESSAGES = [
    { id: 'm1', tier: 'ghost', text: 'Anyone else notice the tide moving on cast seed_003?', time: Date.now() - 60000 * 4 },
    { id: 'm2', tier: 'shadow', text: 'Watching it closely. 89k reads. Could hit Lighthouse territory.', time: Date.now() - 60000 * 3 },
    { id: 'm3', tier: 'ghost', text: 'Three tides of 500k = earned Lighthouse. Path 2 is underrated.', time: Date.now() - 60000 * 1 },
  ]

  return (
    <div className="dock-room">
      <header className="dock-room-header">
        <button className="back-btn" onClick={onBack}>← Dock</button>
        <div className="dock-room-name">
          <span style={{ color: 'var(--sealed)', opacity: 0.7 }}>⬡</span> {dock.name}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-ghost)', fontFamily: 'var(--font-cast)' }}>
          {dock.members} vessels
        </span>
      </header>

      <div className="dock-messages">
        {MOCK_MESSAGES.map((m) => (
          <div key={m.id} className="dock-msg">
            <div className="dock-msg-tier">
              {m.tier === 'ghost' ? '◌' : '◑'}
            </div>
            <div className="dock-msg-body">
              <p className="dock-msg-text">{m.text}</p>
              <span className="dock-msg-time">{Math.round((Date.now() - m.time) / 60000)}m ago</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dock-compose">
        <input
          className="input dock-input"
          placeholder="Cast into the Dock... · $0.001"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="btn btn-teal-outline" disabled={!message.trim()}>
          Sound
        </button>
      </div>

      <div className="dock-sealed-note">⬡ Sealed by Seal protocol · Axiom Tide cannot read this</div>

      <style>{`
        .dock-room {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - 60px);
          max-height: calc(100dvh - 60px);
        }
        .dock-room-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(3,10,13,0.9);
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .back-btn {
          background: none; border: none;
          color: var(--teal); font-family: var(--font-ui);
          font-size: 13px; cursor: pointer; padding: 0;
        }
        .dock-room-name {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dock-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: none;
        }
        .dock-messages::-webkit-scrollbar { display: none; }
        .dock-msg {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .dock-msg-tier {
          font-size: 14px;
          color: var(--text-ghost);
          margin-top: 2px;
          flex-shrink: 0;
        }
        .dock-msg-body {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg);
          padding: 10px 12px;
          flex: 1;
        }
        .dock-msg-text {
          font-size: 13px;
          color: var(--text);
          line-height: 1.5;
          margin: 0 0 4px;
        }
        .dock-msg-time {
          font-size: 10px;
          color: var(--text-ghost);
          font-family: var(--font-cast);
        }
        .dock-compose {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          background: rgba(3,10,13,0.95);
        }
        .dock-input { flex: 1; }
        .dock-sealed-note {
          padding: 6px 16px 8px;
          font-size: 10px;
          color: rgba(123,95,255,0.4);
          text-align: center;
          font-family: var(--font-cast);
          letter-spacing: 0.04em;
          background: rgba(3,10,13,0.95);
        }
      `}</style>
    </div>
  )
}
