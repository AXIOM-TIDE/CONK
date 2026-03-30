import { useState } from 'react'
import { useStore, type VesselClass, type Vessel } from '../store/store'
import { FuelBar } from '../components/FuelMeter'
import { DecayBadge } from '../components/DecayBadge'
import { WreckModal } from '../components/WreckModal'
import { TreasuryStrip } from '../components/TreasuryStrip'
import { IconFuel, IconHarbor } from '../components/Icons'

const MAX_VESSELS = 30

interface Props {
  onEnter: () => void
  onBack: () => void
}

export function VesselSelect({ onEnter, onBack }: Props) {
  const vessel         = useStore((s) => s.vessel)
  const vessels        = useStore((s) => s.vessels)
  const harbor         = useStore((s) => s.harbor)
  const chart          = useStore((s) => s.chart)
  const setVessel      = useStore((s) => s.setVessel)
  const setHarbor      = useStore((s) => s.setHarbor)
  const setOnboarded   = useStore((s) => s.setOnboarded)
  const fuelVessel     = useStore((s) => s.fuelVessel)
  const toggleDraw     = useStore((s) => s.toggleDrawFuel)
  const addVessel      = useStore((s) => s.addVessel)
  const setActiveVessel= useStore((s) => s.setActiveVessel)
  const burnVessel     = useStore((s) => s.burnVessel)
  const [launching, setLaunching]     = useState(false)
  const vesselClass: VesselClass = 'vessel'
  const [showNew, setShowNew]         = useState(false)
  const [burnId, setBurnId]           = useState<string|null>(null)
  const [fuelOpen, setFuelOpen]       = useState<string|null>(null)

  const bal        = harbor ? (harbor.balance / 100).toFixed(2) : '0.00'
  const allVessels = vessels.length > 0 ? vessels : (vessel ? [vessel] : [])
  const atCap      = allVessels.length >= MAX_VESSELS
  const recentChart = chart.slice(0, 6)

  const launchVessel = async () => {
    if (atCap) return // hard cap
    setLaunching(true)
    await new Promise(r => setTimeout(r, 900))
    const now = Date.now()
    const v: Vessel = {
      id: `v_${Math.random().toString(36).slice(2,10)}`,
      class: vesselClass, tempOrPerm: 'perm',
      createdAt: now, lastCastAt: null,
      expiresAt: now + 365*24*60*60*1000,
      fuel: 0, fuelDrawing: true, autoBurn: true,
    }
    addVessel(v)
    if (!harbor) setHarbor({ balance:500, tier:1, lastMovement:now, expiresAt:now+365*24*60*60*1000 })
    setLaunching(false)
    setShowNew(false)
  }

  const handleEnter = (v: Vessel) => {
    setActiveVessel(v.id)
    onEnter()
  }

  return (
    <div data-testid="vessel-select" className="shell">
      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 16px',height:'52px',background:'rgba(3,12,20,0.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid var(--border)',flexShrink:0,zIndex:20}}>
        <button data-testid="back-to-harbor" onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'11px',cursor:'pointer',padding:0}}>
          <IconHarbor size={14} color="currentColor"/> Harbor
        </button>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto'}}>
          <img src="/conk-logo.png" alt="CONK" style={{width:'28px',height:'28px',objectFit:'contain',filter:'drop-shadow(0 0 6px rgba(0,184,230,0.7))'}}/>
          <span className="topbar-wordmark">CONK</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',background:'rgba(0,184,230,0.05)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',marginLeft:'auto'}}>
          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 4px var(--teal)'}}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--teal)'}}>${bal}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>USDC</span>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'20px 16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>

        {/* WreckModal */}
        {burnId && (
          <WreckModal
            title="Burn this vessel?"
            description="This vessel and all its casts will be removed permanently. Fuel remaining sinks to the void."
            confirmLabel="Confirm — burn vessel"
            onConfirm={() => { burnVessel(burnId); setBurnId(null) }}
            onCancel={() => setBurnId(null)}
          />
        )}

        {/* Header with vessel count */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-off)'}}>
              Vessels
            </div>
            <div data-testid="vessel-count" style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:atCap?'var(--burn)':'var(--text-dim)',marginTop:'2px'}}>
              {allVessels.length} / {MAX_VESSELS} {atCap && '· capacity reached'}
            </div>
          </div>
          {atCap ? (
            <div data-testid="vessel-cap-warning" style={{padding:'5px 12px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--burn)',letterSpacing:'0.04em'}}>
              Harbor capacity reached
            </div>
          ) : (
            <button data-testid="new-vessel-btn" onClick={() => setShowNew(s => !s)}
              style={{display:'flex',alignItems:'center',gap:'5px',padding:'5px 12px',background:'var(--teal-dim)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
              + new vessel
            </button>
          )}
        </div>

        {/* Launch new vessel form */}
        {showNew && !atCap && (
          <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',padding:'16px',marginBottom:'16px',animation:'rowIn 0.2s ease both'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',marginBottom:'4px'}}>Launch a new vessel</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'14px',lineHeight:1.6}}>Tier cannot change after launch. Each vessel is a separate identity.</div>
            <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',padding:'14px',marginBottom:'14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'24px',color:'var(--teal)'}}>◌</span>
                <div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--teal)',marginBottom:'2px'}}>Vessel</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.6}}>Anonymous by design. All vessels are identical on the network.</div>
                </div>
              </div>
            </div>
            <div className="summary" style={{marginBottom:'12px'}}>
              <div className="summary-row"><span>Cost</span><span className="summary-val">$0.01</span></div>
              <div className="summary-row" style={{borderBottom:'none'}}><span>Lifespan</span><span className="summary-val">1yr · resets on activity</span></div>
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.5)',marginBottom:'10px',lineHeight:1.7}}>
              Fees route to the CONK treasury. No refunds. No recovery.
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowNew(false)}>cancel</button>
              <button className="btn btn-primary" style={{flex:1,height:'40px'}} onClick={launchVessel} disabled={launching}>
                {launching?<><span className="spinner"/>Launching...</>:'Launch vessel · $0.01'}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {allVessels.length === 0 && !showNew && (
          <div style={{background:'var(--surface)',border:'1px dashed var(--border2)',borderRadius:'var(--radius-xl)',padding:'32px',textAlign:'center',marginBottom:'16px'}}>
            <div style={{fontSize:'32px',marginBottom:'12px',opacity:0.3}}>◌</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',marginBottom:'6px'}}>No vessels launched</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',marginBottom:'16px',lineHeight:1.6}}>Your vessel is your identity in the tide.</div>
            <button onClick={()=>setShowNew(true)} style={{padding:'10px 24px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>
              Launch your first vessel
            </button>
          </div>
        )}

        {/* Vessel cards — all vessels */}
        {allVessels.map((v, i) => {
          const isActive  = vessel?.id === v.id
          const fuelPct   = Math.min(100, (v.fuel/100)*100)
          const fuelColor = fuelPct > 40 ? 'var(--teal)' : fuelPct > 15 ? '#FFB020' : 'var(--burn)'
          const tierIcon = v.class === 'daemon' ? '⚙' : '◌'
          const myChart   = chart.slice(0,4)

          return (
            <div key={v.id} style={{background:'var(--surface)',border:`1px solid ${isActive?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius-xl)',marginBottom:'12px',overflow:'hidden',boxShadow:isActive?'0 0 20px rgba(0,184,230,0.07)':'none',animation:`rowIn 0.2s ease ${i*60}ms both`}} data-testid="vessel-card">
              {isActive && <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--teal),transparent)'}}/>}
              <div style={{padding:'16px'}}>

                {/* Header */}
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
                  <div style={{width:'52px',height:'52px',borderRadius:'50%',background:`rgba(0,184,230,${isActive?'0.12':'0.06'})`,border:`1px solid ${isActive?'var(--border3)':'var(--border2)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
                    <span style={{fontSize:'24px',color:'var(--teal)'}}>{tierIcon}</span>
                    {isActive && <div style={{position:'absolute',bottom:'-2px',right:'-2px',width:'12px',height:'12px',borderRadius:'50%',background:'var(--teal)',border:'2px solid var(--bg)',boxShadow:'0 0 6px var(--teal)'}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'13px',fontWeight:600,color:'var(--teal)'}}>{v.class}</span>
                      {isActive && <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'100px',padding:'1px 6px',letterSpacing:'0.06em'}}>ACTIVE</span>}
                    </div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{v.id}</div>
                    <span data-testid="vessel-decay-badge"><DecayBadge expiresAt={v.expiresAt} size="sm"/></span>
                  </div>
                  <button onClick={() => setBurnId(v.id)}
                    style={{padding:'4px 10px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',flexShrink:0}}>
                    burn
                  </button>
                </div>

                {/* Fuel */}
                <div style={{background:'var(--surface2)',borderRadius:'var(--radius-lg)',padding:'12px',marginBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <IconFuel size={11} color="var(--text-dim)"/>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Fuel</span>
                    </div>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:fuelColor}}>${(v.fuel/100).toFixed(2)}</span>
                  </div>
                  <div style={{height:'4px',background:'var(--surface3)',borderRadius:'2px',overflow:'hidden',marginBottom:'10px'}}>
                    <div style={{height:'100%',width:`${fuelPct}%`,background:fuelColor,boxShadow:`0 0 6px ${fuelColor}`,transition:'width 0.5s ease',borderRadius:'2px'}}/>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                    <div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Draw Fuel (Auto)</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:v.fuelDrawing?'var(--teal)':'var(--text-off)',marginTop:'1px'}}>
                        {v.fuelDrawing ? 'On — drawing from Harbor' : 'Off — manual only'}
                      </div>
                    </div>
                    <button onClick={toggleDraw}
                      style={{width:'38px',height:'22px',borderRadius:'100px',background:v.fuelDrawing?'var(--teal)':'var(--surface3)',border:`1px solid ${v.fuelDrawing?'var(--teal)':'var(--border)'}`,position:'relative',cursor:'pointer',transition:'all 0.2s',flexShrink:0,padding:0,boxShadow:v.fuelDrawing?'0 0 8px rgba(0,184,230,0.4)':'none'}}>
                      <div style={{width:'16px',height:'16px',background:v.fuelDrawing?'var(--bg)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'2px',left:v.fuelDrawing?'19px':'2px',transition:'all 0.2s'}}/>
                    </button>
                  </div>
                  {fuelOpen === v.id ? (
                    <>
                      <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
                        {[10,25,50,100].map(c=>(
                          <button key={c} onClick={()=>{fuelVessel(c);setFuelOpen(null)}}
                            disabled={!harbor||harbor.balance<c}
                            style={{flex:1,padding:'8px 4px',background:harbor&&harbor.balance>=c?'var(--teal-dim)':'var(--surface3)',border:`1px solid ${harbor&&harbor.balance>=c?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:harbor&&harbor.balance>=c?'var(--teal)':'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:harbor&&harbor.balance>=c?'pointer':'not-allowed',textAlign:'center'}}>
                            +${(c/100).toFixed(2)}
                          </button>
                        ))}
                      </div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',textAlign:'center',marginBottom:'4px'}}>Harbor: <span style={{color:'var(--teal)'}}>${bal}</span></div>
                      <button onClick={()=>setFuelOpen(null)} style={{width:'100%',background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',padding:'2px'}}>cancel</button>
                    </>
                  ) : (
                    <button onClick={()=>setFuelOpen(v.id)}
                      style={{width:'100%',padding:'7px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                      <IconFuel size={11} color="currentColor"/> Refuel from Harbor
                    </button>
                  )}
                </div>

                {/* Chart */}
                {isActive && myChart.length > 0 && (
                  <div style={{marginBottom:'12px'}}>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-off)',marginBottom:'6px'}}>Chart — visited</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                      {myChart.map(e=>(
                        <div key={e.id+e.visitedAt} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 8px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                          <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',flexShrink:0}}>◎</span>
                          <span style={{fontFamily:'var(--font-display)',fontSize:'11px',color:'var(--text-dim)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{e.name}</span>
                          <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',flexShrink:0}}>{new Date(e.visitedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enter button */}
                <button onClick={()=>handleEnter(v)}
                  data-testid="enter-vessel-btn"
                  style={{width:'100%',padding:'13px',background:isActive?'var(--teal)':'var(--surface2)',color:isActive?'var(--text-inv)':'var(--teal)',border:`1px solid ${isActive?'var(--teal)':'var(--border3)'}`,borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all 0.15s',boxShadow:isActive?'0 0 16px rgba(0,184,230,0.3)':'none'}}>
                  {isActive ? 'Enter Vessel →' : 'Switch & Enter →'}
                </button>
              </div>
            </div>
          )
        })}

        {/* Protocol fees */}
        <div style={{padding:'12px',background:'rgba(0,184,230,0.03)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginTop:'4px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-off)',marginBottom:'8px'}}>Protocol Fees — Abyss</div>
          {[['Read a cast','$0.001'],['Sound a cast','$0.001'],['Return cast','$0.001'],['Open a Dock','$0.50'],['Sound a Siren','$0.03'],['Visit Lighthouse','$0.001']].map(([a,c])=>(
            <div key={a} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)',fontSize:'10px'}}>
              <span style={{color:'var(--text-dim)'}}>{a}</span>
              <span style={{color:'var(--teal)',fontWeight:600}}>{c}</span>
            </div>
          ))}
        </div>

        <div style={{marginTop:'16px',textAlign:'center'}}>
          <button onClick={()=>{setVessel(null);setHarbor(null);setOnboarded(false)}}
            style={{background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',opacity:0.4}}>
            reset (dev)
          </button>
        </div>
      </div>
      <TreasuryStrip/>
    </div>
  )
}
