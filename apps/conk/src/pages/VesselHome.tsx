import React, { useState } from 'react'
import { useStore } from '../store/store'
import { DriftFeed } from '../components/DriftFeed'
import { CastPanel } from '../panels/CastPanel'
import { DockPanel } from '../panels/DockPanel'
import { SirenPanel } from '../panels/SirenPanel'
import { LighthouseFeed } from '../components/LighthouseFeed'
import { LighthouseReader } from '../components/LighthouseReader'
import { FuelBar } from '../components/FuelMeter'
import { DaemonPanel } from '../panels/DaemonPanel'
import { GatewayPanel } from '../panels/GatewayPanel'
import { ChannelPanel } from '../panels/ChannelPanel'
import { BountyPanel } from '../panels/BountyPanel'
import { ProtocolPanel } from '../panels/ProtocolPanel'
import { TreasuryStrip } from '../components/TreasuryStrip'
import { DrawFuelModal } from '../components/DrawFuelModal'
import { BackButton } from '../components/BackButton'
import { IconCast, IconDock, IconSiren, IconLighthouse, IconHarbor } from '../components/Icons'
import { BeaconPanel } from '../panels/BeaconPanel'

type VesselTab = 'drift' | 'cast' | 'dock' | 'siren' | 'lighthouse' | 'stored' | 'daemon' | 'gateway' | 'channel' | 'bounty' | 'protocol'| 'beacon'

export function VesselHome({ onBack }: { onBack: () => void }) {
  const vessel     = useStore((s) => s.vessel)
  const harbor     = useStore((s) => s.harbor)
  const toggleDraw    = useStore((s) => s.toggleDrawFuel)
  const toggleAutoBurn = useStore((s) => s.toggleAutoBurn)
  const [tab,          setTab]          = useState<VesselTab>('drift')
  const [lhId,         setLhId]         = useState<string|null>(null)
  const [showDrawFuel, setShowDrawFuel] = useState(false)

  if (!vessel) return null
  if (lhId) return <LighthouseReader id={lhId} onClose={() => setLhId(null)}/>

  const fuel      = vessel.fuel
  const noFuel    = fuel <= 0
  const lowFuel   = fuel > 0 && fuel < 10  // under $0.10
  const critFuel  = fuel > 0 && fuel < 5   // under $0.05
  const drawing    = vessel.fuelDrawing
  const autoBurn   = vessel.autoBurn ?? true
  const tierIcon = vessel.class === 'daemon' ? '⚙' : '◌'
  const balLabel  = harbor ? `$${(harbor.balance/100).toFixed(2)}` : '$0.00'
  const fuelColor = noFuel ? 'var(--burn)' : critFuel ? 'var(--burn)' : lowFuel ? '#FFB020' : 'var(--teal)'

  const fuelStatus = noFuel ? 'dry'
    : critFuel  ? 'critical'
    : lowFuel   ? 'fading'
    : 'stable'

  const TABS: { id:VesselTab; icon:React.ReactNode; label:string; locked:boolean }[] = [
    { id:'drift',      icon:<IconCast size={16} color="currentColor"/>,       label:'Drift',      locked:false },
    { id:'cast',       icon:<IconCast size={16} color="currentColor"/>,       label:'Cast',       locked:noFuel },
    { id:'dock',       icon:<IconDock size={16} color="currentColor"/>,       label:'Dock',       locked:noFuel },
    { id:'siren',      icon:<IconSiren size={16} color="currentColor"/>,      label:'Siren',      locked:noFuel },
    { id:'lighthouse', icon:<IconLighthouse size={16} color="currentColor"/>, label:'Light',      locked:noFuel },
    { id:'stored',     icon:<span style={{fontSize:'13px'}}>⊕</span>,         label:'Stored',     locked:false  },
    { id:'daemon',     icon:<span style={{fontSize:'13px'}}>⚙</span>,         label:'Daemon',     locked:false  },
    { id:'gateway',    icon:<span style={{fontSize:'13px'}}>⊛</span>,         label:'Gateway',    locked:false  },
    { id:'channel',    icon:<span style={{fontSize:'13px'}}>◌◌</span>,        label:'Channels',   locked:false  },
    { id:'bounty',     icon:<span style={{fontSize:'13px'}}>⊕</span>,         label:'Bounties',   locked:false  },
    { id:'protocol',   icon:<span style={{fontSize:'13px'}}>⚡</span>,         label:'Protocol',   locked:false  },
    { id:'beacon', icon:<span style={{fontSize:'13px'}}>⚓</span>, label:'Beacon', locked:false },
  ]

  const handleTabClick = (t: typeof TABS[0]) => {
    if (t.locked) { setShowDrawFuel(true); return }
    setTab(t.id)
  }

  return (
    <div className="shell" data-testid="vessel-home">

      {/* ── TOP BAR ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:'10px',
        padding:'0 14px', height:'52px',
        background:'rgba(3,12,20,0.92)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${noFuel?'rgba(255,45,85,0.25)':'var(--border2)'}`,
        flexShrink:0, zIndex:30,
        position:'relative',
      }}>
        {/* Back */}
        <BackButton onClick={onBack} label="Harbor" testId="back-to-harbor"/>

        {/* Vessel pill */}
        <div style={{
          display:'flex', alignItems:'center', gap:'6px',
          padding:'4px 10px',
          background:'var(--surface)',
          border:`1px solid ${noFuel?'var(--burn-line)':'var(--border2)'}`,
          borderRadius:'var(--radius-lg)', flexShrink:0,
        }}>
          <span style={{fontSize:'14px',color:'var(--teal)'}}>{tierIcon}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--teal)'}}>{vessel.class}</span>
        </div>

        {/* Fuel module — clickable */}
        <div
          onClick={() => setShowDrawFuel(true)} data-testid="fuel-module"
          style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'5px 10px',
            background: noFuel ? 'var(--burn-dim)' : 'var(--surface)',
            border:`1px solid ${noFuel?'var(--burn-line)':critFuel?'rgba(255,45,85,0.2)':lowFuel?'rgba(255,176,32,0.25)':'var(--border)'}`,
            borderRadius:'var(--radius-lg)', cursor:'pointer',
            transition:'all 0.2s',
            boxShadow: noFuel ? '0 0 8px rgba(255,45,85,0.12)' : 'none',
          }}>

          {noFuel ? (
            <>
              <span style={{fontSize:'11px'}}>⚡</span>
              <span data-testid="fuel-dry-label" style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,color:'var(--burn)',letterSpacing:'0.04em'}}>
                dry · tap to charge
              </span>
              <span data-testid="fuel-value" style={{display:'none'}}>$0.00</span>
            </>
          ) : (
            <>
              <FuelBar value={fuel} max={100} width={52} animate/>
              <span data-testid="fuel-value" style={{
                fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,
                color:fuelColor,minWidth:'36px',letterSpacing:'0.02em',
              }}>
                ${(fuel/100).toFixed(2)}
              </span>

              {fuelStatus !== 'stable' && (
                <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:fuelColor,letterSpacing:'0.06em',textTransform:'uppercase',opacity:0.8}}>
                  {fuelStatus}
                </span>
              )}

              <button data-testid="autofuel-toggle"
                onClick={e => { e.stopPropagation(); toggleDraw() }}
                style={{width:'28px',height:'16px',borderRadius:'100px',background:drawing?'var(--teal)':'var(--surface3)',border:`1px solid ${drawing?'var(--teal)':'var(--border)'}`,position:'relative',cursor:'pointer',transition:'all 0.2s',flexShrink:0,padding:0,boxShadow:drawing?'0 0 6px rgba(0,184,230,0.4)':'none'}}>
                <div style={{width:'12px',height:'12px',background:drawing?'var(--bg)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'1px',left:drawing?'14px':'1px',transition:'all 0.2s'}}/>
              </button>
              <span data-testid="autofuel-label" style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:drawing?'var(--teal)':'var(--text-off)',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>
                {drawing?'auto':'manual'}
              </span>
              <div style={{width:'1px',height:'12px',background:'var(--border)',flexShrink:0}}/>
              <button data-testid="autoburn-toggle"
                onClick={e => { e.stopPropagation(); toggleAutoBurn() }}
                style={{width:'28px',height:'16px',borderRadius:'100px',background:autoBurn?'rgba(255,45,85,0.4)':'var(--surface3)',border:`1px solid ${autoBurn?'rgba(255,45,85,0.5)':'var(--border)'}`,position:'relative',cursor:'pointer',transition:'all 0.2s',flexShrink:0,padding:0}}>
                <div style={{width:'12px',height:'12px',background:autoBurn?'var(--burn)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'1px',left:autoBurn?'14px':'1px',transition:'all 0.2s'}}/>
              </button>
              <span data-testid="autoburn-label" style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:autoBurn?'var(--burn)':'var(--text-off)',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>
                {autoBurn?'autoburn':'keep'}
              </span>
            </>
          )}
        </div>

        {/* Harbor balance */}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'5px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',flexShrink:0}}>
          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--teal)',opacity:0.5}}/>
          {balLabel}
        </div>
      </div>

      {/* ── OUT OF FUEL OVERLAY ── */}
      {noFuel && tab !== 'drift' && (
        <div style={{
          position:'absolute',inset:0,zIndex:20,
          background:'rgba(1,6,8,0.90)',backdropFilter:'blur(10px)',
          display:'flex',alignItems:'center',justifyContent:'center',
          padding:'32px',
        }}>
          <div style={{
            maxWidth:'300px',width:'100%',
            background:'var(--surface)',
            border:'1px solid var(--burn-line)',
            borderRadius:'var(--radius-xl)',
            padding:'28px 24px',textAlign:'center',
            boxShadow:'0 0 48px rgba(255,45,85,0.08)',
          }}>
            <div style={{fontSize:'32px',marginBottom:'14px',opacity:0.5}}>⚡</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,color:'var(--burn)',marginBottom:'8px'}}>
              This vessel cannot move.
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.8,marginBottom:'18px'}}>
              No fuel remains. Signals do not open without burn. Draw fuel to continue.
            </div>
            <button onClick={() => setShowDrawFuel(true)} data-testid="fuel-module"
              style={{width:'100%',padding:'12px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em',marginBottom:'8px',boxShadow:'0 0 16px rgba(0,184,230,0.2)'}}>
              ⚡ Draw Fuel
            </button>
            <button onClick={() => setTab('drift')}
              style={{width:'100%',padding:'10px',background:'none',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',cursor:'pointer'}}>
              Return to Drift
            </button>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>

        {/* Sidebar */}
        <nav style={{width:'72px',flexShrink:0,display:'flex',flexDirection:'column',background:'rgba(3,12,20,0.7)',backdropFilter:'blur(16px)',borderRight:'1px solid var(--border)',padding:'8px 5px',gap:'3px',overflowY:'auto',scrollbarWidth:'none'}}>
          {TABS.map(t => (
            <button key={t.id}
              className={`nav-box ${tab===t.id?'active':''}`}
              data-testid={`tab-${t.id}`}
              onClick={() => handleTabClick(t)}
              style={{position:'relative',opacity: t.locked ? 0.5 : 1}}>
              {t.icon}
              <span className="nav-box-label">{t.label}</span>
              {t.locked && (
                <div style={{position:'absolute',top:'4px',right:'4px',width:'5px',height:'5px',borderRadius:'50%',background:'var(--burn)',boxShadow:'0 0 4px var(--burn)'}}/>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {tab==='drift'      && <DriftFeed/>}
          {tab==='cast'       && <FuelGate noFuel={noFuel} onDraw={()=>setShowDrawFuel(true)} onBack={()=>setTab('drift')}><CastPanel onClose={()=>setTab('drift')}/></FuelGate>}
          {tab==='dock'       && <FuelGate noFuel={noFuel} onDraw={()=>setShowDrawFuel(true)} onBack={()=>setTab('drift')}><DockPanel/></FuelGate>}
          {tab==='siren'      && <FuelGate noFuel={noFuel} onDraw={()=>setShowDrawFuel(true)} onBack={()=>setTab('drift')}><SirenPanel/></FuelGate>}
          {tab==='lighthouse' && <FuelGate noFuel={noFuel} onDraw={()=>setShowDrawFuel(true)} onBack={()=>setTab('drift')}><LighthouseFeed onOpen={setLhId} onBack={()=>setTab('drift')}/></FuelGate>}
          {tab==='stored'     && <StoredPanel vesselId={vessel.id} onBack={()=>setTab('drift')}/>}
          {tab==='daemon'     && <FuelGate noFuel={false} onDraw={()=>setShowDrawFuel(true)} onBack={()=>setTab('drift')}><DaemonPanel/></FuelGate>}
          {tab==='gateway'    && <GatewayPanel onBack={()=>setTab('daemon')}/>}
          {tab==='channel'    && <ChannelPanel onBack={()=>setTab('drift')}/>}
          {tab==='bounty'     && <BountyPanel onBack={()=>setTab('drift')}/>}
          {tab==='protocol'   && <ProtocolPanel onBack={()=>setTab('drift')}/>}
          {tab==='beacon'   && <BeaconPanel/>}
        </div>
      </div>

      <TreasuryStrip/>

      {/* ── DRAW FUEL MODAL ── */}
      {showDrawFuel && <DrawFuelModal onClose={() => setShowDrawFuel(false)}/>}
    </div>
  )
}

// ── Fuel gate wrapper ─────────────────────────────────────────
function FuelGate({ children, noFuel, onDraw, onBack }: {
  children: React.ReactNode
  noFuel: boolean
  onDraw: () => void
  onBack: () => void
}) {
  if (!noFuel) {
    return (
      <div style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
        {children}
      </div>
    )
  }
  return (
    <div data-testid="fuel-gate" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px',textAlign:'center'}}>
      <div style={{fontSize:'28px',marginBottom:'14px',opacity:0.4}}>⚡</div>
      <div style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,color:'var(--burn)',marginBottom:'8px'}}>
        Vessel is dry.
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.8,marginBottom:'20px',maxWidth:'220px'}}>
        Fuel is required to cross the payway. Signals do not open without burn.
      </div>
      <button onClick={onDraw}
        style={{padding:'11px 28px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em',boxShadow:'0 0 16px rgba(0,184,230,0.2)',marginBottom:'8px'}}>
        ⚡ Draw Fuel
      </button>
      <button onClick={onBack}
        style={{background:'none',border:'none',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em'}}>
        ← back to drift
      </button>
    </div>
  )
}

// ── Stored panel ──────────────────────────────────────────────
function StoredPanel({ vesselId, onBack }: { vesselId: string; onBack: () => void }) {
  const casts          = useStore((s) => s.driftCasts)
  const burnFromVessel = useStore((s) => s.burnFromVessel)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [view, setView] = useState<'stored'|'earnings'>('stored')

  const stored   = casts.filter(c => (c.storedBy ?? []).includes(vesselId) && !c.burned && !(c.burnedBy ?? []).includes(vesselId))
  const myCasts  = casts.filter(c => c.authorAddress === vesselId && !c.burned)
  const totalEarned = myCasts.reduce((sum, c) => sum + (c.revenueEarned ?? 0), 0)

  return (
    <div data-testid="stored-panel" style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
        <BackButton onClick={onBack} label="Drift"/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          Stored · {stored.length} signal{stored.length!==1?'s':''}
        </span>
      </div>

      {/* Tab switcher */}
      <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
        <button onClick={() => setView('stored')}
          style={{flex:1,padding:'7px',background:view==='stored'?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${view==='stored'?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:view==='stored'?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
          Stored ({stored.length})
        </button>
        <button onClick={() => setView('earnings')}
          style={{flex:1,padding:'7px',background:view==='earnings'?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${view==='earnings'?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:view==='earnings'?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
          Earnings ({myCasts.length} casts)
        </button>
      </div>

      {/* Earnings view */}
      {view === 'earnings' && (
        <div>
          <div style={{padding:'12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'2px'}}>Total Earned</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'20px',fontWeight:700,color:'var(--teal)'}}>${(totalEarned/1000000).toFixed(4)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'2px'}}>{myCasts.length} active casts</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)'}}>97% of all reads</div>
            </div>
          </div>

          {myCasts.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)'}}>
              No casts yet. Sound a cast to start earning.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {myCasts.map(cast => (
                <div key={cast.id} style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',marginBottom:'6px',lineHeight:1.4}}>
                    {cast.hook}
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{cast.tideCount.toLocaleString()} reads</span>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>·</span>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)'}}>price: ${((cast.price ?? 1000)/1000000).toFixed(3)}</span>
                    </div>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:700,color:'var(--teal)'}}>
                      +${((cast.revenueEarned ?? 0)/1000000).toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'stored' && stored.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:'28px',marginBottom:'12px',opacity:0.3}}>⊕</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',marginBottom:'6px'}}>No stored signals</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.7}}>
            After reading a signal, tap Store to save it here.<br/>Stored signals never auto-burn.
          </div>
        </div>
      ) : view === 'stored' ? (
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {stored.map(c => {
            const isExpanded = expanded === c.id
            const modeCls = c.mode === 'burn' ? 'burn' : c.mode === 'eyes_only' ? 'eyes' : 'open'
            return (
              <div key={c.id} data-testid="stored-item" style={{background:'var(--surface)',border:`1px solid ${isExpanded?'var(--border2)':'var(--border)'}`,borderRadius:'var(--radius-lg)',overflow:'hidden',transition:'border-color 0.15s'}}>

                {/* Header — always visible, tap to expand */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                  style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px',cursor:'pointer',background:isExpanded?'rgba(0,184,230,0.03)':'transparent',transition:'background 0.15s'}}>
                  <div className={`cast-mode-dot ${modeCls}`} style={{fontSize:'11px',flexShrink:0}}>
                    {c.mode==='burn'?'🔥':c.mode==='eyes_only'?'👁':'◎'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',lineHeight:1.4,marginBottom:'3px'}}>
                      {c.hook}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',border:'1px solid var(--border3)',borderRadius:'100px',padding:'1px 6px'}}>stored</span>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{c.tideCount.toLocaleString()} reads</span>
                    </div>
                  </div>
                  <div style={{color:'var(--text-off)',transition:'transform 0.2s',transform:isExpanded?'rotate(90deg)':'rotate(0deg)',flexShrink:0}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>

                {/* Expanded — full body + burn button */}
                {isExpanded && (
                  <div style={{padding:'0 12px 12px',borderTop:'1px solid var(--border)',animation:'revealBody 0.18s ease both'}}>
                    {c.body ? (
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',lineHeight:1.7,padding:'12px 0',whiteSpace:'pre-line'}}>
                        {c.body}
                      </div>
                    ) : (
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',padding:'12px 0',fontStyle:'italic'}}>
                        Signal content unavailable — body decrypts on read.
                      </div>
                    )}
                    <div style={{display:'flex',gap:'8px',marginTop:'8px',paddingTop:'10px',borderTop:'1px solid var(--border)'}}>
                      <button
                        onClick={() => { burnFromVessel(c.id, vesselId); setExpanded(null) }}
                        style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em'}}>
                        🔥 burn · remove from vessel
                      </button>
                      <div style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.4)',alignSelf:'center'}}>
                        free · no refund
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      <div style={{marginTop:'16px',padding:'10px',background:'rgba(0,184,230,0.03)',border:'1px solid var(--border)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',lineHeight:1.7,textAlign:'center'}}>
        Stored signals survive until burned or globally wrecked.<br/>
        They do not appear in Drift or auto-burn.
      </div>
    </div>
  )
}
