import { useState } from 'react'
import { type Vessel } from '../store/store'
import { FuelBar } from './FuelMeter'

interface Props {
  vessel: Vessel
  hookTitle: string
  mode: string
  hasSecurityQ: boolean
  autofuel: boolean
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

export function PaywayModal({ vessel, hookTitle, mode, hasSecurityQ, autofuel, onConfirm, onCancel, isPending }: Props) {
  const [step, setStep] = useState<'preview' | 'confirm'>('preview')

  const tierIcon   = vessel.tier === 'ghost' ? '◌' : vessel.tier === 'shadow' ? '◑' : '●'
  const fuelAfter  = Math.max(0, (vessel.fuel - 0.1) / 100)
  const fuelBefore = (vessel.fuel / 100).toFixed(2)
  const isBurn     = mode === 'burn'
  const isEyes     = mode === 'eyes_only'
  const noFuel     = vessel.fuel < 0.1

  return (
    <div style={{position:'fixed',inset:0,zIndex:201,background:'rgba(1,6,8,0.93)',backdropFilter:'blur(16px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'400px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'0 0 48px rgba(0,184,230,0.07)'}}>

        {/* Step indicator */}
        <div style={{padding:'12px 20px',background:'rgba(0,184,230,0.04)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--text)',letterSpacing:'0.04em'}}>
              {step === 'preview' ? 'Locked Signal' : 'Open Signal'}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>
              {step === 'preview' ? 'Review before opening' : 'Confirm to proceed — no reversal'}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:step==='preview'?'var(--teal)':'rgba(0,184,230,0.3)',transition:'all 0.2s'}}/>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:step==='confirm'?'var(--teal)':'rgba(0,184,230,0.3)',transition:'all 0.2s'}}/>
          </div>
        </div>

        <div style={{padding:'18px 20px'}}>

          {/* ── STEP 1: PREVIEW ── */}
          {step === 'preview' && (
            <>
              {/* Signal preview */}
              <div style={{padding:'12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'14px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'6px'}}>Signal</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',lineHeight:1.5,marginBottom:'8px'}}>{hookTitle}</div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',border:'1px solid var(--border)',borderRadius:'100px',padding:'2px 8px'}}>{mode.replace('_',' ')}</span>
                  {isBurn && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--burn)',border:'1px solid var(--burn-line)',borderRadius:'100px',padding:'2px 8px'}}>burns on read</span>}
                  {isEyes && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--eyes)',border:'1px solid var(--eyes-line)',borderRadius:'100px',padding:'2px 8px'}}>map required</span>}
                  {hasSecurityQ && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--sealed)',border:'1px solid rgba(94,79,232,0.3)',borderRadius:'100px',padding:'2px 8px'}}>🔐 gated</span>}
                </div>
              </div>

              {/* Vessel + cost */}
              <div style={{padding:'12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'14px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'8px'}}>Opening through</div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'var(--teal)',flexShrink:0}}>
                    {tierIcon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--teal)',fontWeight:600}}>{vessel.tier} vessel</div>
                    <FuelBar value={vessel.fuel} max={100} width={100} showLabel animate/>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--teal)',fontWeight:700}}>$0.001</div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)'}}>fuel cost</div>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div style={{marginBottom:'16px'}}>
                {[
                  ['Payment', 'Required'],
                  ['Fuel', noFuel ? 'Insufficient' : 'Available'],
                  ['Security', hasSecurityQ ? 'Required after payment' : 'None'],
                  ['Autofuel', autofuel ? 'On — burns automatically' : 'Off — manual confirm'],
                ].map(([k, v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)',fontSize:'10px'}}>
                    <span style={{color:'var(--text-dim)'}}>{k}</span>
                    <span style={{color: k==='Fuel'&&noFuel ? 'var(--burn)' : 'var(--text)'}}>{v}</span>
                  </div>
                ))}
              </div>

              {noFuel ? (
                <div style={{padding:'12px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius-lg)',textAlign:'center',marginBottom:'12px'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'13px',fontWeight:600,color:'var(--burn)',marginBottom:'4px'}}>Insufficient Fuel</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'rgba(255,45,85,0.6)',lineHeight:1.7}}>
                    This vessel cannot complete the crossing. Draw fuel to continue.
                  </div>
                </div>
              ) : null}

              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={onCancel}
                  style={{flex:1,padding:'11px',background:'none',border:'1px solid var(--border2)',borderRadius:'var(--radius)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'11px',cursor:'pointer'}}>
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={noFuel}
                  style={{flex:2,padding:'11px',background:noFuel?'var(--surface2)':'var(--teal)',color:noFuel?'var(--text-off)':'var(--text-inv)',border:'none',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:noFuel?'not-allowed':'pointer',letterSpacing:'0.04em',transition:'all 0.15s'}}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: CONFIRM OPEN ── */}
          {step === 'confirm' && (
            <>
              <div style={{textAlign:'center',padding:'8px 0 16px'}}>
                <div style={{fontSize:'32px',marginBottom:'12px',filter:'drop-shadow(0 0 8px rgba(0,184,230,0.4))'}}>
                  {tierIcon}
                </div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,color:'var(--text)',marginBottom:'8px',letterSpacing:'-0.01em'}}>
                  Open Signal
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.8,marginBottom:'4px'}}>
                  You are about to open this signal through your <span style={{color:'var(--teal)'}}>{vessel.tier} vessel</span>.
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.8}}>
                  Reading requires payment and will consume fuel.
                </div>
              </div>

              {/* Final summary */}
              <div style={{padding:'12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',fontFamily:'var(--font-mono)',fontSize:'10px'}}>
                  <span style={{color:'var(--text-dim)'}}>Signal</span>
                  <span style={{color:'var(--text)',maxWidth:'200px',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{hookTitle.slice(0,40)}{hookTitle.length>40?'…':''}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',fontFamily:'var(--font-mono)',fontSize:'10px'}}>
                  <span style={{color:'var(--text-dim)'}}>Vessel</span>
                  <span style={{color:'var(--teal)'}}>{tierIcon} {vessel.tier}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--font-mono)',fontSize:'10px'}}>
                  <span style={{color:'var(--text-dim)'}}>Fuel after</span>
                  <span style={{color:'var(--text)'}}>${fuelBefore} → ${fuelAfter.toFixed(2)}</span>
                </div>
              </div>

              {isBurn && (
                <div style={{padding:'8px 10px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',marginBottom:'12px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--burn)',lineHeight:1.6}}>
                  🔥 This cast burns after reading. Permanently destroyed.
                </div>
              )}

              <div style={{padding:'8px 10px',background:'rgba(255,45,85,0.04)',border:'1px solid rgba(255,45,85,0.08)',borderRadius:'var(--radius)',marginBottom:'16px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.5)',letterSpacing:'0.04em',lineHeight:1.7,textAlign:'center'}}>
                Fuel will burn when this signal is opened. No refund. No reversal.
              </div>

              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => setStep('preview')}
                  style={{flex:1,padding:'11px',background:'none',border:'1px solid var(--border2)',borderRadius:'var(--radius)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'11px',cursor:'pointer'}}>
                  ← Back
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!!isPending}
                  style={{flex:2,padding:'11px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:700,cursor:isPending?'not-allowed':'pointer',letterSpacing:'0.06em',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:'0 0 16px rgba(0,184,230,0.25)',transition:'all 0.15s',opacity:isPending?0.7:1}}>
                  {isPending
                    ? <><span className="spinner" style={{borderTopColor:'var(--text-inv)',borderColor:'rgba(0,0,0,0.2)'}}/>opening...</>
                    : 'Open Signal'
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
