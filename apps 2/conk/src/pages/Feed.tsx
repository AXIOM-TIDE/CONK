import { useState, useEffect, useRef } from 'react'
import { useStore, type Cast, type CastMode } from '../store/store'
import { formatTide, timeUntilExpiry, formatTimeAgo, castDurationMs } from '../utils/scrubber'
import { use402, useSoundCast } from '../hooks/use402'
import type { View } from '../App'

const MODE_ICON: Record<CastMode, string> = {
  open: '◎', sealed: '⬡', eyes_only: '👁', ghost: '◌'
}
const MODE_LABEL: Record<CastMode, string> = {
  open: 'open', sealed: 'sealed', eyes_only: 'eyes only', ghost: 'ghost'
}
const FILTERS: { id: 'all' | CastMode; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'open', label: '◎ open' },
  { id: 'eyes_only', label: '👁 eyes' },
  { id: 'ghost', label: '◌ ghost' },
]

interface FeedProps {
  view: View
  setView: (v: View) => void
  onHarborClick: () => void
}

export function Feed({ view, setView, onHarborClick }: FeedProps) {
  const harbor  = useStore((s) => s.harbor)
  const vessel  = useStore((s) => s.vessel)
  const casts   = useStore((s) => s.driftCasts)
  const filter  = useStore((s) => s.driftFilter)
  const setFilter = useStore((s) => s.setDriftFilter)
  const incrementTide = useStore((s) => s.incrementTide)
  const setVessel = useStore((s) => s.setVessel)
  const setHarbor = useStore((s) => s.setHarbor)
  const setOnboarded = useStore((s) => s.setOnboarded)

  // Compose state
  const [composeHook, setComposeHook] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeMode, setComposeMode] = useState<CastMode>('open')
  const [composeDur,  setComposeDur]  = useState<'24h'|'48h'|'72h'|'7d'>('24h')
  const [showOptions, setShowOptions] = useState(false)
  const [newCount, setNewCount]       = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { sound, status: soundStatus } = useSoundCast()
  const isSending = soundStatus === 'pending'

  // Live tide ticker
  useEffect(() => {
    const iv = setInterval(() => {
      const { driftCasts } = useStore.getState()
      const hot = driftCasts.filter(c => c.tideCount > 500)
      if (!hot.length) return
      const pick = hot[Math.floor(Math.random() * hot.length)]
      incrementTide(pick.id)
    }, 2800)
    return () => clearInterval(iv)
  }, [])

  // New cast notifier
  useEffect(() => {
    const iv = setInterval(() => setNewCount(n => n + 1), 20000)
    return () => clearInterval(iv)
  }, [])

  const filtered = filter === 'all' ? casts : casts.filter(c => c.mode === filter)

  const handleSend = async () => {
    if (!composeHook.trim()) return
    const ok = await sound({
      hook: composeHook.trim(),
      body: composeBody.trim() || composeHook.trim(),
      mode: composeMode,
      duration: composeDur,
    })
    if (ok) {
      setComposeHook('')
      setComposeBody('')
      setShowOptions(false)
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const balanceDollars = harbor ? (harbor.balance / 100).toFixed(2) : '0.00'

  return (
    <>
      {/* ── Harbor bar ── */}
      <div className="harbor-bar">
        <span className="harbor-wordmark">CONK</span>

        {/* Tab buttons */}
        <div style={{ display:'flex', gap:'4px', marginLeft:'10px' }}>
          {(['feed','dock','siren'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: view === v ? 'var(--teal-dim)' : 'none',
                border: `1px solid ${view === v ? 'var(--border3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: view === v ? 'var(--teal)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '3px 8px',
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Balance pill */}
        <div className="harbor-balance" onClick={onHarborClick}>
          <div className="harbor-balance-dot" />
          <span className="harbor-balance-num">${balanceDollars}</span>
          <span className="harbor-balance-label">USDC</span>
        </div>

        {/* Vessel indicator */}
        {vessel && (
          <div className="harbor-vessel-pill">
            <div className={`vessel-tier-dot ${vessel.tier}`} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px' }}>{vessel.tier}</span>
          </div>
        )}
      </div>

      {/* ── Filter strip ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 14px', borderBottom:'1px solid var(--border)', overflowX:'auto', scrollbarWidth:'none', background:'var(--bg)', flexShrink:0 }}>
        {FILTERS.map(f => (
          <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id as any)} style={{ flexShrink:0 }}>
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft:'auto', flexShrink:0, display:'flex', alignItems:'center', gap:'5px', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--teal)' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'var(--teal)', animation:'hbPulse 2s ease-in-out infinite' }} />
          live
        </div>
      </div>

      {/* ── New casts banner ── */}
      {newCount > 0 && (
        <button
          onClick={() => { setNewCount(0); feedRef.current?.scrollTo({ top:0, behavior:'smooth' }) }}
          style={{ background:'rgba(0,191,238,0.08)', border:'none', borderBottom:'1px solid var(--border3)', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'11px', padding:'7px', width:'100%', cursor:'pointer', letterSpacing:'0.04em', flexShrink:0 }}>
          ↑ {newCount} new cast{newCount > 1 ? 's' : ''} in the tide
        </button>
      )}

      {/* ── Cast feed ── */}
      <div className="feed" ref={feedRef}>
        {filtered.length === 0 && (
          <div className="empty">
            <div style={{ fontSize:'24px', opacity:0.3 }}>◎</div>
            <div>nothing in the tide</div>
            <div style={{ color:'var(--text-off)' }}>sound something</div>
          </div>
        )}
        {filtered.map((cast, i) => (
          <CastRow key={cast.id} cast={cast} index={i} />
        ))}

        {/* Feed footer */}
        {filtered.length > 0 && (
          <div style={{ padding:'20px 14px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', letterSpacing:'0.06em' }}>
            {formatTide(filtered.reduce((a,c) => a + c.tideCount, 0))} total reads · the tide decides
          </div>
        )}
      </div>

      {/* ── Compose area ── */}
      <div className="compose-area">
        {showOptions && (
          <div style={{ marginBottom:'10px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {/* Body input */}
            <textarea
              className="input"
              rows={3}
              placeholder="Body (optional — $0.001 to read)..."
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
            />
            {/* Mode + duration */}
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center' }}>
              {(['open','eyes_only','ghost'] as CastMode[]).map(m => (
                <button key={m} className={`chip ${composeMode === m ? 'active' : ''}`}
                  onClick={() => setComposeMode(m)} style={{ fontSize:'10px' }}>
                  {MODE_ICON[m]} {MODE_LABEL[m]}
                </button>
              ))}
              <div style={{ marginLeft:'auto', display:'flex', gap:'4px' }}>
                {(['24h','48h','7d'] as const).map(d => (
                  <button key={d} className={`chip ${composeDur === d ? 'active' : ''}`}
                    onClick={() => setComposeDur(d)} style={{ fontSize:'10px', padding:'3px 8px' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)', display:'flex', gap:'12px' }}>
              <span>sound cast · <span style={{ color:'var(--teal)' }}>$0.001</span></span>
              <span>read · <span style={{ color:'var(--teal)' }}>$0.001</span></span>
              <span>mode: <span style={{ color:'var(--teal)' }}>{composeMode}</span></span>
            </div>
          </div>
        )}
        <div className="compose-box">
          <textarea
            ref={inputRef}
            className="compose-input"
            placeholder={showOptions ? "Hook — the line they see first..." : "Sound something into the tide..."}
            value={composeHook}
            rows={1}
            onChange={e => {
              setComposeHook(e.target.value)
              if (!showOptions && e.target.value.length > 0) setShowOptions(true)
              // Auto-resize
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={handleKeyDown}
          />
          <button className="compose-send" onClick={handleSend} disabled={isSending || !composeHook.trim()}>
            {isSending ? <span className="spinner" /> : '↑'}
          </button>
        </div>
        {composeHook.length > 0 && (
          <div style={{ paddingTop:'6px', display:'flex', gap:'6px', alignItems:'center' }}>
            <button className={`compose-opt-btn ${showOptions ? 'active' : ''}`} onClick={() => setShowOptions(!showOptions)}>
              {showOptions ? '▲ less' : '▼ more options'}
            </button>
            <button className="compose-opt-btn" onClick={() => { setComposeHook(''); setComposeBody(''); setShowOptions(false) }}>
              clear
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── CAST ROW ─────────────────────────────────────────────────

function CastRow({ cast, index }: { cast: Cast; index: number }) {
  const markCastRead = useStore((s) => s.markCastRead)
  const burnCast     = useStore((s) => s.burnCast)
  const harbor       = useStore((s) => s.harbor)
  const { pay, status } = use402({ amount: 1000 })
  const isPending = status === 'pending'
  const isUnlocked = cast.body !== undefined
  const expiry = timeUntilExpiry(cast.expiresAt)
  const lhPct = Math.min(100, (cast.tideCount / 1_000_000) * 100)

  const handleUnlock = async () => {
    if (isUnlocked || isPending || cast.burned) return
    const receipt = await pay()
    if (receipt) {
      markCastRead(cast.id, cast.body ?? cast.hook)
      if (cast.mode === 'ghost' || cast.mode === 'eyes_only') {
        setTimeout(() => burnCast(cast.id), 4000)
      }
    }
  }

  const handleWreck = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Wreck this cast? It goes to the void.')) {
      burnCast(cast.id)
    }
  }

  if (cast.burned) {
    return (
      <div className="cast-row burned">
        <div className="cast-row-gutter">
          <div className="cast-mode-icon ghost">◌</div>
        </div>
        <div className="cast-body-col">
          <span className="cast-hook-line" style={{ color:'var(--text-off)', fontStyle:'italic' }}>
            consumed by the tide · sent to the void
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="cast-row" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      {/* Gutter */}
      <div className="cast-row-gutter">
        <div className={`cast-mode-icon ${cast.mode === 'eyes_only' ? 'eyes' : cast.mode}`}>
          {MODE_ICON[cast.mode]}
        </div>
        <div className="cast-tier-line" />
      </div>

      {/* Body */}
      <div className="cast-body-col">
        <div className="cast-meta-line">
          <span className={`cast-meta-tag ${cast.mode === 'open' ? 'teal' : cast.mode === 'ghost' || cast.mode === 'eyes_only' ? 'burn' : 'sealed'}`}>
            {MODE_LABEL[cast.mode]}
          </span>
          <span className="cast-meta-tag">{formatTimeAgo(cast.createdAt)}</span>
          {expiry.urgent && <span className="cast-meta-tag burn">{expiry.label}</span>}
          <span className="cast-tide-count">
            {formatTide(cast.tideCount)} reads
          </span>
        </div>

        <div className="cast-hook-line">{cast.hook}</div>

        {/* Body — locked / unlocked / burn states */}
        {isUnlocked ? (
          <>
            <div className="cast-revealed">
              {(cast.body ?? '').split('\n\n').map((p, i) => (
                <p key={i} style={{ margin: i > 0 ? '8px 0 0' : '0' }}>{p}</p>
              ))}
            </div>
            {(cast.mode === 'ghost' || cast.mode === 'eyes_only') && (
              <div className="burn-warning">⚡ this cast is burning · going to the void</div>
            )}
          </>
        ) : (
          <button className="cast-unlock-row" onClick={handleUnlock} disabled={isPending}>
            {isPending
              ? <><span className="spinner" /><span>relaying...</span></>
              : <><span style={{ opacity:0.5 }}>🔒</span><span>read full cast · $0.001</span></>
            }
          </button>
        )}

        {/* Lighthouse progress */}
        {cast.tideCount >= 10000 && (
          <div className="lh-progress-row">
            <div className="lh-progress-track">
              <div className="lh-progress-fill" style={{ width:`${lhPct}%` }} />
            </div>
            <span className="lh-progress-label">
              {cast.tideCount >= 1_000_000 ? '🔆 lighthouse' : `${lhPct.toFixed(1)}% to lighthouse`}
            </span>
          </div>
        )}
      </div>

      {/* Wreck button — own casts only, shown on hover */}
      <button className="cast-wreck-btn" onClick={handleWreck}>wreck</button>
    </div>
  )
}
