import { useState, useEffect, useRef } from 'react'
import { useStore, type Cast, type CastMode } from '../store/store'
import { use402 } from '../hooks/use402'
import { formatTide, timeUntilExpiry, formatTimeAgo } from '../utils/scrubber'
import { IconOpen, IconEye, IconFlame, IconLock, IconDock } from '../components/Icons'

const FILTERS: {id:'all'|CastMode;label:string}[] = [
  {id:'all',      label:'all'},
  {id:'open',     label:'open'},
  {id:'eyes_only',label:'eyes only'},
  {id:'sealed',   label:'sealed'},
]

export function DriftFeed() {
  const casts     = useStore((s) => s.driftCasts)
  const filter    = useStore((s) => s.driftFilter)
  const setFilter = useStore((s) => s.setDriftFilter)
  const vessel    = useStore((s) => s.vessel)
  const incTide   = useStore((s) => s.incrementTide)
  const [newCount, setNewCount] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const iv = setInterval(() => {
      const {driftCasts} = useStore.getState()
      const hot = driftCasts.filter(c => c.tideCount > 500)
      if (!hot.length) return
      incTide(hot[Math.floor(Math.random()*hot.length)].id)
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setNewCount(n => n+1), 25000)
    return () => clearInterval(iv)
  }, [])

  const filtered = filter === 'all' ? casts : casts.filter(c => c.mode === filter)

  return (
    <div className="drift-col">
      <div className="drift-filter-bar">
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.12em',textTransform:'uppercase',flexShrink:0,marginRight:'4px'}}>DRIFT</span>
        {FILTERS.map(f => (
          <button key={f.id} className={`chip ${filter===f.id?'active':''}`}
            style={{fontSize:'10px',padding:'3px 9px',flexShrink:0}}
            onClick={() => setFilter(f.id as any)}>
            {f.label}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'4px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',opacity:0.7,flexShrink:0}}>
          <div style={{width:'4px',height:'4px',borderRadius:'50%',background:'var(--teal)',animation:'pulse 2.5s ease-in-out infinite'}}/>
          live
        </div>
      </div>

      {newCount > 0 && (
        <button onClick={() => {setNewCount(0);feedRef.current?.scrollTo({top:0,behavior:'smooth'})}}
          style={{border:'none',borderBottom:'1px solid var(--border3)',background:'rgba(0,191,238,0.07)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',padding:'6px',cursor:'pointer',letterSpacing:'0.04em',flexShrink:0}}>
          ↑ {newCount} new cast{newCount>1?'s':''} surfacing
        </button>
      )}

      <div className="drift-feed" ref={feedRef}>
        {!vessel && (
          <div style={{margin:'10px 12px',padding:'10px 12px',background:'rgba(0,191,238,0.04)',border:'1px solid var(--border2)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.6}}>
            Open the <strong style={{color:'var(--text)',fontWeight:500}}>Vessel</strong> panel to launch yours. You need a vessel to read or cast.
          </div>
        )}
        {filtered.map((cast,i) => <CastRow key={cast.id} cast={cast} index={i} hasVessel={!!vessel}/>)}
        {filtered.length > 0 && (
          <div style={{padding:'16px',textAlign:'center',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.06em'}}>
            {formatTide(filtered.reduce((a,c)=>a+c.tideCount,0))} reads · the tide decides
          </div>
        )}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div style={{opacity:0.2}}><IconOpen size={28} color="var(--teal)"/></div>
            <div>nothing in the tide</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CAST ROW ─────────────────────────────────────────────────

function CastRow({cast, index, hasVessel}:{cast:Cast;index:number;hasVessel:boolean}) {
  const markCastRead = useStore((s) => s.markCastRead)
  const burnCast     = useStore((s) => s.burnCast)
  const debitHarbor  = useStore((s) => s.debitHarbor)
  const { pay, status } = use402({amount:1000})

  const [showMap,      setShowMap]      = useState(false)
  const [confirm,      setConfirm]      = useState(false)
  const [mapVal,       setMapVal]       = useState('')
  const [mapError,     setMapError]     = useState(false)
  const [burnConfirm,  setBurnConfirm]  = useState(false) // reader burn after reading
  const [burnCount,    setBurnCount]    = useState<number|null>(null)

  const isPending  = status === 'pending'
  const isUnlocked = cast.body !== undefined
  const isEyes     = cast.mode === 'eyes_only'
  const isOpen     = cast.mode === 'open'
  const expiry     = timeUntilExpiry(cast.expiresAt)
  const lhPct      = Math.min(100,(cast.tideCount/1_000_000)*100)

  const modeIcon  = isEyes ? <IconEye size={10} color="var(--eyes)"/> : <IconOpen size={10} color="var(--teal)"/>
  const modeCls   = isEyes ? 'eyes' : 'open'
  const modeLabel = isEyes ? 'Eyes Only' : 'Open'

  const startBurnCountdown = () => {
    setBurnCount(4)
    const iv = setInterval(() => {
      setBurnCount(n => {
        if (n === null || n <= 1) { clearInterval(iv); burnCast(cast.id); return null }
        return n - 1
      })
    }, 1000)
  }

  const doUnlock = async () => {
    if (!hasVessel || isUnlocked || isPending || cast.burned) return
    if (isEyes && mapVal.trim().length < 3) { setMapError(true); return }
    const receipt = await pay()
    if (receipt) {
      debitHarbor(0.1)
      markCastRead(cast.id, cast.body ?? cast.hook)
      setConfirm(false); setShowMap(false); setMapError(false)
    }
  }

  const doReaderBurn = () => {
    setBurnConfirm(false)
    startBurnCountdown()
  }

  if (cast.burned) return (
    <div className="cast-row burned">
      <div className="cast-gutter">
        <div className="cast-mode-dot burn"><IconFlame size={9} color="var(--burn)"/></div>
      </div>
      <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-off)',fontStyle:'italic'}}>
        consumed by the tide
      </span>
    </div>
  )

  return (
    <div className="cast-row" style={{animationDelay:`${Math.min(index,8)*40}ms`}}>
      <div className="cast-gutter">
        <div className={`cast-mode-dot ${modeCls}`}>{modeIcon}</div>
        <div className="cast-thread-line"/>
      </div>

      <div className="cast-content">
        {/* Badges */}
        <div className="cast-badges">
          <span className={`badge badge-${modeCls}`}>{modeIcon}&nbsp;{modeLabel}</span>
          {isEyes && <span className="badge badge-eyes" style={{gap:'3px'}}><IconDock size={9} color="var(--eyes)"/> map req.</span>}
          <span className="badge badge-time">{formatTimeAgo(cast.createdAt)}</span>
          {expiry.urgent && !expiry.dead && <span className="cast-expiry-urgent">{expiry.label}</span>}
          <span className="cast-tide">{formatTide(cast.tideCount)}</span>
        </div>

        {/* Hook — always visible, free */}
        <div className="cast-hook">{cast.hook}</div>

        {/* ── NOT YET UNLOCKED ── */}
        {!isUnlocked && !confirm && !showMap && (
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'6px'}}>
            {hasVessel ? (
              <button
                className="btn btn-outline btn-sm"
                style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px'}}
                onClick={() => isEyes ? setShowMap(true) : setConfirm(true)}
              >
                <IconLock size={11} color="currentColor"/>
                {isEyes ? 'Read — map required' : 'Read'}
              </button>
            ) : (
              <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-off)'}}>
                vessel required to read
              </span>
            )}
            {hasVessel && <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>$0.001</span>}
          </div>
        )}

        {/* ── CONFIRM READ ── */}
        {confirm && !isUnlocked && (
          <div style={{marginTop:'6px',padding:'10px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius)'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',marginBottom:'2px'}}>Read this cast?</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'10px'}}>$0.001 · vessel → relay → cast · cannot be undone</div>
            <div style={{display:'flex',gap:'6px'}}>
              <button className="btn btn-primary btn-sm" onClick={doUnlock} disabled={isPending}>
                {isPending ? <><span className="spinner"/>reading...</> : 'Confirm read · $0.001'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>cancel</button>
            </div>
          </div>
        )}

        {/* ── MAP INPUT — EYES ONLY ── */}
        {showMap && !isUnlocked && (
          <div style={{marginTop:'6px',padding:'10px',background:'var(--surface2)',border:`1px solid ${mapError ? 'rgba(255,58,92,0.3)' : 'rgba(255,176,32,0.2)'}`,borderRadius:'var(--radius)',display:'flex',flexDirection:'column',gap:'8px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:mapError?'var(--burn)':'var(--eyes)',display:'flex',alignItems:'center',gap:'6px'}}>
              <IconEye size={11} color={mapError?'var(--burn)':'var(--eyes)'}/>
              {mapError ? 'Vessel not mapped to this Dock' : 'Eyes Only — enter your Dock map'}
            </div>
            {mapError && (
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--burn)',lineHeight:1.6,padding:'6px 8px',background:'var(--burn-dim)',border:'1px solid rgba(255,58,92,0.15)',borderRadius:'var(--radius)'}}>
                Your vessel does not have access to this cast. The sender controls who can read it.
              </div>
            )}
            <input className="map-input" placeholder="Dock ID or map address..."
              value={mapVal}
              onChange={e => { setMapVal(e.target.value); setMapError(false) }}
              onKeyDown={e => e.key === 'Enter' && mapVal.trim() && doUnlock()}
              autoFocus
            />
            <div style={{display:'flex',gap:'6px'}}>
              <button className="btn btn-primary btn-sm" onClick={doUnlock} disabled={isPending||!mapVal.trim()}>
                {isPending ? <><span className="spinner"/>checking...</> : 'Confirm read · $0.001'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowMap(false); setMapError(false); setMapVal('') }}>cancel</button>
            </div>
          </div>
        )}

        {/* ── UNLOCKED BODY ── */}
        {isUnlocked && (
          <>
            <div className="cast-body-revealed">
              {(cast.body??'').split('\n\n').map((p,i) => (
                <p key={i} style={{margin:i>0?'8px 0 0':'0'}}>{p}</p>
              ))}
            </div>

            {/* Burn countdown */}
            {burnCount !== null && (
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'6px',padding:'7px 10px',background:'var(--burn-dim)',border:'1px solid rgba(255,58,92,0.2)',borderRadius:'var(--radius)'}}>
                <IconFlame size={11} color="var(--burn)"/>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--burn)'}}>burning in {burnCount}…</span>
                <div style={{flex:1,height:'2px',background:'rgba(255,58,92,0.15)',borderRadius:'1px',overflow:'hidden'}}>
                  <div style={{height:'100%',background:'var(--burn)',width:`${(burnCount/4)*100}%`,transition:'width 1s linear',borderRadius:'1px'}}/>
                </div>
              </div>
            )}

            {/* Reader burn option — shown after reading, before any burn action */}
            {burnCount === null && !burnConfirm && !cast.burned && (
              <button
                onClick={() => setBurnConfirm(true)}
                style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'6px',padding:'4px 8px',background:'none',border:'1px solid rgba(255,58,92,0.15)',borderRadius:'var(--radius)',color:'var(--burn)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',width:'fit-content',opacity:0.7}}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >
                <IconFlame size={10} color="var(--burn)"/> burn after reading
              </button>
            )}

            {/* Reader burn confirm */}
            {burnConfirm && burnCount === null && (
              <div style={{marginTop:'6px',padding:'10px',background:'var(--burn-dim)',border:'1px solid rgba(255,58,92,0.25)',borderRadius:'var(--radius)'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--burn)',marginBottom:'3px'}}>Burn this cast?</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'10px'}}>It will be gone from the protocol. Cannot be undone.</div>
                <div style={{display:'flex',gap:'6px'}}>
                  <button className="btn btn-danger btn-sm" onClick={doReaderBurn}>Confirm burn</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setBurnConfirm(false)}>cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Lighthouse progress — open casts only */}
        {isOpen && cast.tideCount >= 10000 && (
          <div className="lh-bar-row">
            <div className="lh-bar-track"><div className="lh-bar-fill" style={{width:`${lhPct}%`}}/></div>
            <span className="lh-bar-label">
              {cast.tideCount >= 1_000_000 ? 'lighthouse' : `${lhPct.toFixed(1)}% to lighthouse`}
            </span>
          </div>
        )}
      </div>

      {/* Wreck — visible, with confirm */}
      <button
        className="cast-wreck-btn"
        onClick={e => { e.stopPropagation(); if (window.confirm('Wreck this cast? It goes to the void.')) burnCast(cast.id) }}
      >
        wreck
      </button>
    </div>
  )
}
