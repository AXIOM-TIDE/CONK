import { useState } from 'react'
import { useStore } from '../store/store'

export function Harbor() {
  const harbor  = useStore((s) => s.harbor)
  const vessel  = useStore((s) => s.vessel)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const setVesselFn  = useStore((s) => s.setVessel)
  const setHarborFn  = useStore((s) => s.setHarbor)

  const resetOnboarding = () => {
    setVesselFn(null)
    setHarborFn(null)
    setOnboarded(false)
  }
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(500) // cents

  if (!harbor || !vessel) return null

  const balanceUsd  = (harbor.balance / 100).toFixed(2)
  const castsLeft   = Math.floor(harbor.balance / 0.1)
  const expiresDays = Math.ceil((harbor.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
  const fillPct     = Math.min(100, (harbor.balance / 1000) * 100)

  const TIER_INFO = {
    ghost:  { label: 'Ghost',  desc: 'Everything shielded. No trace.', color: 'var(--text-ghost)' },
    shadow: { label: 'Shadow', desc: 'Selective visibility.',           color: 'var(--text-dim)'  },
    open:   { label: 'Open',   desc: 'Cast record visible.',           color: 'var(--teal)'      },
  }
  const tierMeta = TIER_INFO[vessel.tier]

  return (
    <div className="harbor-page">
      {/* Header */}
      <header className="page-header">
        <h1 className="page-title">Harbor</h1>
        <span className="page-subtitle">Your fuel. Your vessel.</span>
      </header>

      {/* Balance card */}
      <div className="harbor-balance-card">
        <div className="balance-label">Harbor Balance</div>
        <div className="balance-amount">
          <span className="balance-currency">$</span>
          <span className="balance-num">{balanceUsd}</span>
          <span className="balance-denom">USDC</span>
        </div>
        <div className="balance-bar-track">
          <div className="balance-bar-fill" style={{ width: `${fillPct}%` }} />
        </div>
        <div className="balance-meta">
          <span>~{castsLeft.toLocaleString()} reads remaining</span>
          <span>Expires in {expiresDays}d</span>
        </div>
        <button className="btn btn-primary topup-btn" onClick={() => setTopUpOpen(true)}>
          Top Up Harbor
        </button>
      </div>

      {/* Three Laws reminder */}
      <div className="harbor-laws">
        <div className="law-row">
          <span className="law-num-sm">I</span>
          <span>Casts never reach the Harbor. Ever.</span>
        </div>
        <div className="law-row">
          <span className="law-num-sm">II</span>
          <span>The Harbor knows only that balance decreased.</span>
        </div>
        <div className="law-row">
          <span className="law-num-sm">III</span>
          <span>The connection between who paid and what was cast does not exist.</span>
        </div>
      </div>

      {/* Vessel card */}
      <section className="harbor-section">
        <div className="section-label">Active Vessel</div>
        <div className="vessel-card">
          <div className="vessel-row">
            <div className="vessel-tier-badge" style={{ borderColor: tierMeta.color, color: tierMeta.color }}>
              {tierMeta.label}
            </div>
            <div className="vessel-id">{vessel.id}</div>
          </div>
          <div className="vessel-desc">{tierMeta.desc}</div>
          <div className="vessel-stats">
            <div className="vessel-stat">
              <span className="stat-label">Type</span>
              <span className="stat-val">{vessel.tempOrPerm === 'perm' ? 'Permanent' : 'Burn after cast'}</span>
            </div>
            <div className="vessel-stat">
              <span className="stat-label">Slots</span>
              <span className="stat-val">{harbor.tier} vessel{harbor.tier > 1 ? 's' : ''}</span>
            </div>
            <div className="vessel-stat">
              <span className="stat-label">Lifespan</span>
              <span className="stat-val">
                {Math.ceil((vessel.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))}d remaining
              </span>
            </div>
            <div className="vessel-stat">
              <span className="stat-label">Last cast</span>
              <span className="stat-val">{vessel.lastCastAt ? 'recently' : 'never'}</span>
            </div>
          </div>
          <div className="vessel-lifespan-bar-track">
            <div
              className="vessel-lifespan-bar"
              style={{ width: `${Math.min(100, ((vessel.expiresAt - Date.now()) / (365 * 24 * 60 * 60 * 1000)) * 100)}%` }}
            />
          </div>
          <div className="vessel-lifespan-note">
            Vessel sinks after 1 year of dormancy · activity resets the clock
          </div>
        </div>
      </section>

      {/* Fee schedule */}
      <section className="harbor-section">
        <div className="section-label">Protocol Fees</div>
        <div className="fee-table">
          {[
            ['Harbor open',      '$0.05 – $0.50'],
            ['Vessel launch',    '$0.01'],
            ['Sound a cast',     '$0.001'],
            ['Read a cast',      '$0.001'],
            ['Open a Dock',      '$0.50'],
            ['Sound a Siren',    '$0.03'],
            ['Visit Lighthouse', '$0.001'],
          ].map(([action, cost]) => (
            <div key={action} className="fee-row">
              <span className="fee-action">{action}</span>
              <span className="fee-cost">{cost}</span>
            </div>
          ))}
          <div className="fee-row fee-abyss">
            <span className="fee-action">All fees →</span>
            <span className="fee-cost abyss">The Abyss · nothing returns</span>
          </div>
        </div>
      </section>

      {/* Dev reset */}
      <div style={{ padding: '8px 16px 24px', textAlign: 'center' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={resetOnboarding}
          style={{ opacity: 0.4, fontSize: 11 }}
        >
          ↺ reset onboarding (dev only)
        </button>
      </div>

      {/* Top up drawer */}
      {topUpOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setTopUpOpen(false)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Top Up Harbor</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
              Purchase USDC via Transak and deposit to your Harbor.
            </p>
            <div className="topup-amounts">
              {[200, 500, 1000, 2000].map((cents) => (
                <button
                  key={cents}
                  className={`topup-amount-btn ${topUpAmount === cents ? 'selected' : ''}`}
                  onClick={() => setTopUpAmount(cents)}
                >
                  ${(cents / 100).toFixed(2)}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-ghost)', marginBottom: 16, fontFamily: 'var(--font-cast)' }}>
              ~{Math.floor((topUpAmount / 100) / 0.001).toLocaleString()} cast reads
            </p>
            <button className="btn btn-primary" style={{ width: '100%', height: 48 }} onClick={() => setTopUpOpen(false)}>
              Purchase via Transak (coming soon)
            </button>
          </div>
        </div>
      )}

      <style>{`
        .harbor-page {
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
          color: var(--teal);
          letter-spacing: 0.06em;
          text-shadow: var(--teal-glow-sm);
        }
        .page-subtitle {
          font-size: 12px;
          color: var(--text-dim);
        }

        .harbor-balance-card {
          margin: 16px;
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }
        .harbor-balance-card::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(0,200,180,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .balance-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .balance-amount {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .balance-currency {
          font-size: 20px;
          color: var(--teal);
          font-family: var(--font-cast);
        }
        .balance-num {
          font-size: 44px;
          font-weight: 700;
          color: var(--teal);
          font-family: var(--font-cast);
          line-height: 1;
          text-shadow: var(--teal-glow-sm);
        }
        .balance-denom {
          font-size: 14px;
          color: var(--text-dim);
          font-family: var(--font-cast);
        }
        .balance-bar-track {
          height: 3px;
          background: var(--surface3);
          border-radius: 2px;
          overflow: hidden;
        }
        .balance-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--teal), rgba(0,200,180,0.5));
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(0,200,180,0.5);
          transition: width 0.6s ease;
        }
        .balance-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-dim);
          font-family: var(--font-cast);
        }
        .topup-btn { width: 100%; }

        .harbor-laws {
          margin: 0 16px 16px;
          padding: 14px 16px;
          background: rgba(0,200,180,0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .law-row {
          display: flex;
          gap: 10px;
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.5;
          align-items: flex-start;
        }
        .law-num-sm {
          font-family: var(--font-cast);
          font-size: 10px;
          color: var(--teal);
          min-width: 14px;
          margin-top: 2px;
        }

        .harbor-section {
          margin: 0 16px 16px;
        }
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .vessel-card {
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .vessel-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .vessel-tier-badge {
          padding: 3px 10px;
          border-radius: 100px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .vessel-id {
          font-family: var(--font-cast);
          font-size: 11px;
          color: var(--text-ghost);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .vessel-desc { font-size: 12px; color: var(--text-dim); }
        .vessel-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .vessel-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-ghost);
        }
        .stat-val {
          font-size: 13px;
          color: var(--text);
          font-family: var(--font-cast);
        }
        .vessel-lifespan-bar-track {
          height: 2px;
          background: var(--surface3);
          border-radius: 1px;
          overflow: hidden;
        }
        .vessel-lifespan-bar {
          height: 100%;
          background: var(--teal);
          border-radius: 1px;
          opacity: 0.5;
        }
        .vessel-lifespan-note {
          font-size: 10px;
          color: var(--text-ghost);
          font-family: var(--font-cast);
          letter-spacing: 0.02em;
        }

        .fee-table {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .fee-row:last-child { border-bottom: none; }
        .fee-action { color: var(--text-dim); }
        .fee-cost {
          font-family: var(--font-cast);
          font-size: 12px;
          color: var(--teal);
        }
        .fee-abyss { background: rgba(0,0,0,0.3); }
        .fee-cost.abyss { color: var(--text-ghost); font-size: 11px; }

        .topup-amounts {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .topup-amount-btn {
          padding: 12px 4px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: var(--font-cast);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .topup-amount-btn:hover { border-color: var(--border2); }
        .topup-amount-btn.selected {
          border-color: var(--teal);
          color: var(--teal);
          background: var(--teal-dim);
        }
      `}</style>
    </div>
  )
}
