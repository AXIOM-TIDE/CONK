import { useState } from 'react'
import { useStore, type VesselTier } from '../store/store'

type Step = 'enter' | 'vessel' | 'fund'

export function Onboarding() {
  const { setOnboarded, setVessel, setHarbor } = useStore()
  const [step, setStep]   = useState<Step>('enter')
  const [tier, setTier]   = useState<VesselTier>('ghost')
  const [loading, setLoading] = useState(false)

  const launch = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    const now = Date.now()
    const yr  = 365 * 24 * 60 * 60 * 1000
    setVessel({ id: `v_${Math.random().toString(36).slice(2,10)}`, tier, tempOrPerm: 'perm', createdAt: now, lastCastAt: null, expiresAt: now + yr })
    setHarbor({ balance: 500, tier: 1, lastMovement: now, expiresAt: now + yr })
    setOnboarded(true)
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px', gap:'0', position:'relative', overflow:'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position:'fixed', top:'-10%', left:'50%', transform:'translateX(-50%)', width:'500px', height:'400px', background:'radial-gradient(ellipse, rgba(0,191,238,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', gap:'28px', animation:'fadeUp 0.4s ease both', zIndex:1 }}>

        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
          <img
            src="/src/assets/conk-logo.png"
            alt="CONK"
            style={{ width:'140px', height:'140px', objectFit:'contain', filter:'drop-shadow(0 0 20px rgba(0,191,238,0.6)) drop-shadow(0 0 50px rgba(26,74,255,0.25))', animation:'float 4s ease-in-out infinite' }}
          />
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-dim)', textAlign:'center', lineHeight:'1.7', maxWidth:'300px' }}>
            Anonymous communication for humans and agents.
          </p>
        </div>

        {step === 'enter' && (
          <>
            {/* The three laws */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                ['I',   'Casts never reach the Harbor. Ever.'],
                ['II',  'The Harbor knows only that balance decreased.'],
                ['III', 'Who paid and what was cast — that link does not exist.'],
              ].map(([n, l]) => (
                <div key={n} style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--teal)', minWidth:'18px', marginTop:'2px', letterSpacing:'0.06em' }}>{n}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:'1.6' }}>{l}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setStep('vessel')}>
              Enter the tide →
            </button>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', textAlign:'center' }}>
              no account · no email · no seed phrase
            </p>
          </>
        )}

        {step === 'vessel' && (
          <>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600, marginBottom:'6px' }}>Choose who you are</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', marginBottom:'14px', lineHeight:'1.6' }}>
                Your vessel is your identity. This cannot be changed after launch.
              </div>
              <div className="mode-cards">
                {([
                  ['ghost',  '◌', 'Ghost',  'Everything hidden. Maximum privacy. No trace.'],
                  ['shadow', '◑', 'Shadow', 'You choose what others see. Middle ground.'],
                  ['open',   '●', 'Open',   'Cast record visible. Still fully anonymous.'],
                ] as const).map(([t, icon, name, desc]) => (
                  <button key={t} className={`mode-card ${tier === t ? 'active' : ''}`} onClick={() => setTier(t)}>
                    <span className="mode-card-icon">{icon}</span>
                    <div>
                      <div className="mode-card-name">{name}</div>
                      <div className="mode-card-desc">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" onClick={() => setStep('enter')} style={{ flex:'0 0 auto' }}>← back</button>
              <button className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={() => setStep('fund')}>Continue →</button>
            </div>
          </>
        )}

        {step === 'fund' && (
          <>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600, marginBottom:'6px' }}>Load your Harbor</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', marginBottom:'14px', lineHeight:'1.6' }}>
                Your Harbor is your wallet. It never sees your casts — only that balance decreased.
              </div>
              <div className="summary">
                <div className="summary-row"><span>Vessel tier</span><span className="summary-val">{tier}</span></div>
                <div className="summary-row"><span>Vessel cost</span><span className="summary-val">$0.01</span></div>
                <div className="summary-row"><span>Harbor open</span><span className="summary-val">$0.05</span></div>
                <div className="summary-row"><span>Cast = read</span><span className="summary-val">$0.001</span></div>
                <div className="summary-row" style={{ borderBottom:'none' }}><span>Starting demo balance</span><span className="summary-val">$5.00 ✓</span></div>
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', marginBottom:'14px', lineHeight:'1.6' }}>
                In production, top up via Transak with card → USDC on Sui. For now you get $5.00 to explore.
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" onClick={() => setStep('vessel')} style={{ flex:'0 0 auto' }}>← back</button>
              <button className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={launch} disabled={loading}>
                {loading ? <><span className="spinner" />Launching vessel...</> : 'Launch → enter the tide'}
              </button>
            </div>
          </>
        )}

      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
      `}</style>
    </div>
  )
}
