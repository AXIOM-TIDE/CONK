/**
 * VesselSelectModal — shown when user tries to open a hook without an active vessel.
 * Lets them select an existing vessel or navigate to launch one.
 */
import { useStore } from '../store/store'

interface Props {
  onSelect: () => void   // vessel is now active, proceed
  onLaunch: () => void   // go to vessel select screen to launch
  onCancel: () => void
}

export function VesselSelectModal({ onSelect, onLaunch, onCancel }: Props) {
  const vessels  = useStore((s) => s.vessels)
  const vessel   = useStore((s) => s.vessel)
  const setActiveVessel = useStore((s) => s.setActiveVessel)

  const allVessels = vessels.length > 0 ? vessels : (vessel ? [vessel] : [])

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(1,6,8,0.93)', backdropFilter:'blur(16px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', animation:'fadeIn 0.15s ease',
    }}>
      <div style={{
        width:'100%', maxWidth:'380px',
        background:'var(--surface)',
        border:'1px solid var(--border2)',
        borderRadius:'var(--radius-xl)',
        overflow:'hidden',
        boxShadow:'0 0 48px rgba(0,184,230,0.08)',
      }}>
        {/* Header */}
        <div style={{
          padding:'14px 20px',
          background:'rgba(0,184,230,0.04)',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--text)',letterSpacing:'0.04em'}}>
              Vessel required
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>
              Drift hooks open through vessels, not directly
            </div>
          </div>
          <button onClick={onCancel} style={{background:'none',border:'none',color:'var(--text-off)',cursor:'pointer',fontSize:'16px',lineHeight:1,padding:'4px'}}>×</button>
        </div>

        <div style={{padding:'16px'}}>

          {allVessels.length > 0 ? (
            <>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'10px'}}>
                Select a vessel to proceed
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'14px'}}>
                {allVessels.map(v => {
                  const isActive  = vessel?.id === v.id
                  const tierIcon = v.class === 'daemon' ? '⚙' : '◌'
                  const fuelPct   = Math.min(100,(v.fuel/100)*100)
                  const fuelColor = fuelPct > 40 ? 'var(--teal)' : fuelPct > 15 ? '#FFB020' : 'var(--burn)'
                  const noFuel    = v.fuel < 0.1

                  return (
                    <button
                      key={v.id}
                      onClick={() => { setActiveVessel(v.id); onSelect() }}
                      disabled={noFuel}
                      style={{
                        display:'flex', alignItems:'center', gap:'12px',
                        padding:'12px 14px',
                        background: isActive ? 'rgba(0,184,230,0.07)' : 'var(--surface2)',
                        border:`1px solid ${isActive ? 'var(--border3)' : 'var(--border)'}`,
                        borderRadius:'var(--radius-lg)',
                        cursor: noFuel ? 'not-allowed' : 'pointer',
                        textAlign:'left', width:'100%',
                        transition:'all 0.15s',
                        opacity: noFuel ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if(!noFuel) (e.currentTarget as HTMLElement).style.borderColor = 'var(--teal)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isActive ? 'var(--border3)' : 'var(--border)' }}
                    >
                      <span style={{fontSize:'20px',color:'var(--teal)',flexShrink:0}}>{tierIcon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                          <span style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--teal)'}}>{v.class}</span>
                          {isActive && <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'100px',padding:'1px 5px'}}>active</span>}
                          {noFuel && <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--burn)',border:'1px solid var(--burn-line)',borderRadius:'100px',padding:'1px 5px'}}>no fuel</span>}
                        </div>
                        {/* Fuel bar */}
                        <div style={{height:'2px',background:'var(--surface3)',borderRadius:'1px',overflow:'hidden',marginBottom:'3px'}}>
                          <div style={{height:'100%',width:`${fuelPct}%`,background:fuelColor,borderRadius:'1px',transition:'width 0.3s'}}/>
                        </div>
                        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:noFuel?'var(--burn)':fuelColor}}>
                          {noFuel ? 'draw fuel from Harbor first · vessel is dry' : `$${(v.fuel/100).toFixed(2)} fuel available`}
                        </div>
                      </div>
                      {!noFuel && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      )}
                    </button>
                  )
                })}
              </div>

              <button onClick={onLaunch}
                style={{width:'100%',padding:'9px',background:'none',border:'1px dashed var(--border2)',borderRadius:'var(--radius)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em',transition:'all 0.12s'}}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border3)')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border2)')}>
                + launch a new vessel
              </button>
            </>
          ) : (
            <>
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:'32px',marginBottom:'12px',opacity:0.3}}>◌</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',marginBottom:'6px'}}>No vessels launched</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.6,marginBottom:'20px'}}>
                  Launch a vessel to read casts. Every read costs $0.001 vessel fuel.
                </div>
                <button onClick={onLaunch}
                  style={{padding:'11px 28px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em',boxShadow:'0 0 16px rgba(0,184,230,0.25)'}}>
                  Launch a Vessel →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
