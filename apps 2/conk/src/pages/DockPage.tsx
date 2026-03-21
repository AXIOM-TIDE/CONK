import { useState } from 'react'
import { useStore } from '../store/store'

const MOCK_DOCKS = [
  { id: 'd1', name: 'Protocol Alpha', members: 7, casts: 34, expires: Date.now() + 1000*60*60*24*18, lastCast: Date.now() - 1000*60*12, owner: true },
  { id: 'd2', name: 'Vessel Collective', members: 23, casts: 112, expires: Date.now() + 1000*60*60*24*6, lastCast: Date.now() - 1000*60*60*2, owner: false },
]

const MOCK_MSGS = [
  { id: 'm1', tier: 'ghost',  text: 'Anyone watching cast seed_003? 89k reads and climbing.',      ago: 4 },
  { id: 'm2', tier: 'shadow', text: 'Three tides of 500k earns it. Path 2 is underrated.',          ago: 3 },
  { id: 'm3', tier: 'ghost',  text: 'The Relay is doing exactly what it was designed to do.',       ago: 1 },
]

export function DockPage({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<typeof MOCK_DOCKS[0] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [dockName, setDockName] = useState('')

  if (active) {
    return (
      <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column', maxWidth:'var(--max-w)', margin:'0 auto', zIndex:50, borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)' }}>
        {/* Room header */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 }}>
          <button onClick={() => setActive(null)} style={{ background:'none', border:'none', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'12px', cursor:'pointer', padding:0 }}>← back</button>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600 }}>⬡ {active.name}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', marginLeft:'auto' }}>{active.members} vessels</span>
        </div>

        {/* Sealed notice */}
        <div style={{ padding:'7px 14px', background:'rgba(102,85,255,0.06)', borderBottom:'1px solid rgba(102,85,255,0.1)', fontFamily:'var(--font-mono)', fontSize:'10px', color:'rgba(102,85,255,0.5)', letterSpacing:'0.06em', flexShrink:0 }}>
          ⬡ sealed by Seal protocol · Axiom Tide cannot read this
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:'10px', scrollbarWidth:'none' }}>
          {MOCK_MSGS.map(m => (
            <div key={m.id} style={{ display:'flex', gap:'10px', animation:'rowIn 0.2s ease both' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text-off)', marginTop:'2px', flexShrink:0 }}>
                {m.tier === 'ghost' ? '◌' : '◑'}
              </span>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'0 var(--radius-lg) var(--radius-lg) var(--radius-lg)', padding:'9px 12px', flex:1 }}>
                <p style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', margin:0, lineHeight:1.6 }}>{m.text}</p>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>{m.ago}m ago</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--bg2)', paddingBottom:'calc(10px + env(safe-area-inset-bottom))' }}>
          <div className="compose-box">
            <textarea className="compose-input" rows={1} placeholder="Cast into the Dock... · $0.001" value={msg} onChange={e => setMsg(e.target.value)} />
            <button className="compose-send" disabled={!msg.trim()} onClick={() => setMsg('')}>↑</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column', maxWidth:'var(--max-w)', margin:'0 auto', zIndex:50, borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'12px', cursor:'pointer', padding:0 }}>← feed</button>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:600, letterSpacing:'0.06em' }}>DOCK</span>
        <button className="btn btn-outline btn-sm" style={{ marginLeft:'auto' }} onClick={() => setCreateOpen(true)}>+ open dock · $0.50</button>
      </div>

      {/* Explainer */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.6, background:'rgba(102,85,255,0.04)', flexShrink:0 }}>
        ⬡ Sealed rooms. Max 50 vessels. Crumbles 30 days after the last cast. Axiom Tide cannot read what's inside.
      </div>

      {/* Dock list */}
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
        {MOCK_DOCKS.map(d => (
          <button key={d.id} onClick={() => setActive(d)} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'none', border:'none', borderBottom:'1px solid var(--border)', width:'100%', cursor:'pointer', textAlign:'left', transition:'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,191,238,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <span style={{ fontSize:'18px', opacity:0.5 }}>⬡</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600, color:'var(--text)' }}>{d.name}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>
                {d.members} vessels · {d.casts} casts · last cast {Math.round((Date.now()-d.lastCast)/60000)}m ago
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
              {d.owner && <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--sealed)', border:'1px solid rgba(102,85,255,0.2)', borderRadius:'100px', padding:'2px 6px', letterSpacing:'0.06em', textTransform:'uppercase' }}>owner</span>}
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>{Math.ceil((d.expires-Date.now())/(1000*60*60*24))}d left</span>
            </div>
          </button>
        ))}
        <div className="empty">
          <div style={{ fontSize:'20px', opacity:0.2 }}>⬡</div>
          <div>open a dock · invite vessels · seal a room</div>
        </div>
      </div>

      {/* Create dock drawer */}
      {createOpen && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setCreateOpen(false)}>
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-title">Open a Dock</div>
            <div className="drawer-sub">A sealed private room. Max 50 vessels. 30 days from last cast.</div>
            <div className="field">
              <label className="field-label">Name</label>
              <input className="input" placeholder="Give it a name..." value={dockName} onChange={e => setDockName(e.target.value)} />
            </div>
            <div className="summary">
              <div className="summary-row"><span>Open a Dock</span><span className="summary-val">$0.50</span></div>
              <div className="summary-row" style={{ borderBottom:'none' }}><span>Each cast inside</span><span className="summary-val">$0.001</span></div>
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setCreateOpen(false)}>Open Dock — coming soon</button>
          </div>
        </div>
      )}
    </div>
  )
}
