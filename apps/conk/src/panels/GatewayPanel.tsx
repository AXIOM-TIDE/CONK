/**
 * GatewayPanel — Human visibility into the gateway layer
 * Shows inbox events, blocked messages, velocity status, heartbeat.
 * Human supervision surface for agent activity.
 */
import { useState, useEffect } from 'react'
import { useStore } from '../store/store'
import { inbox, getVelocityStatus, heartbeat } from '../gateway'
import { DEFAULT_POLICY } from '../gateway/types'
import type { InboxEvent } from '../gateway/types'
import { BackButton } from '../components/BackButton'

const TYPE_COLORS: Record<string, string> = {
  instruction: 'var(--teal)',
  signal:      'var(--text-dim)',
  payment:     '#4CAF50',
  alert:       'var(--burn)',
  siren:       '#9C27B0',
  heartbeat:   'var(--text-off)',
  task_complete: '#4CAF50',
  dock_request: '#2196F3',
  bounty:      '#FF9800',
  system:      'var(--text-off)',
  coalition:   '#00BCD4',
}

const RISK_COLORS: Record<string, string> = {
  safe:     'var(--teal)',
  low:      '#FFB020',
  medium:   '#FF9800',
  high:     'var(--burn)',
  critical: 'var(--burn)',
}

function EventRow({ event }: { event: InboxEvent; key?: string }) {
  const [expanded, setExpanded] = useState(false)
  const risk = (event.metadata?.risk as string) ?? 'safe'
  const flags = (event.metadata?.flags as string[]) ?? []
  const requiresApproval = event.metadata?.requiresApproval as boolean

  return (
    <div style={{
      padding:'10px 12px',
      background: event.processed ? 'transparent' : 'var(--surface)',
      border:`1px solid ${requiresApproval ? 'rgba(255,176,32,0.3)' : 'var(--border)'}`,
      borderRadius:'var(--radius)',
      marginBottom:'6px',
      opacity: event.processed ? 0.5 : 1,
      transition:'all 0.15s',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}} onClick={() => setExpanded(!expanded)}>
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:TYPE_COLORS[event.type]??'var(--text-off)',flexShrink:0}}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:TYPE_COLORS[event.type]??'var(--text-off)',letterSpacing:'0.08em',textTransform:'uppercase',flexShrink:0}}>
          {event.type}
        </span>
        {requiresApproval && (
          <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'#FFB020',border:'1px solid rgba(255,176,32,0.3)',borderRadius:'100px',padding:'1px 5px',flexShrink:0}}>
            approval needed
          </span>
        )}
        {risk !== 'safe' && (
          <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:RISK_COLORS[risk],flexShrink:0}}>
            {risk} risk
          </span>
        )}
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {event.content.slice(0, 60)}{event.content.length > 60 ? '…' : ''}
        </span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',flexShrink:0}}>
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {expanded && (
        <div style={{marginTop:'8px',paddingTop:'8px',borderTop:'1px solid var(--border)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'6px'}}>
            {event.content}
          </div>
          {flags.length > 0 && (
            <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'6px'}}>
              {flags.map((f,i) => (
                <span key={i} style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--burn)',border:'1px solid var(--burn-line)',borderRadius:'100px',padding:'1px 6px'}}>
                  {f}
                </span>
              ))}
            </div>
          )}
          {event.action && (
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)'}}>
              action: {event.action}
            </div>
          )}
          {requiresApproval && !event.processed && (
            <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
              <button onClick={() => inbox.process(event.id, 'approved')}
                style={{padding:'4px 10px',background:'rgba(0,184,230,0.1)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>
                approve
              </button>
              <button onClick={() => inbox.process(event.id, 'denied')}
                style={{padding:'4px 10px',background:'var(--burn-dim)',border:'1px solid var(--burn-line)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>
                deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function GatewayPanel({ onBack }: { onBack: () => void }) {
  const vessel  = useStore((s) => s.vessel)
  const [events, setEvents]       = useState<InboxEvent[]>([])
  const [velocity, setVelocity]   = useState<ReturnType<typeof getVelocityStatus> | null>(null)
  const [hbStatus, setHbStatus]   = useState(heartbeat.getStatus())
  const [filter, setFilter]       = useState<'all'|'pending'|'flagged'>('pending')
  const [hbRunning, setHbRunning] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setEvents(inbox.all(100))
      if (vessel) setVelocity(getVelocityStatus(vessel.id, DEFAULT_POLICY))
      setHbStatus(heartbeat.getStatus())
      setHbRunning(heartbeat.isRunning())
    }
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [vessel])

  const filtered = events.filter(e => {
    if (filter === 'pending') return !e.processed
    if (filter === 'flagged') return (e.metadata?.flags as string[])?.length > 0
    return true
  })

  const pendingApproval = events.filter(e => e.metadata?.requiresApproval && !e.processed)

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
        <BackButton onClick={onBack} label="Daemon"/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          Gateway · Agent Inbox
        </span>
      </div>

      {/* Approval queue */}
      {pendingApproval.length > 0 && (
        <div style={{padding:'10px 12px',background:'rgba(255,176,32,0.05)',border:'1px solid rgba(255,176,32,0.2)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'#FFB020',marginBottom:'4px',fontWeight:600}}>
            ⚠ {pendingApproval.length} action{pendingApproval.length!==1?'s':''} need your approval
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)'}}>
            Daemon is paused on these — review below
          </div>
        </div>
      )}

      {/* Heartbeat control */}
      <div style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'2px'}}>
              Daemon Heartbeat
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
              {hbRunning ? `Wake #${hbStatus.wakeCount} · checks every 30min` : 'Daemon sleeping'}
            </div>
          </div>
          <button
            onClick={() => {
              if (hbRunning) { heartbeat.stop(); setHbRunning(false) }
              else {
                heartbeat.start({ keywords: [], autoRead: false, autoRespond: false })
                setHbRunning(true)
              }
            }}
            style={{
              padding:'6px 14px',
              background: hbRunning ? 'var(--burn-dim)' : 'rgba(0,184,230,0.1)',
              border: `1px solid ${hbRunning ? 'var(--burn-line)' : 'var(--border3)'}`,
              borderRadius:'var(--radius)',
              color: hbRunning ? 'var(--burn)' : 'var(--teal)',
              fontFamily:'var(--font-mono)',
              fontSize:'10px',
              cursor:'pointer',
            }}>
            {hbRunning ? 'stop' : 'start'}
          </button>
        </div>
      </div>

      {/* Velocity status */}
      {velocity && (
        <div style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,color:'var(--text)',marginBottom:'8px'}}>
            Velocity · This Tide
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
            {Object.entries(velocity).filter(([k]) => k !== 'resetAt').map(([key, val]) => {
              const v = val as { used: number; limit: number }
              const pct = Math.min(100, (v.used / v.limit) * 100)
              const color = pct > 80 ? 'var(--burn)' : pct > 50 ? '#FFB020' : 'var(--teal)'
              return (
                <div key={key} style={{padding:'6px 8px',background:'var(--surface2)',borderRadius:'var(--radius)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{key}</span>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color}}>{v.used}/{v.limit}</span>
                  </div>
                  <div style={{height:'2px',background:'var(--surface3)',borderRadius:'1px'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'1px',transition:'width 0.3s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Inbox */}
      <div style={{marginBottom:'8px',display:'flex',gap:'6px'}}>
        {(['pending','flagged','all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:'4px 10px',background:filter===f?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${filter===f?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:filter===f?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.06em'}}>
            {f} {f==='pending'?`(${events.filter(e=>!e.processed).length})`:f==='flagged'?`(${events.filter(e=>(e.metadata?.flags as string[])?.length>0).length})`:''}
          </button>
        ))}
        {events.length > 0 && (
          <button onClick={() => { inbox.gc(0); setEvents([]) }}
            style={{marginLeft:'auto',padding:'4px 10px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>
            clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:'24px',marginBottom:'8px',opacity:0.3}}>⊡</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)'}}>
            {filter === 'pending' ? 'No pending events' : filter === 'flagged' ? 'No flagged messages' : 'Inbox empty'}
          </div>
        </div>
      ) : (
        filtered.map(e => <EventRow key={e.id} event={e}/>)
      )}
    </div>
  )
}
