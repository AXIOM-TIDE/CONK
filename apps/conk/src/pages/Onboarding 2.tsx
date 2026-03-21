import { useState } from 'react'
import { useStore, type VesselTier } from '../store/store'

type Step = 'welcome' | 'harbor' | 'vessel' | 'launching'

export function Onboarding() {
  const { setOnboarded, setVessel, setHarbor } = useStore()
  const [step, setStep] = useState<Step>('welcome')
  const [tier, setTier] = useState<VesselTier>('ghost')

  const launch = async () => {
    setStep('launching')
    await new Promise(r => setTimeout(r, 1100))
    const now = Date.now()
    const yr  = 365 * 24 * 60 * 60 * 1000
    setVessel({ id:`v_${Math.random().toString(36).slice(2,10)}`, tier, tempOrPerm:'perm', createdAt:now, lastCastAt:null, expiresAt:now+yr })
    setHarbor({ balance:500, tier:1, lastMovement:now, expiresAt:now+yr })
    setOnboarded(true)
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 20px', position:'relative', overflow:'hidden' }}>

      {/* Glow */}
      <div style={{ position:'fixed', top:'-5%', left:'50%', transform:'translateX(-50%)', width:'600px', height:'400px', background:'radial-gradient(ellipse, rgba(0,191,238,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'380px', display:'flex', flexDirection:'column', gap:'24px', zIndex:1, animation:'fadeUp 0.35s ease both' }}>

        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
          <img src="/src/assets/conk-logo.png" alt="CONK" style={{ width:'120px', height:'120px', objectFit:'contain', filter:'drop-shadow(0 0 20px rgba(0,191,238,0.6))', animation:'float 4s ease-in-out infinite' }} />
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', textAlign:'center', lineHeight:'1.7' }}>
            anonymous communication for humans and agents
          </div>
        </div>

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:600, color:'var(--text)', letterSpacing:'0.06em', marginBottom:'2px' }}>
                How it works
              </div>
              {[
                ['🌊', 'Harbor',  'Your wallet. Holds USDC. Never sees a cast.'],
                ['◌',  'Vessel',  'Your identity. Draws fuel from Harbor. Hands it to the Relay.'],
                ['⚡', 'Relay',   'Sits between Vessel and Cast. Issues a receipt. No identity link. Ever.'],
                ['◎',  'Cast',    'Everything is a cast. Sound it. Read it. Burn it.'],
                ['⬡',  'Dock',    'Sealed private room. Sealed by Seal protocol. Max 50 vessels.'],
                ['📡', 'Siren',   'Open broadcast. All responses enter one Dock.'],
              ].map(([icon, name, desc]) => (
                <div key={name} style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'14px', minWidth:'20px', marginTop:'1px', opacity:0.7 }}>{icon}</span>
                  <div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:600, color:'var(--teal)' }}>{name} </span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)' }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setStep('harbor')}>Get started →</button>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', textAlign:'center' }}>
              no account · no email · no seed phrase
            </p>
          </div>
        )}

        {/* ── HARBOR ── */}
        {step === 'harbor' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:600, marginBottom:'4px' }}>
                🌊 Load your Harbor
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text-dim)', lineHeight:'1.7' }}>
                Your Harbor is your wallet. It holds USDC and fuels everything you do. It never sees your casts — only that the balance went down.
              </div>
            </div>
            <div className="summary">
              <div className="summary-row"><span>Harbor open</span><span className="summary-val">$0.05</span></div>
              <div className="summary-row"><span>Sound a cast</span><span className="summary-val">$0.001</span></div>
              <div className="summary-row"><span>Read a cast</span><span className="summary-val">$0.001</span></div>
              <div className="summary-row" style={{ borderBottom:'none' }}><span>Demo starting balance</span><span className="summary-val" style={{ color:'var(--teal)' }}>$5.00 ✓</span></div>
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', lineHeight:'1.6', padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
              In production: top up via card → USDC on Sui via Transak. For now you get $5.00 to explore.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" style={{ flexShrink:0 }} onClick={() => setStep('welcome')}>← back</button>
              <button className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={() => setStep('vessel')}>Harbor ready → next</button>
            </div>
          </div>
        )}

        {/* ── VESSEL ── */}
        {step === 'vessel' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:600, marginBottom:'4px' }}>
                Launch your Vessel
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text-dim)', lineHeight:'1.7' }}>
                Your vessel is your identity. Every cast, dock, and siren comes from it. This tier is permanent — choose carefully.
              </div>
            </div>
            <div className="mode-cards">
              {([
                ['ghost',  '◌', 'Ghost',  'Everything hidden. Maximum privacy. No trace.'],
                ['shadow', '◑', 'Shadow', 'You choose what others see.'],
                ['open',   '●', 'Open',   'Cast record visible. Still fully anonymous.'],
              ] as const).map(([t, icon, name, desc]) => (
                <button key={t} className={`mode-card ${tier === t ? 'active' : ''}`} onClick={() => setTier(t)}>
                  <span className="mode-card-icon" style={{ fontSize:'18px' }}>{icon}</span>
                  <div>
                    <div className="mode-card-name">{name}</div>
                    <div className="mode-card-desc">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="summary">
              <div className="summary-row"><span>Vessel tier</span><span className="summary-val">{tier}</span></div>
              <div className="summary-row" style={{ borderBottom:'none' }}><span>Vessel cost</span><span className="summary-val">$0.01</span></div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" style={{ flexShrink:0 }} onClick={() => setStep('harbor')}>← back</button>
              <button className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={launch}>
                Launch vessel → enter the tide
              </button>
            </div>
          </div>
        )}

        {/* ── LAUNCHING ── */}
        {step === 'launching' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'20px 0' }}>
            <span className="spinner" style={{ width:'24px', height:'24px', borderWidth:'3px' }} />
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text-dim)', letterSpacing:'0.06em' }}>
              launching vessel...
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
    </div>
  )
}
