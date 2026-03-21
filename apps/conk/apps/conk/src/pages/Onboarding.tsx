import { useState } from 'react'
import { useStore, type VesselTier } from '../store/store'

type Step = 'welcome' | 'vessel' | 'harbor' | 'done'

const TIER_INFO: Record<VesselTier, { title: string; desc: string; badge: string }> = {
  ghost: {
    title: 'Ghost',
    desc: 'Everything shielded. No trace. Complete anonymity.',
    badge: 'Max privacy',
  },
  shadow: {
    title: 'Shadow',
    desc: 'Selective visibility. You choose what to reveal.',
    badge: 'Balanced',
  },
  open: {
    title: 'Open',
    desc: 'Cast record visible, but vessel identity is still anonymous.',
    badge: 'Transparent',
  },
}

export function Onboarding() {
  const { setOnboarded, setVessel, setHarbor } = useStore()
  const [step, setStep] = useState<Step>('welcome')
  const [tier, setTier] = useState<VesselTier>('ghost')
  const [slots, setSlots] = useState<1 | 5 | 10 | 20>(1)
  const [loading, setLoading] = useState(false)

  const slotOptions: { val: 1 | 5 | 10 | 20; cost: string }[] = [
    { val: 1,  cost: '$0.05' },
    { val: 5,  cost: '$0.10' },
    { val: 10, cost: '$0.20' },
    { val: 20, cost: '$0.50' },
  ]

  const launch = async () => {
    setLoading(true)
    // Simulate contract deploy (STEP 6: call vessel.move::launch + harbor.move::open)
    await new Promise((r) => setTimeout(r, 1000))

    const now = Date.now()
    const yr = 365 * 24 * 60 * 60 * 1000

    setVessel({
      id: `v_${Math.random().toString(36).slice(2, 10)}`,
      tier,
      tempOrPerm: 'perm',
      createdAt: now,
      lastCastAt: null,
      expiresAt: now + yr,
    })
    setHarbor({
      balance: 500,   // $5.00 starter (demo)
      tier: slots,
      lastMovement: now,
      expiresAt: now + yr,
    })
    setOnboarded(true)
    setLoading(false)
  }

  return (
    <div className="onboard-shell">
      <div className="onboard-glow" />

      {step === 'welcome' && (
        <div className="onboard-card" style={{ animationDelay: '0ms' }}>
          <div className="onboard-logo">
          <img src="/src/assets/conk-logo.png" alt="CONK" className="onboard-logo-img" />
        </div>
          <p className="onboard-tagline">
            Anonymous communication<br />for humans and agents.
          </p>
          <div className="onboard-laws">
            <div className="law">
              <span className="law-num">I</span>
              <span>Casts never reach the Harbor. Ever.</span>
            </div>
            <div className="law">
              <span className="law-num">II</span>
              <span>The Harbor knows only that balance decreased.</span>
            </div>
            <div className="law">
              <span className="law-num">III</span>
              <span>The connection between who paid and what was cast does not exist.</span>
            </div>
          </div>
          <button className="btn btn-primary onboard-cta" onClick={() => setStep('vessel')}>
            Launch a Vessel
          </button>
          <p className="onboard-note">No account. No email. No seed phrase.</p>
        </div>
      )}

      {step === 'vessel' && (
        <div className="onboard-card">
          <button className="onboard-back" onClick={() => setStep('welcome')}>← back</button>
          <h2 className="onboard-step-title">Choose your Vessel tier</h2>
          <p className="onboard-step-sub">Tier is fixed at launch and cannot be changed. Choose carefully.</p>
          <div className="tier-grid">
            {(Object.keys(TIER_INFO) as VesselTier[]).map((t) => (
              <button
                key={t}
                className={`tier-card ${tier === t ? 'selected' : ''}`}
                onClick={() => setTier(t)}
              >
                <div className="tier-name">{TIER_INFO[t].title}</div>
                <div className="tier-badge">{TIER_INFO[t].badge}</div>
                <div className="tier-desc">{TIER_INFO[t].desc}</div>
              </button>
            ))}
          </div>
          <button className="btn btn-primary onboard-cta" onClick={() => setStep('harbor')}>
            Continue →
          </button>
        </div>
      )}

      {step === 'harbor' && (
        <div className="onboard-card">
          <button className="onboard-back" onClick={() => setStep('vessel')}>← back</button>
          <h2 className="onboard-step-title">Open your Harbor</h2>
          <p className="onboard-step-sub">The Harbor holds your USDC. It never sees your casts.</p>
          <div className="slot-grid">
            {slotOptions.map(({ val, cost }) => (
              <button
                key={val}
                className={`slot-card ${slots === val ? 'selected' : ''}`}
                onClick={() => setSlots(val)}
              >
                <div className="slot-count">{val}</div>
                <div className="slot-label">vessel{val > 1 ? 's' : ''}</div>
                <div className="slot-cost">{cost}</div>
              </button>
            ))}
          </div>
          <div className="onboard-summary">
            <div className="summary-row">
              <span>Vessel tier</span>
              <span className="summary-val">{TIER_INFO[tier].title}</span>
            </div>
            <div className="summary-row">
              <span>Harbor slots</span>
              <span className="summary-val">{slots}</span>
            </div>
            <div className="summary-row">
              <span>Vessel cost</span>
              <span className="summary-val">$0.01</span>
            </div>
            <div className="summary-row">
              <span>Harbor open cost</span>
              <span className="summary-val">{slotOptions.find(o => o.val === slots)?.cost}</span>
            </div>
          </div>
          <button
            className="btn btn-primary onboard-cta"
            onClick={launch}
            disabled={loading}
          >
            {loading ? 'Launching...' : 'Launch — enter the tide'}
          </button>
        </div>
      )}

      <style>{`
        .onboard-shell {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }
        .onboard-glow {
          position: fixed;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(0,200,180,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .onboard-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .onboard-logo {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onboard-logo-img {
          width: 180px;
          height: 180px;
          object-fit: contain;
          filter: drop-shadow(0 0 24px rgba(0, 191, 238, 0.5)) drop-shadow(0 0 60px rgba(26, 74, 255, 0.2));
          animation: logoFloat 4s ease-in-out infinite;
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px);   filter: drop-shadow(0 0 24px rgba(0,191,238,0.5)) drop-shadow(0 0 60px rgba(26,74,255,0.2)); }
          50%       { transform: translateY(-6px);  filter: drop-shadow(0 0 32px rgba(0,191,238,0.7)) drop-shadow(0 0 80px rgba(26,74,255,0.3)); }
        }
        .onboard-tagline {
          text-align: center;
          color: var(--text-dim);
          font-size: 15px;
          line-height: 1.7;
        }
        .onboard-laws {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .law {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.5;
        }
        .law-num {
          font-family: var(--font-cast);
          color: var(--teal);
          font-size: 11px;
          min-width: 16px;
          margin-top: 1px;
        }
        .onboard-cta {
          width: 100%;
          height: 48px;
          font-size: 15px;
        }
        .onboard-note {
          text-align: center;
          font-size: 11px;
          color: var(--text-ghost);
        }
        .onboard-back {
          background: none;
          border: none;
          color: var(--text-dim);
          font-family: var(--font-ui);
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }
        .onboard-step-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
        }
        .onboard-step-sub {
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.5;
        }
        .tier-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tier-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tier-card:hover { border-color: var(--border2); }
        .tier-card.selected {
          border-color: var(--teal);
          background: var(--teal-dim);
          box-shadow: 0 0 0 1px rgba(0,200,180,0.1);
        }
        .tier-name { font-size: 15px; font-weight: 600; color: var(--text); }
        .tier-badge { font-size: 10px; font-weight: 600; color: var(--teal); letter-spacing: 0.08em; text-transform: uppercase; }
        .tier-desc { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .slot-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .slot-card:hover { border-color: var(--border2); }
        .slot-card.selected {
          border-color: var(--teal);
          background: var(--teal-dim);
        }
        .slot-count { font-size: 22px; font-weight: 700; color: var(--text); }
        .slot-label { font-size: 10px; color: var(--text-dim); }
        .slot-cost { font-size: 11px; color: var(--teal); font-weight: 600; font-family: var(--font-cast); }
        .onboard-summary {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border);
        }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span:first-child { color: var(--text-dim); }
        .summary-val { color: var(--teal); font-weight: 600; font-family: var(--font-cast); }
      `}</style>
    </div>
  )
}
