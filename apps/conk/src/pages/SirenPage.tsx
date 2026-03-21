import { useState } from 'react'
import { useStore } from '../store/store'

function ago(ts: number) {
  const m = Math.floor((Date.now()-ts)/60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

export function SirenPage({ onClose }: { onClose: () => void }) {
  const sirens = useStore((s) => s.sirens)
  const vessel = useStore((s) => s.vessel)
  const addSiren = useStore((s) => s.addSiren)
  const respondToSiren = useStore((s) => s.respondToSiren)
  const [createOpen, setCreateOpen] = useState(false)
  const [respondTarget, setRespondTarget] = useState<string | null>(null)
  const [hook, setHook] = useState('')
  const [response, setResponse] = useState('')
  const [creating, setCreating] = useState(false)
  const [responding, setResponding] = useState(false)

  const active = sirens.filter(s => !s.isDark)
  const dark   = sirens.filter(s => s.isDark)

  const handleCreate = async () => {
    if (!hook.trim()) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 700))
    addSiren({ id: `siren_${Date.now()}`, hook: hook.trim(), dockId: `dock_${Date.now()}`, createdAt: Date.now(), expiresAt: Date.now() + 30*24*60*60*1000, responseCount: 0, isDark: false, vesselTier: vessel?.tier ?? 'ghost' })
    setHook('')
    setCreating(false)
    setCreateOpen(false)
  }

  const handleRespond = async () => {
    if (!respondTarget || !response.trim()) return
    setResponding(true)
    await new Promise(r => setTimeout(r, 600))
    respondToSiren(respondTarget)
    setResponse('')
    setResponding(false)
    setRespondTarget(null)
  }

  const respondSiren = sirens.find(s => s.id === respondTarget)

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column', maxWidth:'var(--max-w)', margin:'0 auto', zIndex:50, borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'12px', cursor:'pointer', padding:0 }}>← feed</button>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:600, letterSpacing:'0.06em' }}>SIREN</span>
        <button className="btn btn-outline btn-sm" style={{ marginLeft:'auto' }} onClick={() => setCreateOpen(true)}>+ sound siren · $0.03</button>
      </div>

      {/* Explainer */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.6, flexShrink:0 }}>
        ⚡ An open broadcast. One Siren → one Dock. All responses enter the same sealed room.
      </div>

      {/* Active sirens */}
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
        {active.map(s => (
          <div key={s.id} style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--teal)', animation:'hbPulse 2s ease-in-out infinite', flexShrink:0 }} />
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>{ago(s.createdAt)} ago</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--teal)', marginLeft:'auto' }}>{s.responseCount} in dock</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>{Math.ceil((s.expiresAt-Date.now())/(1000*60*60*24))}d left</span>
            </div>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text)', lineHeight:1.5, margin:'0 0 10px' }}>{s.hook}</p>
            <div style={{ display:'flex', gap:'6px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setRespondTarget(s.id)}>↳ respond → enter dock</button>
            </div>
          </div>
        ))}

        {dark.length > 0 && (
          <>
            <div className="section-label" style={{ position:'static', padding:'8px 14px', background:'none', border:'none', borderBottom:'1px solid var(--border)' }}>Gone dark</div>
            {dark.map(s => (
              <div key={s.id} style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', opacity:0.35 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'var(--text-off)', flexShrink:0 }} />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>dock crumbled</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', marginLeft:'auto' }}>{s.responseCount} entered</span>
                </div>
                <p style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-dim)', lineHeight:1.5, margin:0, fontStyle:'italic' }}>{s.hook}</p>
              </div>
            ))}
          </>
        )}

        {active.length === 0 && dark.length === 0 && (
          <div className="empty">
            <div style={{ fontSize:'22px', opacity:0.2 }}>⚡</div>
            <div>no active sirens</div>
          </div>
        )}
      </div>

      {/* Create siren */}
      {createOpen && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setCreateOpen(false)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-title">Sound a Siren</div>
            <div className="drawer-sub">An open broadcast. All responses enter one sealed Dock. 30 days from last response.</div>
            <div className="field">
              <label className="field-label">Broadcast <span className="field-cost">free to see</span></label>
              <textarea className="input" rows={3} placeholder="What are you calling for?" value={hook} onChange={e => setHook(e.target.value)} maxLength={280} />
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', textAlign:'right' }}>{hook.length}/280</div>
            </div>
            <div className="summary">
              <div className="summary-row"><span>Sound Siren</span><span className="summary-val">$0.03</span></div>
              <div className="summary-row" style={{ borderBottom:'none' }}><span>Dock auto-opens</span><span className="summary-val">$0.50</span></div>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleCreate} disabled={creating || !hook.trim()}>
              {creating ? <><span className="spinner" />Sounding...</> : 'Sound Siren → $0.03'}
            </button>
          </div>
        </div>
      )}

      {/* Respond */}
      {respondTarget && respondSiren && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setRespondTarget(null)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontStyle:'italic', color:'var(--text-dim)', padding:'8px 12px', background:'var(--surface)', borderLeft:'2px solid var(--teal)', borderRadius:'0 var(--radius) var(--radius) 0', marginBottom:'14px', lineHeight:1.5 }}>
              "{respondSiren.hook}"
            </div>
            <div className="drawer-sub">Your response enters the Dock as a sealed cast.</div>
            <div className="field">
              <label className="field-label">Your cast <span className="field-cost">$0.001</span></label>
              <textarea className="input" rows={4} placeholder="Cast into the Dock..." value={response} onChange={e => setResponse(e.target.value)} />
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'rgba(102,85,255,0.5)', padding:'8px 10px', background:'rgba(102,85,255,0.05)', border:'1px solid rgba(102,85,255,0.1)', borderRadius:'var(--radius)', marginBottom:'12px' }}>
              ⬡ sealed · Axiom Tide cannot read this
            </div>
            <button className="btn btn-primary btn-full" onClick={handleRespond} disabled={responding || !response.trim()}>
              {responding ? <><span className="spinner" />Entering Dock...</> : 'Enter Dock → $0.001'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
