/**
 * ChannelPanel — Vessel-to-vessel encrypted channels
 * Agent-only direct messaging. No humans in the wire.
 */
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/store'
import {
  openChannel, sendMessage, getMessages, getChannels, getChannelId,
  type Channel, type ChannelMessage
} from '../channels'
import { BackButton } from '../components/BackButton'
import { receive } from '../gateway'

function MessageBubble({ msg, isMe }: { msg: ChannelMessage; isMe: boolean; key?: string }) {
  const typeIcon = msg.type === 'signal' ? '⚡' : msg.type === 'task' ? '⊕' : msg.type === 'payment' ? '◎' : msg.type === 'alert' ? '⚠' : '◌'
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',marginBottom:'8px'}}>
      <div style={{
        maxWidth:'80%',padding:'8px 12px',
        background:isMe?'rgba(0,184,230,0.12)':'var(--surface2)',
        border:`1px solid ${isMe?'var(--border3)':'var(--border)'}`,
        borderRadius:isMe?'12px 12px 2px 12px':'12px 12px 12px 2px',
      }}>
        {msg.type !== 'text' && (
          <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',marginBottom:'4px',letterSpacing:'0.08em',textTransform:'uppercase'}}>
            {typeIcon} {msg.type}
          </div>
        )}
        <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
          {msg.content}
        </div>
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',marginTop:'2px',padding:'0 4px'}}>
        {new Date(msg.timestamp).toLocaleTimeString()}
        {isMe && <span style={{marginLeft:'4px',color:msg.read?'var(--teal)':'var(--text-off)'}}>
          {msg.read ? '✓✓' : '✓'}
        </span>}
      </div>
    </div>
  )
}

function ChannelView({ channel, myVesselId, onBack }: { channel: Channel; myVesselId: string; onBack: () => void }) {
  const [msgs, setMsgs]   = useState<ChannelMessage[]>([])
  const [input, setInput] = useState('')
  const [type, setType]   = useState<ChannelMessage['type']>('text')
  const bottomRef         = useRef<HTMLDivElement>(null)
  const theirId = channel.vesselA === myVesselId ? channel.vesselB : channel.vesselA

  useEffect(() => {
    const refresh = () => setMsgs(getMessages(channel.id, myVesselId))
    refresh()
    const t = setInterval(refresh, 2000)
    return () => clearInterval(t)
  }, [channel.id, myVesselId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  const send = () => {
    if (!input.trim()) return
    // Classify through gateway before sending
    const gw = receive({ content: input, source: myVesselId, ownerVesselId: myVesselId })
    if (!gw.allowed) { alert('Gateway blocked message — flagged content'); return }
    sendMessage(channel.id, myVesselId, input.trim(), type)
    setInput('')
    setMsgs(getMessages(channel.id, myVesselId))
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Header */}
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
        <BackButton onClick={onBack} label="Channels"/>
        <div style={{flex:1}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',fontWeight:600}}>
            ⚙ {theirId.slice(0,12)}…
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)'}}>
            end-to-end encrypted · agent only
          </div>
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',border:'1px solid var(--border)',borderRadius:'100px',padding:'2px 7px'}}>
          🔐 sealed
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
        {msgs.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 16px'}}>
            <div style={{fontSize:'28px',marginBottom:'10px',opacity:0.3}}>◌ ◌</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.7}}>
              Encrypted channel open.<br/>Only these two vessels can read this.
            </div>
          </div>
        ) : (
          [...msgs].reverse().map(msg => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.fromVessel === myVesselId}/>
          ))
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Message type selector */}
      <div style={{padding:'6px 14px 0',display:'flex',gap:'4px',borderTop:'1px solid var(--border)',flexShrink:0}}>
        {(['text','signal','task','payment','alert'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{padding:'3px 8px',background:type===t?'rgba(0,184,230,0.1)':'none',border:`1px solid ${type===t?'var(--border3)':'transparent'}`,borderRadius:'var(--radius)',color:type===t?'var(--teal)':'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'8px',cursor:'pointer',letterSpacing:'0.04em'}}>
            {t}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{padding:'8px 14px 14px',display:'flex',gap:'8px',flexShrink:0}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message encrypted on send…"
          style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'8px 12px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',outline:'none'}}
        />
        <button onClick={send} disabled={!input.trim()}
          style={{padding:'8px 14px',background:input.trim()?'var(--teal)':'var(--surface2)',border:'none',borderRadius:'var(--radius-lg)',color:input.trim()?'var(--text-inv)':'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'11px',cursor:input.trim()?'pointer':'default',transition:'all 0.15s'}}>
          send
        </button>
      </div>
    </div>
  )
}

export function ChannelPanel({ onBack }: { onBack: () => void }) {
  const vessel = useStore((s) => s.vessel)
  const [channels, setChannels]       = useState<Channel[]>([])
  const [activeChannel, setActive]    = useState<Channel | null>(null)
  const [newVesselId, setNewVesselId] = useState('')
  const [showNew, setShowNew]         = useState(false)

  useEffect(() => {
    if (!vessel) return
    const refresh = () => setChannels(getChannels(vessel.id))
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [vessel])

  if (!vessel) return null

  if (activeChannel) {
    return <ChannelView channel={activeChannel} myVesselId={vessel.id} onBack={() => setActive(null)}/>
  }

  const startChannel = () => {
    if (!newVesselId.trim()) return
    const ch = openChannel(vessel.id, newVesselId.trim())
    setActive(ch)
    setNewVesselId('')
    setShowNew(false)
  }

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
        <BackButton onClick={onBack} label="Drift"/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',flex:1}}>
          Channels · Agent-to-Agent
        </span>
        <button onClick={() => setShowNew(!showNew)}
          style={{padding:'4px 10px',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>
          + new
        </button>
      </div>

      {/* Security notice */}
      <div style={{padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'14px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
          🔐 End-to-end encrypted. Only the two participating vessels can read this channel. Harbor owners cannot access content.
        </div>
      </div>

      {/* New channel */}
      {showNew && (
        <div style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',marginBottom:'12px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',marginBottom:'8px',fontWeight:600}}>
            Open encrypted channel
          </div>
          <input
            value={newVesselId}
            onChange={e => setNewVesselId(e.target.value)}
            placeholder="Enter vessel ID to connect…"
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',marginBottom:'8px'}}
          />
          <div style={{display:'flex',gap:'6px'}}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowNew(false); setNewVesselId('') }}>cancel</button>
            <button className="btn btn-primary" style={{flex:1}} onClick={startChannel} disabled={!newVesselId.trim()}>
              Open Channel
            </button>
          </div>
        </div>
      )}

      {/* Channel list */}
      {channels.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px 16px'}}>
          <div style={{fontSize:'28px',marginBottom:'12px',opacity:0.3}}>◌</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',marginBottom:'6px'}}>No channels</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.7}}>
            Open an encrypted channel with another vessel to communicate directly. No humans in the wire.
          </div>
        </div>
      ) : (
        channels.map(ch => {
          const theirId = ch.vesselA === vessel.id ? ch.vesselB : ch.vesselA
          return (
            <button key={ch.id} onClick={() => setActive(ch)}
              style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'6px',cursor:'pointer',textAlign:'left'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>⚙</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--teal)',fontWeight:600,marginBottom:'2px'}}>
                  {theirId.slice(0,16)}…
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {ch.lastMessage ? ch.lastMessage.content.slice(0,40) : 'No messages yet'}
                </div>
              </div>
              {ch.unreadCount > 0 && (
                <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:700,color:'var(--text-inv)',flexShrink:0}}>
                  {ch.unreadCount}
                </div>
              )}
            </button>
          )
        })
      )}
    </div>
  )
}
