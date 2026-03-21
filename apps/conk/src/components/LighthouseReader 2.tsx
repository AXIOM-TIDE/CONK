import { useState, useEffect } from 'react'
import { useStore } from '../store/store'
import { use402 } from '../hooks/use402'
import { IconLighthouse, IconBack } from './Icons'

function fmtClock(ms: number) {
  if (ms <= 0) return 'expired'
  const y = Math.floor(ms / (365.25*24*60*60*1000))
  const d = Math.floor((ms % (365.25*24*60*60*1000)) / (24*60*60*1000))
  if (y > 0) return `${y}y ${d}d`
  return `${Math.floor(ms/(60*60*1000))}h`
}

export function LighthouseReader({ id, onClose }: { id: string; onClose: () => void }) {
  const lighthouses     = useStore((s) => s.lighthouses)
  const visitLighthouse = useStore((s) => s.visitLighthouse)
  const addChartEntry   = useStore((s) => s.addChartEntry)
  const debitVessel     = useStore((s) => s.debitVessel)
  const debitHarbor     = useStore((s) => s.debitHarbor)
  const vessel          = useStore((s) => s.vessel)
  const { pay, status } = use402({ amount: 1000 })

  const lh = lighthouses.find(l => l.id === id)
  const [visited,  setVisited]  = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const [clockMs,  setClockMs]  = useState(lh ? lh.expiresAt - Date.now() : 0)

  useEffect(() => {
    const iv = setInterval(() => { if (lh) setClockMs(lh.expiresAt - Date.now()) }, 1000)
    return () => clearInterval(iv)
  }, [lh])

  if (!lh) return (
    <div className="lh-fullscreen">
      <div className="lh-reading">
        <button className="lh-back-btn" onClick={onClose}>
          <IconBack size={13} color="var(--teal)"/> back
        </button>
        <div style={{textAlign:'center',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'12px',padding:'60px 0'}}>
          Lighthouse not found
        </div>
      </div>
    </div>
  )

  const canRead   = lh.isGenesis || visited
  const isPending = status === 'pending'

  const doVisit = async () => {
    if (lh.isGenesis) {
      visitLighthouse(lh.id)
      addChartEntry({ type:'lighthouse', id:lh.id, name:lh.hook, visitedAt:Date.now() })
      setVisited(true); setConfirm(false)
      return
    }
    const receipt = await pay()
    if (receipt) {
      if (vessel && vessel.fuel >= 0.1) debitVessel(0.1)
      else debitHarbor(0.1)
      visitLighthouse(lh.id)
      addChartEntry({ type:'lighthouse', id:lh.id, name:lh.hook, visitedAt:Date.now() })
      setVisited(true); setConfirm(false)
    }
  }

  return (
    <div className="lh-fullscreen">
      <div className="lh-reading">
        <button className="lh-back-btn" onClick={onClose}>
          <IconBack size={13} color="var(--teal)"/> back
        </button>

        {lh.isGenesis && (
          <div style={{textAlign:'center',marginBottom:'20px'}}>
            <span className="lh-genesis-badge">✦ genesis · free · permanent · unkillable</span>
          </div>
        )}

        <div className="lh-beacon-wrap">
          <div className="lh-beacon-glow">
            <IconLighthouse size={44} color="var(--teal)"/>
          </div>
        </div>

        <div className="lh-reading-title">{lh.hook}</div>

        <div className="lh-reading-stats">
          <div className="lh-stat">
            <span className="lh-stat-label">Reads</span>
            <span className="lh-stat-val">{(lh.tideCount + (visited?1:0)).toLocaleString()}</span>
          </div>
          <div className="lh-stat">
            <span className="lh-stat-label">Clock</span>
            <span className="lh-stat-val">{fmtClock(clockMs)}</span>
          </div>
          <div className="lh-stat">
            <span className="lh-stat-label">Since</span>
            <span className="lh-stat-val">{new Date(lh.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
        </div>

        {/* Content — shown after visiting */}
        {canRead ? (
          <div className="lh-reading-body">
            {lh.body.split('\n').map((line, i) =>
              line === '---' ? <hr key={i}/> :
              line === ''    ? <br key={i}/> :
              <p key={i}>{line}</p>
            )}
          </div>
        ) : confirm ? (
          <div style={{textAlign:'center',padding:'32px 0'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'20px',maxWidth:'280px',margin:'0 auto 20px'}}>
              Reading this Lighthouse resets its 100-year clock. Your visit is permanent and recorded in the tide.
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'16px',letterSpacing:'0.04em'}}>
              $0.001 · vessel → relay · Harbor never sees this
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
              <button className="btn btn-primary" style={{minWidth:'160px',height:'42px'}} onClick={doVisit} disabled={isPending}>
                {isPending ? <><span className="spinner"/>Visiting…</> : 'Visit · $0.001'}
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>cancel</button>
            </div>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{opacity:0.15,marginBottom:'20px',display:'flex',justifyContent:'center'}}>
              <IconLighthouse size={56} color="var(--teal)"/>
            </div>
            <p style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text-dim)',lineHeight:1.7,maxWidth:'280px',margin:'0 auto 20px'}}>
              {lh.isGenesis
                ? 'The Genesis Lighthouse is free to read. It will exist for 100 years.'
                : 'Visiting this Lighthouse costs $0.001. Your visit resets its 100-year clock.'}
            </p>
            {!vessel ? (
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--burn)'}}>You need a vessel to visit.</div>
            ) : (
              <button className="btn btn-primary" style={{minWidth:'220px',height:'42px'}} onClick={() => lh.isGenesis ? doVisit() : setConfirm(true)}>
                {lh.isGenesis ? 'Read the Genesis · free' : 'Visit Lighthouse · $0.001'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
