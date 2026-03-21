import { useState } from 'react'
import { useStore } from '../store/store'
import { FuelBar } from '../components/FuelMeter'
import { DecayBadge } from '../components/DecayBadge'
import { use402 } from '../hooks/use402'

function FuelStrip({ fuel }: { fuel: number }) {
  const low = fuel < 3
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:low?'var(--burn-dim)':'var(--surface)',border:`1px solid ${low?'rgba(255,58,92,0.2)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:'12px'}}>
      <FuelBar fuel={fuel} maxDisplay={100} width={80}/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:low?'var(--burn)':'var(--text-off)',marginLeft:'auto'}}>
        {low ? 'low fuel — draw from Harbor' : 'vessel fuel · $0.03 to sound siren'}
      </span>
    </div>
  )
}

function ago(ts:number){const m=Math.floor((Date.now()-ts)/60000);if(m<60)return`${m}m`;const h=Math.floor(m/60);return h<24?`${h}h`:`${Math.floor(h/24)}d`}

export function SirenPanel() {
  const sirens         = useStore((s) => s.sirens)
  const vessel         = useStore((s) => s.vessel)
  const addSiren       = useStore((s) => s.addSiren)
  const respondToSiren = useStore((s) => s.respondToSiren)
  const debitVessel    = useStore((s) => s.debitVessel)
  const debitHarbor    = useStore((s) => s.debitHarbor)
  const { pay, status } = use402({ amount: 1000 })

  const fuel    = vessel?.fuel ?? 0
  const noFuel  = fuel < 0.1
  const isPending = status === 'pending'

  const [creating,   setCreating]   = useState(false)
  const [hook,       setHook]       = useState('')
  const [responding, setResponding] = useState<string|null>(null)
  const [response,   setResponse]   = useState('')
  const [loading,    setLoading]    = useState(false)
  // Gated state — which sirens have been unlocked to respond
  const [unlocked,   setUnlocked]   = useState<Record<string,boolean>>({})

  const active = sirens.filter(s => !s.isDark)
  const dark   = sirens.filter(s => s.isDark)

  const handleCreate = async () => {
    if (!hook.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    addSiren({ id:`s_${Date.now()}`, hook:hook.trim(), dockId:`d_${Date.now()}`, createdAt:Date.now(), expiresAt:Date.now()+30*24*60*60*1000, responseCount:0, isDark:false, vesselTier:vessel?.tier??'ghost' })
    setHook(''); setLoading(false); setCreating(false)
  }

  const handleUnlockRespond = async (sirenId: string) => {
    // Pay $0.001 to enter the dock and respond
    const receipt = await pay()
    if (receipt) {
      if (fuel >= 0.1) debitVessel(0.1); else debitHarbor(0.1)
      setUnlocked(u => ({ ...u, [sirenId]: true }))
      setResponding(sirenId)
    }
  }

  const handleRespond = async () => {
    if (!responding || !response.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    respondToSiren(responding)
    setResponse(''); setLoading(false); setResponding(null)
    setUnlocked(u => ({ ...u, [responding]: false }))
  }

  // Responding view — shown after payment
  if (responding) {
    const siren = sirens.find(s => s.id === responding)
    return (
      <>
        <button onClick={() => setResponding(null)} style={{background:'none',border:'none',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'11px',cursor:'pointer',padding:0,marginBottom:'10px',display:'flex',alignItems:'center',gap:'5px'}}>
          ← back to sirens
        </button>
        {/* Show hook — this is public */}
        <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',padding:'10px 12px',background:'var(--surface)',borderLeft:'2px solid var(--teal)',borderRadius:'0 var(--radius-lg) var(--radius-lg) 0',marginBottom:'12px',lineHeight:1.5}}>
          {siren?.hook}
        </div>
        <div className="field" style={{marginBottom:'10px'}}>
          <label className="field-label">Your cast <span className="field-cost">sounds into the Dock</span></label>
          <textarea className="input" rows={3} placeholder="Cast into the Dock..." value={response} onChange={e=>setResponse(e.target.value)} autoFocus/>
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(102,85,255,0.5)',marginBottom:'10px',letterSpacing:'0.04em'}}>
          ⬡ sealed · Axiom Tide cannot read this
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.5)',marginBottom:'10px'}}>
          No refunds. No recovery. Sink into the void.
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setResponding(null)}>cancel</button>
          <button className="btn btn-primary" style={{flex:1}} onClick={handleRespond} disabled={loading||!response.trim()}>
            {loading?<><span className="spinner"/>Entering...</>:'Cast into Dock · $0.001'}
          </button>
        </div>
      </>
    )
  }

  // Creating view
  if (creating) return (
    <>
      <FuelStrip fuel={fuel}/>
      <div className="field" style={{marginBottom:'10px'}}>
        <label className="field-label">Broadcast hook <span className="field-cost">visible to all</span></label>
        <textarea className="input" rows={3} placeholder="What are you calling for?" value={hook} onChange={e=>setHook(e.target.value)} maxLength={280} autoFocus/>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',textAlign:'right'}}>{hook.length}/280</div>
      </div>
      <div className="summary" style={{marginBottom:'10px'}}>
        <div className="summary-row"><span>Sound Siren</span><span className="summary-val">$0.03</span></div>
        <div className="summary-row" style={{borderBottom:'none'}}><span>Dock auto-opens</span><span className="summary-val">$0.50</span></div>
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.5)',marginBottom:'10px',lineHeight:1.7}}>
        No refunds. No recovery. Sink into the void.
      </div>
      <div style={{display:'flex',gap:'6px'}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>setCreating(false)}>cancel</button>
        <button className="btn btn-primary" style={{flex:1}} onClick={handleCreate} disabled={loading||!hook.trim()||noFuel}>
          {loading?<><span className="spinner"/>Sounding...</>:'Sound Siren · $0.03'}
        </button>
      </div>
    </>
  )

  // Main list view
  return (
    <>
      <FuelStrip fuel={fuel}/>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.6,marginBottom:'12px',padding:'8px 10px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
        ⚡ Open broadcast. One Siren → one Dock. All responses enter the same sealed room.
      </div>

      {active.map(s => (
        <div key={s.id} style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'8px'}}>
          {/* Header — always visible */}
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
            <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 4px var(--teal)',animation:'livePulse 2.5s ease-in-out infinite',flexShrink:0}}/>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{ago(s.createdAt)}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',marginLeft:'auto'}}>{s.responseCount} in dock</span>
            <DecayBadge expiresAt={s.expiresAt}/>
          </div>

          {/* Hook — always visible */}
          <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',lineHeight:1.5,marginBottom:'10px'}}>
            {s.hook}
          </div>

          {/* Respond — gated behind $0.001 */}
          {noFuel ? (
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--burn)',padding:'6px 8px',background:'var(--burn-dim)',borderRadius:'var(--radius)'}}>
              Vessel fuel empty — draw fuel to respond
            </div>
          ) : (
            <button
              onClick={() => handleUnlockRespond(s.id)}
              disabled={isPending}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 12px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em',transition:'all 0.15s'}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border3)')}
              onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border2)')}>
              {isPending
                ? <><span className="spinner"/>entering dock…</>
                : '↳ respond · enter dock · $0.001'
              }
            </button>
          )}
        </div>
      ))}

      {/* Gone dark */}
      {dark.length > 0 && (
        <>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',margin:'8px 0 6px'}}>Gone dark</div>
          {dark.map(s => (
            <div key={s.id} style={{padding:'10px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'6px',opacity:0.3}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'12px',color:'var(--text-dim)',lineHeight:1.5,marginBottom:'3px',fontStyle:'italic'}}>{s.hook}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{s.responseCount} entered · dock crumbled</div>
            </div>
          ))}
        </>
      )}

      {active.length === 0 && dark.length === 0 && (
        <div style={{textAlign:'center',padding:'32px 16px',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'11px'}}>
          <div style={{fontSize:'28px',marginBottom:'8px',opacity:0.3}}>⚡</div>
          no active sirens
        </div>
      )}

      <button className="btn btn-outline btn-full" style={{marginTop:'8px'}} onClick={()=>setCreating(true)}>
        + Sound a Siren · $0.03
      </button>
    </>
  )
}
