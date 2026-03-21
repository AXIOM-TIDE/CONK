import { useState } from 'react'
import { useStore, type VesselTier } from '../store/store'
import { IconCast, IconDock, IconSiren, IconLighthouse, IconBurn, IconFuel } from '../components/Icons'
import { FuelBar } from '../components/FuelMeter'
import { CastPanel } from './CastPanel'
import { DockPanel } from './DockPanel'
import { SirenPanel } from './SirenPanel'
import type { SubPanel } from '../App'

interface Props {
  subPanel: SubPanel
  setSubPanel: (s: SubPanel) => void
  onLighthouseOpen: (id: string) => void
}

const ACTIONS: { id: SubPanel; icon: React.ReactNode; label: string; desc: string; canBurn: boolean }[] = [
  { id:'cast',       icon: <IconCast size={16} color="currentColor"/>,       label:'Cast',       desc:'Sound a message into the tide',        canBurn: true  },
  { id:'dock',       icon: <IconDock size={16} color="currentColor"/>,       label:'Dock',       desc:'Sealed private rooms',                 canBurn: true  },
  { id:'siren',      icon: <IconSiren size={16} color="currentColor"/>,      label:'Siren',      desc:'Open broadcast - one Dock',            canBurn: true  },
  { id:'lighthouse', icon: <IconLighthouse size={16} color="currentColor"/>, label:'Lighthouse', desc:'Permanent records earned by the tide', canBurn: false },
]

export function VesselPanel({ subPanel, setSubPanel, onLighthouseOpen }: Props) {
  const vessel       = useStore((s) => s.vessel)
  const harbor       = useStore((s) => s.harbor)
  const chart        = useStore((s) => s.chart)
  const setVessel    = useStore((s) => s.setVessel)
  const setHarbor    = useStore((s) => s.setHarbor)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const fuelVessel   = useStore((s) => s.fuelVessel)
  const [tier, setTier]         = useState<VesselTier>('ghost')
  const [launching, setLaunch]  = useState(false)
  const [burnConfirm, setBurn]  = useState(false)
  const [fuelAmt, setFuelAmt]   = useState(25)

  if (subPanel === 'cast')  return <><BackBtn onClick={() => setSubPanel(null)} label="Vessel"/><CastPanel onClose={() => setSubPanel(null)}/></>
  if (subPanel === 'dock')  return <><BackBtn onClick={() => setSubPanel(null)} label="Vessel"/><DockPanel/></>
  if (subPanel === 'siren') return <><BackBtn onClick={() => setSubPanel(null)} label="Vessel"/><SirenPanel/></>

  if (!vessel) {
    return (
      <>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'14px'}}>
          Your vessel is your identity. Every cast, dock, and siren comes from it. Choose your tier - it cannot change after launch.
        </div>
        <div className="mode-cards" style={{marginBottom:'14px'}}>
          {([['ghost','ghost','Ghost','Everything hidden. Maximum privacy.'],['shadow','shadow','Shadow','You choose what others see.'],['open','open','Open','Cast record visible. Still anonymous.']] as const).map(([t,,name,desc])=>(
            <button key={t} className={`mode-card ${tier===t?'active':''}`} onClick={()=>setTier(t)}>
              <span className="mode-card-icon" style={{fontSize:'18px'}}>{t==='ghost'?'◌':t==='shadow'?'◑':'●'}</span>
              <div><div className="mode-card-name">{name}</div><div className="mode-card-desc">{desc}</div></div>
            </button>
          ))}
        </div>
        <div className="summary" style={{marginBottom:'12px'}}>
          <div className="summary-row"><span>Vessel cost</span><span className="summary-val">$0.01</span></div>
          <div className="summary-row" style={{borderBottom:'none'}}><span>Lifespan</span><span className="summary-val">1yr - resets on activity</span></div>
        </div>
        <button className="btn btn-primary btn-full" onClick={async()=>{
          setLaunch(true)
          await new Promise(r=>setTimeout(r,900))
          const now = Date.now()
          setVessel({id:`v_${Math.random().toString(36).slice(2,10)}`,tier,tempOrPerm:'perm',createdAt:now,lastCastAt:null,expiresAt:now+365*24*60*60*1000,fuel:0,fuelDrawing:false})
          if(!harbor) setHarbor({balance:500,tier:1,lastMovement:now,expiresAt:now+365*24*60*60*1000})
          setLaunch(false)
        }} disabled={launching}>
          {launching?<><span className="spinner"/>Launching...</>:`Launch ${tier} vessel`}
        </button>
      </>
    )
  }

  const days     = Math.ceil((vessel.expiresAt-Date.now())/(1000*60*60*24))
  const tierIcon = vessel.tier==='ghost'?'◌':vessel.tier==='shadow'?'◑':'●'

  return (
    <>
      <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',padding:'13px',marginBottom:'14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <span style={{fontSize:'22px',color:'var(--teal)'}}>{tierIcon}</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'13px',fontWeight:600,color:'var(--teal)'}}>{vessel.tier} vessel</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>{vessel.id} - {days}d left</div>
          </div>
          {!burnConfirm ? (
            <button onClick={()=>setBurn(true)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 8px',background:'var(--burn-dim)',border:'1px solid rgba(255,58,92,0.2)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
              <IconBurn size={11} color="var(--burn)"/>burn
            </button>
          ) : (
            <div style={{display:'flex',gap:'5px'}}>
              <button onClick={()=>{setVessel(null);setHarbor(null);setOnboarded(false)}} style={{padding:'3px 7px',background:'var(--burn)',border:'none',borderRadius:'var(--radius)',color:'#fff',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>confirm</button>
              <button onClick={()=>setBurn(false)} style={{padding:'3px 7px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>cancel</button>
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <IconFuel size={11} color="var(--text-dim)"/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>fuel</span>
          <FuelBar fuel={vessel.fuel} maxDisplay={100} width={100}/>
        </div>
      </div>

      <div style={{marginBottom:'14px'}}>
        <div className="section-hd">Load fuel into vessel</div>
        <div style={{display:'flex',gap:'5px',marginBottom:'8px',flexWrap:'wrap'}}>
          {[10,25,50,100].map(c=>(
            <button key={c} className={`chip ${fuelAmt===c?'active':''}`} style={{fontSize:'10px'}} onClick={()=>setFuelAmt(c)}>
              ${(c/100).toFixed(2)}
            </button>
          ))}
        </div>
        <button className="btn btn-outline btn-full" style={{height:'36px',fontSize:'11px'}} onClick={()=>fuelVessel(fuelAmt)} disabled={!harbor||harbor.balance<fuelAmt}>
          <IconFuel size={12} color="currentColor"/> Draw ${(fuelAmt/100).toFixed(2)} from Harbor
        </button>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'5px',textAlign:'center'}}>
          Harbor balance: <span style={{color:'var(--teal)'}}>{harbor?`$${(harbor.balance/100).toFixed(2)}`:'--'}</span>
        </div>
      </div>

      <div className="section-hd">Actions</div>
      <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'16px'}}>
        {ACTIONS.map(action => (
          <button key={action.id} onClick={() => setSubPanel(action.id)}
            style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',cursor:'pointer',textAlign:'left',width:'100%',transition:'border-color 0.12s',color:'var(--text-dim)'}}
            onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border2)')}
            onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
            <span style={{color:'var(--teal)',flexShrink:0}}>{action.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--text)'}}>{action.label}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginTop:'1px'}}>{action.desc}</div>
            </div>
            {action.canBurn && (
              <button onClick={e=>{e.stopPropagation();if(window.confirm(`Burn ${action.label}?`)){}}}
                style={{display:'flex',alignItems:'center',gap:'3px',padding:'3px 7px',background:'var(--burn-dim)',border:'1px solid rgba(255,58,92,0.15)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',flexShrink:0}}>
                <IconBurn size={10} color="var(--burn)"/>burn
              </button>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-off)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ))}
      </div>

      {chart.length > 0 && (
        <>
          <div className="section-hd">Chart - visited</div>
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            {chart.slice(0,10).map(entry => (
              <div key={entry.id+entry.visitedAt} style={{padding:'7px 10px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'10px',opacity:0.4,flexShrink:0}}>◎</span>
                <span style={{fontFamily:'var(--font-display)',fontSize:'11px',color:'var(--text-dim)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                  {entry.name}
                </span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',flexShrink:0}}>
                  {new Date(entry.visitedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function BackBtn({ onClick, label }: { onClick: ()=>void; label: string }) {
  return (
    <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'11px',cursor:'pointer',padding:'0 0 12px',letterSpacing:'0.04em'}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      {label}
    </button>
  )
}
