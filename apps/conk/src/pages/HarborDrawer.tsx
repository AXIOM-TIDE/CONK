import { useState } from 'react'
import { useStore } from '../store/store'

export function HarborDrawer({ onClose }: { onClose: () => void }) {
  const harbor  = useStore((s) => s.harbor)
  const vessel  = useStore((s) => s.vessel)
  const setVessel = useStore((s) => s.setVessel)
  const setHarbor = useStore((s) => s.setHarbor)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const [topUpAmt, setTopUpAmt] = useState(500)

  if (!harbor || !vessel) return null

  const balance = (harbor.balance / 100).toFixed(2)
  const reads   = Math.floor(harbor.balance / 0.1).toLocaleString()
  const days    = Math.ceil((harbor.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
  const fillPct = Math.min(100, (harbor.balance / 1000) * 100)

  const reset = () => {
    setVessel(null); setHarbor(null); setOnboarded(false); onClose()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-handle" />

        {/* Balance */}
        <div style={{ textAlign:'center', padding:'4px 0 20px' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'8px' }}>
            Harbor Balance
          </div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:'4px' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'48px', fontWeight:600, color:'var(--teal)', textShadow:'var(--teal-glow-sm)', lineHeight:1 }}>${balance}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'14px', color:'var(--text-dim)' }}>USDC</span>
          </div>
          <div style={{ marginTop:'12px', height:'3px', background:'var(--surface3)', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ width:`${fillPct}%`, height:'100%', background:'var(--teal)', boxShadow:'0 0 8px var(--teal)', borderRadius:'2px', transition:'width 0.6s ease' }} />
          </div>
          <div style={{ marginTop:'6px', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', display:'flex', justifyContent:'space-between' }}>
            <span>~{reads} reads left</span>
            <span>expires in {days}d</span>
          </div>
        </div>

        {/* Top up amounts */}
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'8px' }}>
          Top Up
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'12px' }}>
          {[200,500,1000,2000].map(c => (
            <button key={c}
              onClick={() => setTopUpAmt(c)}
              style={{
                padding:'10px 4px', background: topUpAmt === c ? 'var(--teal-dim)' : 'var(--surface)',
                border: `1px solid ${topUpAmt === c ? 'var(--border3)' : 'var(--border)'}`,
                borderRadius:'var(--radius)', color: topUpAmt === c ? 'var(--teal)' : 'var(--text)',
                fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:600, cursor:'pointer', textAlign:'center'
              }}>
              ${(c/100).toFixed(0)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-full" style={{ marginBottom:'20px' }} onClick={onClose}>
          Purchase via Transak — coming soon
        </button>

        {/* Three laws */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px', marginBottom:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {[['I','Casts never reach the Harbor.'],['II','Harbor knows only balance decreased.'],['III','Who paid and what was cast — never linked.']].map(([n,l]) => (
            <div key={n} style={{ display:'flex', gap:'8px' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--teal)', minWidth:'14px', marginTop:'2px' }}>{n}</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.5 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Vessel info */}
        <div className="section-label" style={{ position:'static', padding:'0 0 8px', background:'none', border:'none', borderBottom:'1px solid var(--border)', marginBottom:'12px' }}>
          Your Vessel
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
          {[
            ['Tier', vessel.tier],
            ['Type', vessel.tempOrPerm === 'perm' ? 'permanent' : 'burn after cast'],
            ['Harbor slots', `${harbor.tier}`],
            ['Vessel expires', `${Math.ceil((vessel.expiresAt - Date.now()) / (1000*60*60*24))}d`],
          ].map(([l,v]) => (
            <div key={l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'3px' }}>{l}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--teal)', fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Fee schedule */}
        <div className="section-label" style={{ position:'static', padding:'0 0 8px', background:'none', border:'none', borderBottom:'1px solid var(--border)', marginBottom:'12px' }}>
          Protocol Fees → The Abyss
        </div>
        <div className="summary" style={{ marginBottom:'20px' }}>
          {[['Open Harbor','$0.05–$0.50'],['Launch Vessel','$0.01'],['Sound a Cast','$0.001'],['Read a Cast','$0.001'],['Sound a Siren','$0.03'],['Open a Dock','$0.50'],['Visit Lighthouse','$0.001']].map(([a,c]) => (
            <div key={a} className="summary-row"><span>{a}</span><span className="summary-val">{c}</span></div>
          ))}
        </div>

        <button className="btn btn-ghost btn-full" onClick={reset} style={{ opacity:0.4, fontSize:'10px' }}>
          ↺ reset app (dev only)
        </button>
      </div>
    </div>
  )
}
