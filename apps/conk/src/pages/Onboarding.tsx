import { useState } from 'react'
import { useStore } from '../store/store'

type Step = 'welcome' | 'harbor' | 'vessel' | 'launching'

export function Onboarding() {
  const { setOnboarded, setVessel, setHarbor } = useStore()
  const [step, setStep] = useState<Step>('welcome')

  const yr  = 365*24*60*60*1000
  const launch = async () => {
    setStep('launching')
    await new Promise(r => setTimeout(r, 1200))
    const now = Date.now()
    setVessel({
      id: `v_${Math.random().toString(36).slice(2,10)}`,
      class: 'vessel',
      tempOrPerm: 'perm',
      createdAt: now,
      lastCastAt: null,
      expiresAt: now + yr,
      fuel: 0,
      fuelDrawing: true,
      autoBurn: true,
    })
    setHarbor({ balance: 500, tier: 1, lastMovement: now, expiresAt: now + yr })
    setOnboarded(true)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'24px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-5%', left:'50%', transform:'translateX(-50%)', width:'600px', height:'400px', background:'radial-gradient(ellipse, rgba(0,184,230,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'420px', position:'relative', zIndex:1 }}>

        {step === 'welcome' && (
          <div style={{ textAlign:'center', animation:'rowIn 0.3s ease both' }}>
            <img src="/conk-logo.png" alt="CONK" style={{ width:'100px', height:'100px', objectFit:'contain', filter:'drop-shadow(0 0 20px rgba(0,184,230,0.5))', animation:'float 4s ease-in-out infinite', marginBottom:'28px' }} />
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700, color:'var(--text)', margin:'0 0 10px', letterSpacing:'-0.02em' }}>CONK</h1>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.8, marginBottom:'32px', maxWidth:'320px', margin:'0 auto 32px' }}>
              Anonymous communication for humans and agents.<br/>
              Seven primitives. Three laws. One mission.
            </p>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px', marginBottom:'28px', textAlign:'left' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--teal)', marginBottom:'12px' }}>
                Three Laws
              </div>
              {[
                'Casts never reach the Harbor.',
                'The Harbor knows only that balance decreased.',
                'Vessel → Relay → Cast. Harbor sees none of it.',
              ].map((law, i) => (
                <div key={i} style={{ display:'flex', gap:'10px', marginBottom: i < 2 ? '8px' : '0' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--teal)', flexShrink:0 }}>{'I'.repeat(i+1)}.</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', lineHeight:1.6 }}>{law}</span>
                </div>
              ))}
            </div>
            <button data-testid="onboard-continue" className="btn btn-primary btn-full" onClick={() => setStep('harbor')}>
              Enter the tide →
            </button>
          </div>
        )}

        {step === 'harbor' && (
          <div style={{ animation:'rowIn 0.3s ease both' }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>⚓</div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:600, color:'var(--text)', margin:'0 0 8px' }}>Your Harbor</h2>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', lineHeight:1.7 }}>
                Harbor holds your USDC balance. It never sees a cast. It never sees a vessel. It knows only that balance decreased.
              </p>
            </div>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
              {[
                ['Balance', '$5.00 USDC to start'],
                ['Visibility', 'Balance only — no cast data ever'],
                ['Privacy', 'Harbor and vessel are structurally separated'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:'10px', borderBottom:'1px solid var(--border)', paddingBottom:'8px' }}>
                  <span style={{ color:'var(--text-dim)' }}>{k}</span>
                  <span style={{ color:'var(--teal)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" style={{ flexShrink:0 }} onClick={() => setStep('welcome')}>← back</button>
              <button data-testid="onboard-continue" className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={() => setStep('vessel')}>
                Harbor ready → next
              </button>
            </div>
          </div>
        )}

        {step === 'vessel' && (
          <div style={{ animation:'rowIn 0.3s ease both' }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>◌</div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:600, color:'var(--text)', margin:'0 0 8px' }}>Launch a Vessel</h2>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', lineHeight:1.7 }}>
                Your vessel is your anonymous identity. It draws fuel from Harbor through the Relay. Harbor never sees what your vessel does.
              </p>
            </div>

            {/* Single vessel type — no choice */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--radius-xl)', padding:'18px', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px' }}>
                <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'rgba(0,184,230,0.08)', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', color:'var(--teal)', flexShrink:0 }}>
                  ◌
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:600, color:'var(--teal)', marginBottom:'3px' }}>Vessel</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', lineHeight:1.6 }}>
                    Anonymous by design. No tier. No identity. If compromised — burn it.
                  </div>
                </div>
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', lineHeight:1.8, padding:'10px 12px', background:'var(--surface2)', borderRadius:'var(--radius)', borderLeft:'2px solid var(--teal)' }}>
                All vessels are identical on the network. No metadata distinguishes one from another. Anonymity is not a setting — it is the only mode.
              </div>
            </div>

            <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', padding:'10px 12px', background:'rgba(255,45,85,0.04)', border:'1px solid rgba(255,45,85,0.08)', borderRadius:'var(--radius)', marginBottom:'20px', lineHeight:1.7 }}>
              If your identity is revealed, burn the vessel immediately. A new one can be launched. No history transfers.
            </div>

            <div className="summary" style={{ marginBottom:'16px' }}>
              <div className="summary-row"><span>Vessel cost</span><span className="summary-val">$0.01</span></div>
              <div className="summary-row" style={{ borderBottom:'none' }}><span>Lifespan</span><span className="summary-val">1yr · resets on activity</span></div>
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost" style={{ flexShrink:0 }} onClick={() => setStep('harbor')}>← back</button>
              <button data-testid="onboard-launch" className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={launch}>
                Launch Vessel · $0.01
              </button>
            </div>
          </div>
        )}

        {step === 'launching' && (
          <div style={{ textAlign:'center', animation:'rowIn 0.3s ease both' }}>
            <div style={{ fontSize:'48px', marginBottom:'20px', animation:'float 2s ease-in-out infinite' }}>◌</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--teal)', letterSpacing:'0.08em', marginBottom:'8px' }}>
              launching vessel...
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', lineHeight:1.7 }}>
              vessel → relay → harbor<br/>
              no identity link created
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
