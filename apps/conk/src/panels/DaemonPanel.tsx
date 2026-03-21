/**
 * DaemonPanel — Console for configuring and monitoring the daemon.
 * Human control surface for agent operations.
 * Shore = daemon's fuel source. Policy = auto-approve threshold.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { FuelBar } from '../components/FuelMeter'
import { WreckModal } from '../components/WreckModal'
import { BackButton } from '../components/BackButton'

export function DaemonPanel() {
  const vessel       = useStore((s) => s.vessel)
  const harbor       = useStore((s) => s.harbor)
  const shore        = useStore((s) => s.shore)
  const vessels      = useStore((s) => s.vessels)
  const fundShore    = useStore((s) => s.fundShore)
  const setShore     = useStore((s) => s.setShorePolicy)
  const addVessel    = useStore((s) => s.addVessel)
  const compromiseVessel = useStore((s) => s.compromiseVessel)

  const [showFund,     setShowFund]     = useState(false)
  const [showLaunch,   setShowLaunch]   = useState(false)
  const [showBurn,     setShowBurn]     = useState(false)
  const [fundAmt,      setFundAmt]      = useState(0)
  const [launching,    setLaunching]    = useState(false)

  const daemon = vessels.find(v => v.class === 'daemon')
  const bal    = harbor ? (harbor.balance / 100).toFixed(2) : '0.00'
  const shoreBal = shore ? (shore.balance / 100).toFixed(2) : '0.00'
  const threshold = shore?.policyThreshold ?? 10
  const fuelPct = daemon ? Math.min(100, (daemon.fuel / 100) * 100) : 0

  const launchDaemon = async () => {
    setLaunching(true)
    await new Promise(r => setTimeout(r, 800))
    const now = Date.now()
    addVessel({
      id: `d_${Math.random().toString(36).slice(2,10)}`,
      class: 'daemon',
      tempOrPerm: 'perm',
      createdAt: now,
      lastCastAt: null,
      expiresAt: now + 365*24*60*60*1000,
      fuel: 0,
      fuelDrawing: true,
      autoBurn: true,
    })
    if (!shore) setShore(10) // default $0.10 threshold
    setLaunching(false)
    setShowLaunch(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      {/* Compromise burn modal */}
      {showBurn && daemon && (
        <WreckModal
          title="Compromise Burn"
          description="This daemon vessel will be immediately destroyed. All local context, session state, and identity material will be wiped. A new daemon can be launched after. Use this if identity is exposed or session is compromised."
          confirmLabel="Confirm — burn daemon"
          onConfirm={() => { compromiseVessel(daemon.id); setShowBurn(false) }}
          onCancel={() => setShowBurn(false)}
        />
      )}

      {/* Header */}
      <div style={{padding:'10px 12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-off)',marginBottom:'4px'}}>
          Daemon Console
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.6}}>
          Agents execute protocol actions. You configure, fund, and supervise.
        </div>
      </div>

      {/* No daemon state */}
      {!daemon ? (
        <div style={{textAlign:'center',padding:'28px 16px',background:'var(--surface)',border:'1px dashed var(--border2)',borderRadius:'var(--radius-xl)'}}>
          <div style={{fontSize:'28px',marginBottom:'12px',opacity:0.3}}>⚙</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',marginBottom:'6px'}}>No daemon active</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'16px',maxWidth:'220px',margin:'0 auto 16px'}}>
            A daemon executes protocol actions autonomously. You fund it through Shore and set its policy.
          </div>
          {!showLaunch ? (
            <button onClick={() => setShowLaunch(true)}
              style={{padding:'10px 24px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em'}}>
              ⚙ Launch Daemon
            </button>
          ) : (
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'12px',padding:'10px',background:'var(--surface2)',borderRadius:'var(--radius)',borderLeft:'2px solid var(--teal)'}}>
                The daemon is an agent execution vessel. It shares your Harbor but operates through Shore — a separate fuel source you control. It acts within policy limits you define.
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowLaunch(false)}>cancel</button>
                <button className="btn btn-primary" style={{flex:1}} onClick={launchDaemon} disabled={launching}>
                  {launching ? <><span className="spinner"/>Launching…</> : 'Launch Daemon · $0.01'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Daemon identity */}
          <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'var(--teal)',flexShrink:0}}>
                ⚙
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--teal)'}}>daemon</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'100px',padding:'1px 5px'}}>active</span>
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{daemon.id}</div>
              </div>
              {/* Emergency burn */}
              <button onClick={() => setShowBurn(true)}
                style={{padding:'5px 10px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.04em',flexShrink:0}}>
                compromise burn
              </button>
            </div>

            {/* Daemon fuel */}
            <div style={{background:'var(--surface2)',borderRadius:'var(--radius-lg)',padding:'10px',marginBottom:'0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Vessel Fuel</span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color: fuelPct < 20 ? 'var(--burn)' : 'var(--teal)'}}>
                  ${(daemon.fuel/100).toFixed(2)}
                </span>
              </div>
              <FuelBar value={daemon.fuel} max={100} width={200} showLabel={false} animate/>
            </div>
          </div>

          {/* Shore — daemon fuel source */}
          <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
              <div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'2px'}}>
                  ⚓ Shore
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                  Daemon fuel source · funded from Harbor
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'14px',fontWeight:700,color:'var(--teal)'}}>${shoreBal}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)'}}>USDC</div>
              </div>
            </div>

            {/* Fund Shore */}
            {!showFund ? (
              <button onClick={() => setShowFund(true)}
                style={{width:'100%',padding:'8px',background:'var(--teal-dim)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em'}}>
                + Fund Shore from Harbor · ${bal} available
              </button>
            ) : (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'8px'}}>
                  {[10,25,50,100].map(c => (
                    <button key={c}
                      onClick={() => setFundAmt(c)}
                      disabled={!harbor || harbor.balance < c}
                      style={{padding:'8px 4px',background:fundAmt===c?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${fundAmt===c?'var(--teal)':'var(--border)'}`,borderRadius:'var(--radius)',color:fundAmt===c?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',textAlign:'center',opacity:harbor&&harbor.balance>=c?1:0.4}}>
                      ${(c/100).toFixed(2)}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:'6px'}}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowFund(false); setFundAmt(0) }}>cancel</button>
                  <button className="btn btn-primary" style={{flex:1}} disabled={!fundAmt}
                    onClick={() => { fundShore(fundAmt); setShowFund(false); setFundAmt(0) }}>
                    Fund Shore · ${fundAmt ? (fundAmt/100).toFixed(2) : '0.00'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Policy threshold */}
          <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>
              Policy Threshold
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.6,marginBottom:'12px'}}>
              Daemon auto-approves actions under this amount. Above it, daemon pauses and flags for your review.
            </div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {[1, 5, 10, 25, 50].map(c => (
                <button key={c}
                  onClick={() => setShore(c)}
                  style={{padding:'6px 12px',background:threshold===c?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${threshold===c?'var(--teal)':'var(--border)'}`,borderRadius:'var(--radius)',color:threshold===c?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:threshold===c?600:400,cursor:'pointer',transition:'all 0.12s'}}>
                  ${(c/100).toFixed(2)}
                </button>
              ))}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'8px'}}>
              Current: auto-approve up to <span style={{color:'var(--teal)'}}>${(threshold/100).toFixed(2)}</span> per action
            </div>
          </div>

          {/* Daemon API note */}
          <div style={{padding:'12px',background:'rgba(0,184,230,0.03)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-off)',marginBottom:'6px'}}>
              Daemon API
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.8}}>
              cast · read · enterDock · respond · drawFuel · burn
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'4px'}}>
              import from 'conk/daemon' — agents call these directly
            </div>
          </div>
        </>
      )}
    </div>
  )
}
