import React, { useState } from 'react'
import { useSoundCast } from '../hooks/use402'
import { useStore, type CastMode } from '../store/store'
import { IconCast, IconOpen, IconEye, IconFlame, IconDock } from '../components/Icons'
import { FuelBar } from '../components/FuelMeter'
import { MediaUpload } from '../components/MediaUpload'
import type { WalrusUploadResult } from '../sui/walrus'

const MODES: { id: CastMode; icon: React.ReactNode; label: string; desc: string; note?: string }[] = [
  { id:'open',      icon:<IconOpen size={13}  color="var(--teal)"/>,   label:'Open',      desc:'Anyone reads · can earn Lighthouse' },
  { id:'eyes_only', icon:<IconEye size={13}   color="var(--eyes)"/>,   label:'Eyes Only', desc:'Reader must provide a Dock map',    note:'Reader must know the Dock map to unlock.' },
  { id:'burn',      icon:<IconFlame size={13} color="var(--burn)"/>,   label:'Burn',      desc:'Anyone reads once · gone forever',  note:'Cannot earn a Lighthouse. Permanently deleted after first read.' },
  { id:'sealed',    icon:<IconDock size={13}  color="var(--sealed)"/>, label:'Sealed',    desc:'Specific vessel only · encrypted' },
]

function FuelStrip({ fuel }: { fuel: number }) {
  const low = fuel < 10
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:low?'var(--burn-dim)':'var(--surface)',border:`1px solid ${low?'rgba(255,58,92,0.2)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:'12px'}}>
      <FuelBar value={fuel} max={100} width={80}/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:low?'var(--burn)':'var(--text-off)',marginLeft:'auto'}}>
        {low ? 'low fuel — draw from Harbor' : 'vessel fuel · $0.001 to sound'}
      </span>
    </div>
  )
}

export function CastPanel({ onClose }: { onClose: () => void }) {
  const vessel = useStore((s) => s.vessel)
  const harbor = useStore((s) => s.harbor)
  const { sound, status } = useSoundCast()

  const [hook,  setHook]  = useState('')
  const [body,  setBody]  = useState('')
  const [mode,  setMode]  = useState<CastMode>('open')
  const [dur,      setDur]      = useState<'24h'|'48h'|'7d'>('24h')
  const [step,     setStep]     = useState<'compose'|'confirm'>('compose')
  const [error,    setError]    = useState('')
  const [useSecQ,  setUseSecQ]  = useState(false)
  const [secQ,     setSecQ]     = useState('')
  const [secA,     setSecA]     = useState('')
  const [keywords, setKeywords] = useState('')
  const [useFuture,setUseFuture]= useState(false)
  const [futureHrs,setFutureHrs]= useState(6)
  const [media, setMedia] = useState<WalrusUploadResult | null>(null)
  const [price, setPrice] = useState<number>(1000) // default $0.001
  const [castType, setCastType] = useState<'standard'|'subscription'|'timelocked'>('standard')
  const [subInterval, setSubInterval] = useState<'daily'|'weekly'|'monthly'>('weekly')
  const [lockHrs, setLockHrs] = useState<number>(24)
  const [useCascade, setUseCascade] = useState(false)
  const [cascadeThreshold, setCascadeThreshold] = useState(100)
  const [cascadeHook, setCascadeHook] = useState('')
  const [cascadeBody, setCascadeBody] = useState('')

  const isSending = status === 'pending'
  const isDone    = status === 'success'
  const modeInfo  = MODES.find(m => m.id === mode)!
  const fuel      = vessel?.fuel ?? 0
  const lowFuel   = fuel < 10

  const handleSend = async () => {
    setError('')
    if (lowFuel) { setError('Vessel fuel too low. Draw fuel from Harbor first.'); return }
    const harborBalance = harbor?.balance ?? 0
    const maxPrice = Math.min(1000000000, Math.floor(harborBalance * 100000 * 0.10))
    if (price > maxPrice) { setError('Price exceeds 10% of Harbor balance. Add more USDC to Harbor first.'); return }
    const ok = await sound({
      hook: hook.trim(),
      body: body.trim() || hook.trim(),
      price,
      mode, duration: dur,
      securityQuestion: useSecQ && secQ.trim() ? secQ.trim() : undefined,
      securityAnswer:   useSecQ && secA.trim() ? secA.trim() : undefined,
      keywords: keywords.trim() ? keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
      unlocksAt: castType === 'timelocked' ? Date.now() + lockHrs * 3600000 : useFuture ? Date.now() + futureHrs * 3600000 : undefined,
      castType,
      subInterval: castType === 'subscription' ? subInterval : undefined,
      cascade: useCascade && cascadeHook.trim() ? {
        threshold: cascadeThreshold,
        hook: cascadeHook.trim(),
        body: cascadeBody.trim() || cascadeHook.trim(),
      } : undefined,
    })
    if (ok) { setHook(''); setBody(''); setStep('compose'); setTimeout(onClose, 300) }
    else setError('Failed. Check your Harbor balance.')
  }

  // Confirm screen
  if (step === 'confirm') return (
    <>
      <FuelStrip fuel={fuel}/>
      <div style={{padding:'10px 11px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',marginBottom:'14px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-off)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.08em'}}>Hook</div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text)',lineHeight:1.5}}>{hook}</div>
      </div>
      <div className="summary" style={{marginBottom:'14px'}}>
        <div className="summary-row"><span>Mode</span>
          <span style={{display:'flex',alignItems:'center',gap:'5px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)'}}>
            {modeInfo.icon} {modeInfo.label}
          </span>
        </div>
        <div className="summary-row"><span>Duration</span><span className="summary-val">{dur}</span></div>
        <div className="summary-row"><span>Security gate</span><span className="summary-val">{useSecQ && secQ ? 'enabled' : 'none'}</span></div>
        <div className="summary-row" style={{borderBottom:'none'}}><span>Read price</span><span className="summary-val">${(price/1000000).toFixed(3)}</span></div>
      </div>

      {/* Void notice */}
      <div style={{padding:'8px 10px',background:'rgba(255,45,85,0.04)',border:'1px solid rgba(255,45,85,0.08)',borderRadius:'var(--radius)',marginBottom:'12px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.5)',letterSpacing:'0.04em',lineHeight:1.7}}>
        Signal requires payment. No refunds. Fees sink to the void.
      </div>

      {error && <div style={{padding:'8px 10px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--burn)',marginBottom:'10px'}}>{error}</div>}

      <button data-testid="cast-sound-btn" className="btn btn-primary btn-full" onClick={handleSend} disabled={isSending||isDone||lowFuel}>
        {isSending ? <><span className="spinner"/>Sounding…</> : isDone ? <span data-testid="cast-success">✓ cast sounded</span> : <><IconCast size={12} color="var(--text-inv)"/> Sound it · ${(price/1000000).toFixed(3)}</>}
      </button>
      <button className="btn btn-ghost btn-full" style={{marginTop:'6px'}} onClick={() => setStep('compose')}>← edit</button>
    </>
  )

  // Compose screen
  return (
    <>
      <FuelStrip fuel={fuel}/>

      {vessel && (
        <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 9px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'12px'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'13px'}}>{vessel.class === 'daemon' ? '⚙' : '◌'}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>
            casting as <span style={{color:'var(--teal)'}}>vessel</span>
          </span>
        </div>
      )}

      <div className="field" style={{marginBottom:'11px'}}>
        {/* Cast Type */}
        <label className="field-label">Cast Type</label>
        <div style={{display:'flex',gap:'6px',marginBottom:'12px',flexWrap:'wrap'}}>
          {[
            {id:'standard',    label:'⚡ Standard',     desc:'One-time read'},
            {id:'subscription',label:'♻ Subscription',  desc:'Recurring readers'},
            {id:'timelocked',  label:'⏳ Time-Locked',   desc:'Unlocks at set time'},
          ].map(t => (
            <button key={t.id} onClick={() => setCastType(t.id as any)}
              style={{flex:1,padding:'8px',background:castType===t.id?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${castType===t.id?'var(--teal)':'var(--border)'}`,borderRadius:'var(--radius)',cursor:'pointer',textAlign:'left'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,color:castType===t.id?'var(--teal)':'var(--text)',marginBottom:'2px'}}>{t.label}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Subscription interval */}
        {castType === 'subscription' && (
          <div style={{marginBottom:'12px',padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'8px',letterSpacing:'0.08em',textTransform:'uppercase'}}>Subscription Interval</div>
            <div style={{display:'flex',gap:'6px'}}>
              {(['daily','weekly','monthly'] as const).map(i => (
                <button key={i} onClick={() => setSubInterval(i)}
                  style={{flex:1,padding:'6px',background:subInterval===i?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${subInterval===i?'var(--teal)':'var(--border)'}`,borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:subInterval===i?'var(--teal)':'var(--text-dim)',cursor:'pointer',fontWeight:subInterval===i?600:400}}>
                  {i}
                </button>
              ))}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'6px'}}>
              Readers pay {['daily','weekly','monthly'].includes(subInterval)?'per '+subInterval+' publication':''} · 97% to you
            </div>
          </div>
        )}

        {/* Time-lock settings */}
        {castType === 'timelocked' && (
          <div style={{marginBottom:'12px',padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'8px',letterSpacing:'0.08em',textTransform:'uppercase'}}>Unlock After</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {[1,6,12,24,48,72].map(h => (
                <button key={h} onClick={() => setLockHrs(h)}
                  style={{padding:'6px 10px',background:lockHrs===h?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${lockHrs===h?'var(--teal)':'var(--border)'}`,borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:lockHrs===h?'var(--teal)':'var(--text-dim)',cursor:'pointer',fontWeight:lockHrs===h?600:400}}>
                  {h}h
                </button>
              ))}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'6px'}}>
              Body encrypts until unlock · all paying vessels receive simultaneously
            </div>
          </div>
        )}

        <label className="field-label">Hook <span className="field-cost">free · always visible</span></label>
        <textarea className="input" rows={2} data-testid="cast-hook-input" placeholder="The line they see first..." value={hook} onChange={e=>setHook(e.target.value)} maxLength={160} autoFocus/>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',textAlign:'right'}}>{hook.length}/160</div>
      </div>

      <div className="field" style={{marginBottom:'11px'}}>
        <label className="field-label">Body <span className="field-cost">$0.001 to read</span></label>
        <textarea className="input" rows={4} placeholder="What the tide carries..." value={body} onChange={e=>setBody(e.target.value)}/>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',textAlign:'right'}}>{body.length > 0 ? `${body.length} chars` : 'unlimited'}</div>
      </div>

      {/* Price selector */}
      <div className="field" style={{marginBottom:'11px'}}>
        <label className="field-label">Read Price <span className="field-cost">readers pay this to unlock</span></label>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {[
            {label:'$0.001', value:1000},
            {label:'$0.01',  value:10000},
            {label:'$0.10',  value:100000},
            {label:'$1.00',  value:1000000},
            {label:'$5.00',  value:5000000},
          ].map(p => (
            <button key={p.value} onClick={() => setPrice(p.value)}
              className={`chip ${price===p.value?'active':''}`}
              style={{fontSize:'11px',padding:'4px 10px'}}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'4px'}}>
          You earn 97% · Protocol fee 3%
        </div>
      </div>

      {/* Media attachment */}
      <div className="field" style={{marginBottom:'11px'}}>
        <label className="field-label">Attachment <span className="field-cost">optional · stored on Walrus</span></label>
        <MediaUpload
          onUpload={setMedia}
          onRemove={() => setMedia(null)}
          uploaded={media}
          label="Attach image or file"
        />
      </div>

      <div className="field" style={{marginBottom:'11px'}}>
        <label className="field-label">Mode</label>
        <div className="mode-cards">
          {MODES.map(m => (
            <button key={m.id} className={`mode-card ${mode===m.id?'active':''}`} onClick={() => setMode(m.id)}>
              <span className="mode-card-icon">{m.icon}</span>
              <div><div className="mode-card-name">{m.label}</div><div className="mode-card-desc">{m.desc}</div></div>
            </button>
          ))}
        </div>
        {modeInfo.note && (
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:mode==='burn'?'var(--burn)':'var(--eyes)',marginTop:'6px',lineHeight:1.6,padding:'6px 9px',background:mode==='burn'?'var(--burn-dim)':'var(--eyes-dim)',border:`1px solid ${mode==='burn'?'rgba(255,45,85,0.15)':'rgba(255,176,32,0.15)'}`,borderRadius:'var(--radius)'}}>
            {modeInfo.note}
          </div>
        )}
      </div>

      <div className="field" style={{marginBottom:'12px'}}>
        <label className="field-label">Duration</label>
        <div style={{display:'flex',gap:'5px'}}>
          {(['24h','48h','7d'] as const).map(d => (
            <button key={d} className={`chip ${dur===d?'active':''}`} onClick={() => setDur(d)}>{d}</button>
          ))}
        </div>
      </div>

      {/* Security question — opt in */}
      <div style={{marginBottom:'14px',padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: useSecQ ? '12px' : '0'}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Security gate <span style={{color:'var(--sealed)',fontSize:'9px'}}>optional</span></div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'1px'}}>Reader must answer before access. Wrong answers are not refunded.</div>
          </div>
          <button onClick={() => setUseSecQ(!useSecQ)}
            style={{width:'36px',height:'20px',borderRadius:'100px',background:useSecQ?'var(--sealed)':'var(--surface3)',border:`1px solid ${useSecQ?'var(--sealed)':'var(--border)'}`,position:'relative',cursor:'pointer',transition:'all 0.2s',flexShrink:0,padding:0}}>
            <div style={{width:'14px',height:'14px',background:useSecQ?'var(--bg)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'2px',left:useSecQ?'19px':'2px',transition:'all 0.2s'}}/>
          </button>
        </div>
        {useSecQ && (
          <>
            <div className="field" style={{marginBottom:'8px'}}>
              <label className="field-label">Question</label>
              <input className="input" placeholder="What must the reader know?" value={secQ} onChange={e=>setSecQ(e.target.value)} style={{height:'36px'}}/>
            </div>
            <div className="field">
              <label className="field-label">Answer <span style={{color:'var(--text-off)',fontWeight:400,fontSize:'9px',letterSpacing:0,textTransform:'none'}}>case-insensitive</span></label>
              <input className="input" placeholder="The correct answer..." value={secA} onChange={e=>setSecA(e.target.value)} style={{height:'36px'}}/>
            </div>
          </>
        )}
      </div>

      {/* Keywords — searchable metadata, not shown to readers */}
      <div style={{marginBottom:'14px',padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'4px'}}>
          Keywords <span style={{color:'var(--text-off)',fontSize:'9px'}}>optional · searchable · not shown to readers</span>
        </div>
        <input className="input" style={{height:'34px'}}
          placeholder="privacy, agents, protocol (comma separated)"
          value={keywords} onChange={e=>setKeywords(e.target.value)}/>
      </div>

      {/* Future release */}
      <div style={{marginBottom:'14px',padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:useFuture?'12px':'0'}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Future Release <span style={{color:'var(--text-off)',fontSize:'9px'}}>optional</span></div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'1px'}}>Lock signal until a future time. Shows countdown to readers.</div>
          </div>
          <button onClick={()=>setUseFuture(!useFuture)}
            style={{width:'36px',height:'20px',borderRadius:'100px',background:useFuture?'var(--teal)':'var(--surface3)',border:`1px solid ${useFuture?'var(--teal)':'var(--border)'}`,position:'relative',cursor:'pointer',transition:'all 0.2s',flexShrink:0,padding:0}}>
            <div style={{width:'14px',height:'14px',background:useFuture?'var(--bg)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'2px',left:useFuture?'19px':'2px',transition:'all 0.2s'}}/>
          </button>
        </div>
        {useFuture&&(
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Unlock in</div>
            <div style={{display:'flex',gap:'5px'}}>
              {[1,6,12,24,48].map(h=>(
                <button key={h} className={`chip ${futureHrs===h?'active':''}`} style={{fontSize:'10px'}} onClick={()=>setFutureHrs(h)}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {lowFuel && <div style={{padding:'8px 10px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--burn)',marginBottom:'10px'}}>Vessel fuel empty. Draw fuel from Harbor first.</div>}

      <button data-testid="cast-review-btn" className="btn btn-primary btn-full" onClick={() => { if (!hook.trim()) return; setStep('confirm') }} disabled={!hook.trim()||lowFuel||(useSecQ&&(!secQ.trim()||!secA.trim()))}>
        Review →
      </button>
    </>
  )
}
