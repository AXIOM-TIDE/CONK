/**
 * ProtocolPanel — Sprint 4 Protocol Depth Features
 * Tide Index · Signal Futures · Dead Man's Switch · Harbor Inheritance · Void Receipt
 * The features that make CONK a permanent protocol, not just an app.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { TideIndex } from '../components/TideIndex'
import { DeadMansSwitch } from '../components/DeadMansSwitch'
import { VoidReceipt } from '../components/VoidReceipt'
import { BackButton } from '../components/BackButton'

function HarborInheritance() {
  const harbor = useStore((s) => s.harbor)
  const [successor, setSuccessor] = React.useState('')
  const [delay, setDelay] = React.useState(90)
  const [saved, setSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [configured, setConfigured] = React.useState(null)

  const save = async () => {
    if (!successor.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setConfigured({ successor: successor.trim(), delay })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const clear = () => {
    setConfigured(null)
    setSuccessor('')
    setDelay(90)
  }

  return (
    <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>
        Harbor Inheritance
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',lineHeight:1.6,marginBottom:'12px'}}>
        If your Harbor is inactive for the set period, the balance transfers to the successor address. No court. No platform. No administrator.
      </div>

      {configured && (
        <div style={{padding:'10px 12px',background:'rgba(0,184,230,0.06)',border:'1px solid var(--border3)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'#4CAF50',fontWeight:600}}>Active</span>
            <button onClick={clear} style={{background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>clear</button>
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {configured.successor}
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>
            triggers after {configured.delay} days inactivity
          </div>
        </div>
      )}

      {!configured && (
        <div>
          <div style={{marginBottom:'10px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
              Successor Harbor address
            </div>
            <input value={successor} onChange={e => setSuccessor(e.target.value)}
              placeholder="0x… successor wallet address"
              style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none'}}/>
          </div>
          <div style={{marginBottom:'12px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
              Transfer after inactivity
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              {[30,60,90,180,365].map(d => (
                <button key={d} onClick={() => setDelay(d)}
                  style={{flex:1,padding:'6px 4px',background:delay===d?'rgba(0,184,230,0.1)':'var(--surface2)',border:'1px solid ' + (delay===d?'var(--border3)':'var(--border)'),borderRadius:'var(--radius)',color:delay===d?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',textAlign:'center'}}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{padding:'8px 10px',background:'rgba(0,184,230,0.04)',borderRadius:'var(--radius)',marginBottom:'10px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
            Balance: <span style={{color:'var(--teal)',fontWeight:600}}>${((harbor?.balance ?? 0)/100).toFixed(2)}</span> transfers after {delay} days inactivity.
          </div>
          <button onClick={save} disabled={!successor.trim() || saving}
            style={{width:'100%',padding:'9px',background:successor.trim()?'rgba(0,184,230,0.08)':'var(--surface2)',border:'1px solid ' + (successor.trim()?'var(--border3)':'var(--border)'),borderRadius:'var(--radius-lg)',color:saved?'#4CAF50':successor.trim()?'var(--teal)':'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,cursor:successor.trim()?'pointer':'default',transition:'all 0.2s'}}>
            {saving ? 'Saving...' : saved ? 'Configured' : 'Set Harbor Inheritance'}
          </button>
        </div>
      )}
    </div>
  )
}


function SignalFuturesUI() {
  const vessel = useStore((s) => s.vessel)
  const [view, setView] = React.useState<'browse'|'create'>('browse')
  const [prediction, setPrediction] = React.useState('')
  const [stake, setStake] = React.useState(1000)
  const [expiry, setExpiry] = React.useState<'24h'|'48h'|'7d'>('24h')
  const [futures, setFutures] = React.useState<Array<{
    id: string; prediction: string; stake: number; expiry: number
    author: string; takers: Array<{vessel: string; stake: number}>
    resolved: boolean
  }>>([])

  const fmt = (n: number) => '$' + (n / 1000000).toFixed(3)
  const timeLeft = (ts: number) => {
    const h = (ts - Date.now()) / 3600000
    if (h < 0) return 'expired'
    if (h < 1) return '<1h'
    if (h < 24) return Math.floor(h) + 'h'
    return Math.floor(h / 24) + 'd'
  }
  const expiryMs: Record<string,number> = { '24h': 86400000, '48h': 172800000, '7d': 604800000 }

  const createFuture = () => {
    if (!prediction.trim() || !vessel) return
    setFutures(prev => [...prev, {
      id: 'f_' + Date.now(), prediction: prediction.trim(),
      stake, expiry: Date.now() + expiryMs[expiry],
      author: vessel.id, takers: [], resolved: false
    }])
    setPrediction('')
    setView('browse')
  }

  const takeSide = (id: string) => {
    if (!vessel) return
    setFutures(prev => prev.map(f =>
      f.id === id && !f.takers.find(t => t.vessel === vessel.id)
        ? { ...f, takers: [...f.takers, { vessel: vessel.id, stake: f.stake }] } : f
    ))
  }

  const resolve = (id: string, authorWins: boolean) => {
    setFutures(prev => prev.map(f =>
      f.id === id ? { ...f, resolved: true } : f
    ))
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
        <div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)'}}>Signal Futures</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>
            Stake USDC on a prediction. Caster verifies outcome. Winner collects pool.
          </div>
        </div>
        <button onClick={() => setView(view === 'create' ? 'browse' : 'create')}
          style={{padding:'6px 12px',background:'rgba(0,184,230,0.1)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',cursor:'pointer'}}>
          {view === 'create' ? 'browse' : '+ new future'}
        </button>
      </div>

      {view === 'create' && (
        <div style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
          <textarea placeholder="State your prediction. You verify the outcome." value={prediction}
            onChange={e => setPrediction(e.target.value)} rows={3}
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',outline:'none',resize:'none',marginBottom:'8px'}}/>
          <div style={{display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>
            {[1000,10000,100000,1000000].map(s => (
              <button key={s} onClick={() => setStake(s)}
                style={{padding:'5px 8px',background:stake===s?'rgba(0,184,230,0.1)':'var(--surface2)',border:('1px solid ' + (stake===s?'var(--teal)':'var(--border)')),borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'9px',color:stake===s?'var(--teal)':'var(--text-dim)',cursor:'pointer'}}>
                {fmt(s)}
              </button>
            ))}
            {(['24h','48h','7d'] as const).map(e => (
              <button key={e} onClick={() => setExpiry(e)}
                style={{padding:'5px 8px',background:expiry===e?'rgba(0,184,230,0.1)':'var(--surface2)',border:('1px solid ' + (expiry===e?'var(--teal)':'var(--border)')),borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'9px',color:expiry===e?'var(--teal)':'var(--text-dim)',cursor:'pointer'}}>
                {e}
              </button>
            ))}
          </div>
          <button onClick={createFuture} disabled={!prediction.trim()}
            style={{width:'100%',padding:'8px',background:prediction.trim()?'var(--teal)':'var(--surface2)',border:'none',borderRadius:'var(--radius)',color:prediction.trim()?'var(--text-inv)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:prediction.trim()?'pointer':'not-allowed'}}>
            Post future
          </button>
        </div>
      )}

      {futures.length === 0 ? (
        <div style={{textAlign:'center',padding:'24px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>
          No futures active. Post a prediction and stake USDC on it.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {futures.map(f => {
            const pool = f.stake + f.takers.reduce((s,t) => s + t.stake, 0)
            const isAuthor = vessel?.id === f.author
            const hasTaken = !!f.takers.find(t => t.vessel === vessel?.id)
            const expired = f.expiry < Date.now()
            return (
              <div key={f.id} style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',opacity:f.resolved?0.6:1}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',marginBottom:'6px',lineHeight:1.5}}>{f.prediction}</div>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px',flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',fontWeight:600}}>pool: {fmt(pool)}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>{f.takers.length} takers</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:expired?'var(--burn)':'var(--text-off)'}}>{timeLeft(f.expiry)}</span>
                  {f.resolved && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'#4CAF50'}}>resolved</span>}
                </div>
                {!f.resolved && !isAuthor && !hasTaken && !expired && (
                  <button onClick={() => takeSide(f.id)}
                    style={{width:'100%',padding:'6px',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',cursor:'pointer'}}>
                    take opposite · stake {fmt(f.stake)}
                  </button>
                )}
                {!f.resolved && isAuthor && f.takers.length > 0 && (
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={() => resolve(f.id, true)}
                      style={{flex:1,padding:'6px',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',cursor:'pointer'}}>
                      I was right
                    </button>
                    <button onClick={() => resolve(f.id, false)}
                      style={{flex:1,padding:'6px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--burn)',cursor:'pointer'}}>
                      I was wrong
                    </button>
                  </div>
                )}
                {hasTaken && !isAuthor && !f.resolved && (
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',paddingTop:'4px'}}>
                    position taken · awaiting caster resolution
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
type SubTab = 'tide' | 'futures' | 'deadmans' | 'inheritance' | 'void'

export function ProtocolPanel({ onBack }: { onBack: () => void }) {
  const [sub, setSub] = useState<SubTab>('tide')

  const tabs: { id: SubTab; label: string; icon: string }[] = [
    { id:'tide',        label:'Tide Index',  icon:'⚡' },
    { id:'futures',     label:'Futures',     icon:'🔒' },
    { id:'deadmans',    label:'Switch',      icon:'⏳' },
    { id:'inheritance', label:'Inherit',     icon:'⚓' },
    { id:'void',        label:'Receipts',    icon:'◎' },
  ]

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
        <BackButton onClick={onBack} label="Drift"/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          Protocol Depth
        </span>
      </div>

      {/* Sub-tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'14px',overflowX:'auto',paddingBottom:'2px'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            style={{flexShrink:0,padding:'6px 10px',background:sub===t.id?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${sub===t.id?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:sub===t.id?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {sub === 'tide'        && <TideIndex/>}
      {sub === 'futures'     && <SignalFuturesUI/>}
      {sub === 'deadmans'    && <DeadMansSwitch/>}
      {sub === 'inheritance' && <HarborInheritance/>}
      {sub === 'void'        && <VoidReceipt/>}
    </div>
  )
}
