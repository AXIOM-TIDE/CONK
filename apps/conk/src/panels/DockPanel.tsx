/**
 * DockPanel — Docks owned by this vessel.
 * Correct model: Vessel owns Docks. Dock tracks readers/participants.
 * Docks are NOT vessel containers.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { FuelBar } from '../components/FuelMeter'
import { DecayBadge } from '../components/DecayBadge'
import { WreckModal } from '../components/WreckModal'
import { use402 } from '../hooks/use402'
import { BackButton } from '../components/BackButton'

function FuelStrip({ fuel }: { fuel: number }) {
  const low = fuel < 50
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:low?'var(--burn-dim)':'var(--surface)',border:`1px solid ${low?'rgba(255,58,92,0.2)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:'12px'}}>
      <FuelBar value={fuel} max={100} width={80}/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:low?'var(--burn)':'var(--text-off)',marginLeft:'auto'}}>
        {low ? 'low fuel — draw from Harbor' : 'vessel fuel · $0.50 to open dock'}
      </span>
    </div>
  )
}

// Docks owned by the active vessel
const MY_DOCKS = [
  { id:'d1', name:'Protocol Alpha',    participants:7,  messages:34, expires:Date.now()+1000*60*60*24*18, last:Date.now()-1000*60*12,   mine:true  },
  { id:'d2', name:'Vessel Collective', participants:23, messages:112,expires:Date.now()+1000*60*60*24*6,  last:Date.now()-1000*60*60*2,  mine:false },
]

// Messages inside a dock — gated behind entry fee
const DOCK_MESSAGES: Record<string, {id:string;tier:string;text:string;ts:number}[]> = {
  d1: [
    { id:'m1', tier:'ghost',  text:'Anyone watching cast seed_003? 89k reads and climbing.',        ts:Date.now()-1000*60*4  },
    { id:'m2', tier:'shadow', text:'Three tides of 500k earns a Lighthouse. Path 2 is underrated.', ts:Date.now()-1000*60*3  },
    { id:'m3', tier:'ghost',  text:'The Relay is doing exactly what it was designed to do.',        ts:Date.now()-1000*60*1  },
  ],
  d2: [
    { id:'m4', tier:'open',   text:'New vessels joining this week. Tide is moving.',               ts:Date.now()-1000*60*30 },
    { id:'m5', tier:'shadow', text:'Dock is sealed. Axiom Tide cannot read this. Protocol truth.',  ts:Date.now()-1000*60*10 },
  ],
}

function ago(ts:number){const m=Math.floor((Date.now()-ts)/60000);if(m<60)return`${m}m`;const h=Math.floor(m/60);return h<24?`${h}h`:`${Math.floor(h/24)}d`}

export function DockPanel() {
  const vessel      = useStore((s) => s.vessel)
  const debitVessel = useStore((s) => s.debitVessel)
  const debitHarbor = useStore((s) => s.debitHarbor)
  const { pay, status } = use402({ amount: 100 })

  const fuel      = vessel?.fuel ?? 0
  const isPending = status === 'pending'

  const [active,    setActive]    = useState<typeof MY_DOCKS[0]|null>(null)
  const [unlocked,  setUnlocked]  = useState<Record<string,boolean>>({})
  const [msg,       setMsg]       = useState('')
  const [creating,  setCreating]  = useState(false)
  const [name,      setName]      = useState('')
  const [showWreck, setShowWreck] = useState(false)

  const handleEnterDock = async (dockId: string) => {
    if (unlocked[dockId]) return
    const receipt = await pay()
    if (receipt) {
      if ((vessel?.fuel ?? 0) >= 0.1) debitVessel(0.1); else debitHarbor(0.1)
      setUnlocked(u => ({ ...u, [dockId]: true }))
    }
  }

  // ── Inside a dock ──
  if (active) {
    const messages = DOCK_MESSAGES[active.id] ?? []
    const isOpen   = !!unlocked[active.id]

    return (
      <>
        {showWreck && (
          <WreckModal
            title="Leave this Dock?"
            description={`You are leaving ${active.name}. Your vessel loses access. Cannot be undone.`}
            confirmLabel="Confirm — leave dock"
            onConfirm={() => { setActive(null); setShowWreck(false) }}
            onCancel={() => setShowWreck(false)}
          />
        )}

        <BackButton onClick={() => setActive(null)} label="All Docks"/>

        {/* Dock header */}
        <div style={{padding:'12px',background:'var(--surface)',border:'1px solid rgba(102,85,255,0.2)',borderRadius:'var(--radius-lg)',marginBottom:'12px',marginTop:'8px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'13px',fontWeight:600,color:'var(--sealed)'}}>{active.name}</span>
            <DecayBadge expiresAt={active.expires}/>
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(102,85,255,0.5)',letterSpacing:'0.04em'}}>
            ⬡ sealed · {active.participants} readers · Axiom Tide cannot read this
          </div>
        </div>

        {/* Gated — must pay to enter */}
        {!isOpen ? (
          <div style={{textAlign:'center',padding:'32px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
            <div style={{fontSize:'28px',marginBottom:'12px',opacity:0.3}}>⬡</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',marginBottom:'4px'}}>Sealed room</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'16px',lineHeight:1.6}}>
              Cross the payway to enter. $0.001 debited from vessel fuel.
            </div>
            <button onClick={() => handleEnterDock(active.id)} disabled={isPending || fuel < 0.1}
              style={{padding:'10px 24px',background:'var(--teal)',color:'var(--text-inv)',border:'none',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em',opacity:fuel<0.1?0.5:1}}>
              {isPending ? <><span className="spinner" style={{borderTopColor:'var(--text-inv)',borderColor:'rgba(0,0,0,0.2)'}}/>crossing...</> : 'Cross payway · $0.001'}
            </button>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.4)',marginTop:'8px'}}>
              Fees route to the CONK treasury. No refunds. No recovery.
            </div>
          </div>
        ) : (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'12px'}}>
              {messages.map(m => (
                <div key={m.id} style={{display:'flex',gap:'8px'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--text-off)',marginTop:'2px',flexShrink:0}}>
                    {m.tier==='ghost'?'◌':m.tier==='shadow'?'◑':'●'}
                  </span>
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'0 var(--radius-lg) var(--radius-lg) var(--radius-lg)',padding:'8px 10px',flex:1}}>
                    <p style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',margin:0,lineHeight:1.6}}>{m.text}</p>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{ago(m.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              <input className="input" style={{flex:1}} placeholder="Cast into dock... · $0.001"
                value={msg} onChange={e=>setMsg(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&msg.trim()&&setMsg('')}/>
              <button className="btn btn-primary btn-sm" disabled={!msg.trim()} onClick={()=>setMsg('')}>↑</button>
            </div>
          </>
        )}

        <button onClick={() => setShowWreck(true)}
          style={{marginTop:'12px',width:'100%',padding:'7px',background:'none',border:'1px solid rgba(255,45,85,0.1)',borderRadius:'var(--radius)',color:'rgba(255,45,85,0.4)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.06em'}}>
          leave dock
        </button>
      </>
    )
  }

  // ── Dock list ──
  return (
    <>
      <FuelStrip fuel={fuel}/>

      {/* Ownership clarification */}
      <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.6,marginBottom:'12px',padding:'8px 10px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
        ⬡ Your vessel's sealed rooms. Each dock is owned by this vessel. Readers enter through the payway.
      </div>

      {MY_DOCKS.length === 0 && (
        <div style={{textAlign:'center',padding:'32px 16px',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'11px'}}>
          <div style={{fontSize:'28px',marginBottom:'8px',opacity:0.3}}>⬡</div>
          no docks yet — open one below
        </div>
      )}

      {MY_DOCKS.map(d => (
        <button key={d.id} onClick={() => setActive(d)}
          style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px',background:'var(--surface)',border:`1px solid ${unlocked[d.id]?'var(--sealed)':'var(--border)'}`,borderRadius:'var(--radius-lg)',cursor:'pointer',textAlign:'left',width:'100%',marginBottom:'8px',transition:'border-color 0.12s'}}
          onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border2)')}
          onMouseLeave={e=>(e.currentTarget.style.borderColor=unlocked[d.id]?'var(--sealed)':'var(--border)')}>
          <span style={{fontSize:'18px',opacity:0.5,flexShrink:0}}>⬡</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--text)',marginBottom:'2px'}}>{d.name}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>
              {d.participants} readers · {d.messages} messages
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
            {d.mine && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--sealed)',border:'1px solid rgba(102,85,255,0.2)',borderRadius:'100px',padding:'1px 6px'}}>owner</span>}
            {unlocked[d.id] && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)'}}>inside</span>}
            <DecayBadge expiresAt={d.expires}/>
          </div>
        </button>
      ))}

      {creating ? (
        <>
          <div className="field" style={{marginTop:'8px',marginBottom:'10px'}}>
            <label className="field-label">Dock name</label>
            <input className="input" placeholder="Give it a name..." value={name} onChange={e=>setName(e.target.value)} autoFocus/>
          </div>
          <div className="summary" style={{marginBottom:'10px'}}>
            <div className="summary-row"><span>Open a Dock</span><span className="summary-val">$0.50</span></div>
            <div className="summary-row" style={{borderBottom:'none'}}><span>Each message inside</span><span className="summary-val">$0.001</span></div>
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.5)',marginBottom:'10px',lineHeight:1.7}}>
            Fees route to the CONK treasury. No refunds. No recovery.
          </div>
          <div style={{display:'flex',gap:'6px'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setCreating(false)}>cancel</button>
            <button className="btn btn-primary" style={{flex:1}} onClick={()=>{if(name.trim()){setCreating(false);setName('')}}}>
              {name.trim() ? `Open "${name}" · $0.50` : 'Enter a name first'}
            </button>
          </div>
        </>
      ) : (
        <button className="btn btn-outline btn-full" style={{marginTop:'4px'}} onClick={()=>setCreating(true)}>
          + Open a Dock · $0.50
        </button>
      )}
    </>
  )
}
