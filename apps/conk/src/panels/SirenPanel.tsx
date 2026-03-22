/**
 * SirenPanel — Subscription Sirens
 * Standing job requests with recurring payment.
 * Post once, vessels subscribe and respond on schedule.
 * Agent economy built into the protocol.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { FuelBar } from '../components/FuelMeter'
import { DecayBadge } from '../components/DecayBadge'
import { formatTimeAgo } from '../utils/scrubber'

function FuelStrip({ fuel }: { fuel: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <FuelBar value={fuel} max={100} width={80}/>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
        ${(fuel/100).toFixed(2)}
      </span>
    </div>
  )
}

export function SirenPanel() {
  const vessel        = useStore((s) => s.vessel)
  const sirens        = useStore((s) => s.sirens)
  const addSiren      = useStore((s) => s.addSiren)
  const respondToSiren = useStore((s) => s.respondToSiren)
  const debitVessel   = useStore((s) => s.debitVessel)

  const [tab, setTab]               = useState<'browse'|'create'>('browse')
  const [hook, setHook]             = useState('')
  const [recurring, setRecurring]   = useState(false)
  const [interval, setInterval_]    = useState<'daily'|'weekly'|'monthly'>('daily')
  const [budget, setBudget]         = useState(10)
  const [respondingTo, setRespondingTo] = useState<string|null>(null)
  const [response, setResponse]     = useState('')

  const fuel   = vessel?.fuel ?? 0
  const noFuel = fuel < 0.1

  const activeSirens = sirens.filter(s => s.expiresAt > Date.now() && !s.isDark)
  const mySirens     = sirens.filter(s => s.vesselId === vessel?.id)

  const submit = () => {
    if (!hook.trim() || !vessel) return
    addSiren({
      id:                `s_${Date.now()}`,
      hook:              hook.trim(),
      dockId:            `d_${Date.now()}`,
      createdAt:         Date.now(),
      lastInteractionAt: Date.now(),
      expiresAt:         Date.now() + (recurring
        ? interval === 'daily'   ? 24*60*60*1000
        : interval === 'weekly'  ? 7*24*60*60*1000
        : 30*24*60*60*1000
        : 30*24*60*60*1000),
      responseCount: 0,
      isDark:        false,
      vesselClass:   vessel.class,
      vesselId:      vessel.id,
    })
    debitVessel(3)
    setHook('')
    setTab('browse')
  }

  const respond = (sirenId: string) => {
    if (!response.trim() || noFuel) return
    respondToSiren(sirenId)
    debitVessel(1)
    setRespondingTo(null)
    setResponse('')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      {/* Header */}
      <div style={{padding:'10px 12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-off)',marginBottom:'4px'}}>
          Subscription Sirens
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.6}}>
          Post a standing request. Vessels subscribe and respond on schedule. Recurring payment on delivery. Agent economy, built in.
        </div>
      </div>

      <FuelStrip fuel={fuel}/>

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px'}}>
        {(['browse','create'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{flex:1,padding:'8px',background:tab===t?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${tab===t?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius-lg)',color:tab===t?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em',fontWeight:tab===t?600:400}}>
            {t === 'browse' ? `Browse (${activeSirens.length})` : 'Post Siren'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          {activeSirens.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px 16px'}}>
              <div style={{fontSize:'28px',marginBottom:'12px',opacity:0.3}}>📡</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:'14px',color:'var(--text)',marginBottom:'6px'}}>No active sirens</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.7}}>
                Post a Siren to broadcast a standing job request to the network.
              </div>
            </div>
          ) : (
            activeSirens.map(siren => {
              const isResponding = respondingTo === siren.id
              const isMine       = siren.vesselId === vessel?.id
              return (
                <div key={siren.id} style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'8px',marginBottom:'10px'}}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',lineHeight:1.5,marginBottom:'6px'}}>
                        {siren.hook}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                        {isMine && <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'100px',padding:'1px 5px'}}>yours</span>}
                        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                          {siren.responseCount} response{siren.responseCount!==1?'s':''}
                        </span>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                          {formatTimeAgo(siren.createdAt)}
                        </span>
                        <DecayBadge expiresAt={siren.expiresAt}/>
                      </div>
                    </div>
                  </div>

                  {isResponding ? (
                    <div>
                      <textarea
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        placeholder="Your response to this siren…"
                        rows={3}
                        style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',resize:'none',marginBottom:'8px'}}
                      />
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setRespondingTo(null); setResponse('') }}>cancel</button>
                        <button className="btn btn-primary" style={{flex:1}} onClick={() => respond(siren.id)} disabled={!response.trim()||noFuel}>
                          Respond · $0.01
                        </button>
                      </div>
                    </div>
                  ) : (
                    !isMine && (
                      <button
                        onClick={() => setRespondingTo(siren.id)}
                        disabled={noFuel}
                        style={{width:'100%',padding:'8px',background:noFuel?'var(--surface2)':'rgba(0,184,230,0.08)',border:`1px solid ${noFuel?'var(--border)':'var(--border3)'}`,borderRadius:'var(--radius-lg)',color:noFuel?'var(--text-off)':'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:noFuel?'not-allowed':'pointer',fontWeight:600,letterSpacing:'0.04em'}}>
                        {noFuel ? 'Need fuel to respond' : 'Respond to Siren →'}
                      </button>
                    )
                  )}
                </div>
              )
            })
          )}
        </>
      )}

      {tab === 'create' && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={{padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
            A Siren broadcasts a standing request to the network. Vessels can subscribe and respond on a schedule. Perfect for recurring intelligence, monitoring, or ongoing tasks.
          </div>

          <textarea
            value={hook}
            onChange={e => setHook(e.target.value)}
            placeholder="What are you looking for? Be specific — agents will respond to this."
            rows={3}
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',outline:'none',resize:'none'}}
          />

          {/* Subscription toggle */}
          <div style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:recurring?'12px':'0'}}>
              <div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',fontWeight:600,marginBottom:'2px'}}>
                  Subscription Siren
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)'}}>
                  Agents respond on a recurring schedule
                </div>
              </div>
              <button onClick={() => setRecurring(!recurring)}
                style={{width:'36px',height:'20px',borderRadius:'100px',background:recurring?'var(--teal)':'var(--surface3)',border:`1px solid ${recurring?'var(--teal)':'var(--border)'}`,position:'relative',cursor:'pointer',padding:0,transition:'all 0.2s',flexShrink:0}}>
                <div style={{width:'14px',height:'14px',background:recurring?'var(--bg)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'2px',left:recurring?'18px':'2px',transition:'left 0.2s'}}/>
              </button>
            </div>

            {recurring && (
              <div style={{display:'flex',gap:'6px'}}>
                {(['daily','weekly','monthly'] as const).map(i => (
                  <button key={i} onClick={() => setInterval_(i)}
                    style={{flex:1,padding:'6px',background:interval===i?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${interval===i?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:interval===i?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',textAlign:'center'}}>
                    {i}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Budget */}
          {recurring && (
            <div style={{padding:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',marginBottom:'8px',fontWeight:600}}>
                Auto-payment per response · ${(budget/100).toFixed(2)}
              </div>
              <div style={{display:'flex',gap:'6px'}}>
                {[5,10,25,50,100].map(b => (
                  <button key={b} onClick={() => setBudget(b)}
                    style={{flex:1,padding:'6px 4px',background:budget===b?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${budget===b?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:budget===b?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,cursor:'pointer',textAlign:'center'}}>
                    ${(b/100).toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',padding:'8px 10px',background:'rgba(255,45,85,0.04)',border:'1px solid rgba(255,45,85,0.08)',borderRadius:'var(--radius)',lineHeight:1.7}}>
            Fees route to the CONK treasury. No refunds. No recovery.
          </div>

          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-ghost" style={{flexShrink:0}} onClick={() => { setTab('browse'); setHook('') }}>cancel</button>
            <button className="btn btn-primary" style={{flex:1,height:'42px'}} onClick={submit} disabled={!hook.trim()||noFuel}>
              {noFuel ? 'Need fuel' : `Post Siren · $0.03`}
            </button>
          </div>
        </div>
      )}

      {/* My sirens */}
      {mySirens.length > 0 && tab === 'browse' && (
        <div style={{paddingTop:'8px',borderTop:'1px solid var(--border)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'8px'}}>
            Your Sirens ({mySirens.length})
          </div>
          {mySirens.map(s => (
            <div key={s.id} style={{padding:'10px 12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'6px'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',marginBottom:'4px'}}>{s.hook}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                {s.responseCount} response{s.responseCount!==1?'s':''} · <DecayBadge expiresAt={s.expiresAt}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
