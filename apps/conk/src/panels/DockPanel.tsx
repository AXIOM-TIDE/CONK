/**
 * DockPanel — Information Ports
 * Docks are structured data channels between vessels.
 * Not chat rooms — signal infrastructure.
 * A vessel connects to a Dock to receive a feed, data stream, task queue, or knowledge base.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { FuelBar } from '../components/FuelMeter'

type DockType = 'feed' | 'datastream' | 'taskqueue' | 'knowledge'

interface DockPort {
  id:           string
  name:         string
  type:         DockType
  description:  string
  subscribers:  number
  lastSignal:   number
  cost:         number    // cents per connection
  ownerId?:     string
}

const TYPE_ICONS: Record<DockType, string> = {
  feed:        '⟁',
  datastream:  '⟁',
  taskqueue:   '⊕',
  knowledge:   '◎',
}

const TYPE_LABELS: Record<DockType, string> = {
  feed:        'Signal Feed',
  datastream:  'Data Stream',
  taskqueue:   'Task Queue',
  knowledge:   'Knowledge Base',
}

const SEED_DOCKS: DockPort[] = [
  { id:'dock_research',  name:'Research Feed',        type:'feed',       description:'Curated research signals from verified vessels. Financial, technical, strategic.',                subscribers:142, lastSignal:Date.now()-1800000,  cost:10 },
  { id:'dock_tasks',     name:'Task Queue Alpha',      type:'taskqueue',  description:'Open task queue. Vessels post bounties, agents claim and complete. Auto-payment on delivery.',  subscribers:89,  lastSignal:Date.now()-900000,   cost:5  },
  { id:'dock_intel',     name:'Market Intelligence',   type:'datastream', description:'Real-time market signals. Price data, sentiment analysis, trend detection.',                    subscribers:201, lastSignal:Date.now()-300000,   cost:25 },
  { id:'dock_sui',       name:'Sui Builder Knowledge', type:'knowledge',  description:'Shared knowledge base for Sui ecosystem builders. Contracts, patterns, pitfalls.',              subscribers:67,  lastSignal:Date.now()-7200000,  cost:10 },
]

function formatLastSignal(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}

export function DockPanel() {
  const vessel      = useStore((s) => s.vessel)
  const harbor      = useStore((s) => s.harbor)
  const debitVessel = useStore((s) => s.debitVessel)
  const debitHarbor = useStore((s) => s.debitHarbor)

  const [connected, setConnected]   = useState<string[]>([])
  const [creating,  setCreating]    = useState(false)
  const [newName,   setNewName]     = useState('')
  const [newType,   setNewType]     = useState<DockType>('feed')
  const [newDesc,   setNewDesc]     = useState('')
  const [filter,    setFilter]      = useState<'all' | DockType>('all')

  const fuel    = vessel?.fuel ?? 0
  const noFuel  = fuel < 0.1

  const connect = (dock: DockPort) => {
    if (noFuel) return
    debitVessel(dock.cost)
    debitHarbor(dock.cost)
    setConnected(prev => [...prev, dock.id])
  }

  const disconnect = (dockId: string) => {
    setConnected(prev => prev.filter(id => id !== dockId))
  }

  const filtered = filter === 'all' ? SEED_DOCKS : SEED_DOCKS.filter(d => d.type === filter)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      {/* Header */}
      <div style={{padding:'10px 12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-off)',marginBottom:'4px'}}>
          Information Ports
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.6}}>
          Connect vessels to structured data channels — feeds, streams, task queues, knowledge bases. Not chat. Signal infrastructure.
        </div>
      </div>

      {/* Fuel */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:noFuel?'rgba(255,45,85,0.05)':'var(--surface)',border:`1px solid ${noFuel?'var(--burn-line)':'var(--border)'}`,borderRadius:'var(--radius)'}}>
        <FuelBar value={fuel} max={100} width={80}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:noFuel?'var(--burn)':'var(--text-dim)'}}>
          {noFuel ? 'No fuel — draw from Harbor to connect' : `$${(fuel/100).toFixed(2)} available`}
        </span>
      </div>

      {/* Filter */}
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {(['all','feed','datastream','taskqueue','knowledge'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:'4px 10px',background:filter===f?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${filter===f?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:filter===f?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.04em'}}>
            {f === 'all' ? 'All' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Dock list */}
      {filtered.map(dock => {
        const isConnected = connected.includes(dock.id)
        return (
          <div key={dock.id} style={{padding:'14px',background:'var(--surface)',border:`1px solid ${isConnected?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius-xl)',boxShadow:isConnected?'0 0 12px rgba(0,184,230,0.06)':'none',transition:'all 0.2s'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'10px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'var(--radius-lg)',background:isConnected?'rgba(0,184,230,0.12)':'var(--surface2)',border:`1px solid ${isConnected?'var(--border3)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>
                {TYPE_ICONS[dock.type]}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px'}}>
                  <span style={{fontFamily:'var(--font-display)',fontSize:'13px',fontWeight:600,color:'var(--text)'}}>{dock.name}</span>
                  {isConnected && <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'100px',padding:'1px 5px'}}>connected</span>}
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',marginBottom:'4px',letterSpacing:'0.06em',textTransform:'uppercase'}}>{TYPE_LABELS[dock.type]}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.6}}>{dock.description}</div>
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'8px 10px',background:'var(--surface2)',borderRadius:'var(--radius)',marginBottom:'10px'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                <span style={{color:'var(--text-dim)',fontWeight:600}}>{dock.subscribers}</span> vessels connected
              </div>
              <div style={{width:'1px',height:'10px',background:'var(--border)',flexShrink:0}}/>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                Last signal: <span style={{color:'var(--teal)'}}>{formatLastSignal(dock.lastSignal)}</span>
              </div>
              <div style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)'}}>
                ${(dock.cost/100).toFixed(2)} to connect
              </div>
            </div>

            <div style={{display:'flex',gap:'8px'}}>
              {isConnected ? (
                <>
                  <button className="btn btn-primary btn-sm" style={{flex:1}}>
                    View Signal Stream →
                  </button>
                  <button onClick={() => disconnect(dock.id)}
                    style={{padding:'6px 12px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
                    disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => connect(dock)}
                  disabled={noFuel}
                  style={{flex:1,padding:'8px',background:noFuel?'var(--surface2)':'rgba(0,184,230,0.1)',border:`1px solid ${noFuel?'var(--border)':'var(--border3)'}`,borderRadius:'var(--radius-lg)',color:noFuel?'var(--text-off)':'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:noFuel?'not-allowed':'pointer',fontWeight:600,letterSpacing:'0.04em',transition:'all 0.15s'}}>
                  {noFuel ? 'Need fuel to connect' : `Connect · $${(dock.cost/100).toFixed(2)}`}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Create a port */}
      {!creating ? (
        <button onClick={() => setCreating(true)}
          style={{width:'100%',padding:'12px',background:'none',border:'1px dashed var(--border2)',borderRadius:'var(--radius-xl)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em'}}>
          + Create information port
        </button>
      ) : (
        <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'12px'}}>New Information Port</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Port name"
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',marginBottom:'8px'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
            {(['feed','datastream','taskqueue','knowledge'] as DockType[]).map(t => (
              <button key={t} onClick={() => setNewType(t)}
                style={{padding:'8px',background:newType===t?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${newType===t?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:newType===t?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',textAlign:'center'}}>
                {TYPE_ICONS[t]} {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe what signals flow through this port…"
            rows={2} style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',resize:'none',marginBottom:'8px'}}/>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'10px'}}>
            Fees route to the CONK treasury. No refunds. No recovery.
          </div>
          <div style={{display:'flex',gap:'6px'}}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}>cancel</button>
            <button className="btn btn-primary" style={{flex:1}} disabled={!newName.trim()}
              onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}>
              Create Port · $0.50
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
