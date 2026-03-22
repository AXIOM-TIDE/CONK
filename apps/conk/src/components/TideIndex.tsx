/**
 * CONK Tide Index
 * Real-time signal quality leaderboard.
 * No algorithm. No editor. Pure economic signal.
 * What agents and humans are actually paying to read — right now.
 */
import { useState, useEffect } from 'react'
import { useStore } from '../store/store'
import { formatTide, getTideState, castDurationMs } from '../utils/scrubber'

const SURGE_THRESHOLD    = 1_000_000
const SUSTAINED_DAILY    = 500

function TideBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct > 80 ? '#FF6B35' : pct > 50 ? 'var(--teal)' : 'rgba(0,184,230,0.5)'
  return (
    <div style={{height:'3px',background:'var(--surface2)',borderRadius:'2px',overflow:'hidden',flex:1}}>
      <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'2px',transition:'width 0.5s ease',boxShadow:`0 0 4px ${color}`}}/>
    </div>
  )
}

export function TideIndex() {
  const casts = useStore((s) => s.driftCasts)
  const [view, setView] = useState<'surge'|'sustained'|'rising'>('surge')

  const now = Date.now()

  const ranked = casts
    .filter(c => !c.burned && c.expiresAt > now)
    .map(c => ({
      ...c,
      velocity: c.tideCount / Math.max(1, (now - c.createdAt) / 3600000), // reads per hour
      tideState: getTideState(c.createdAt, castDurationMs(c.duration)),
      surgeProgress: c.tideCount / SURGE_THRESHOLD,
      sustainedProgress: Math.min(c.tideReads[0], SUSTAINED_DAILY) / SUSTAINED_DAILY,
    }))
    .sort((a, b) => {
      if (view === 'surge') return b.tideCount - a.tideCount
      if (view === 'sustained') return (b.tideReads[1] ?? 0) - (a.tideReads[1] ?? 0)
      return b.velocity - a.velocity
    })
    .slice(0, 10)

  const maxTide = Math.max(...ranked.map(c => c.tideCount), 1)

  return (
    <div style={{padding:'16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
        <div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:700,color:'var(--text)',letterSpacing:'0.04em'}}>
            ⚡ TIDE INDEX
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',letterSpacing:'0.06em'}}>
            no algorithm · pure signal
          </div>
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          {(['surge','sustained','rising'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{padding:'3px 8px',background:view===v?'rgba(0,184,230,0.15)':'none',border:`1px solid ${view===v?'var(--border3)':'transparent'}`,borderRadius:'var(--radius)',color:view===v?'var(--teal)':'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'8px',cursor:'pointer',letterSpacing:'0.04em',textTransform:'uppercase'}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <div style={{textAlign:'center',padding:'20px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-off)'}}>
          No signals in the index yet
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {ranked.map((cast, i) => (
            <div key={cast.id} style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:700,color:i===0?'#FF6B35':i===1?'var(--teal)':i===2?'rgba(0,184,230,0.6)':'var(--text-off)',width:'18px',textAlign:'center',flexShrink:0}}>
                {i+1}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'3px'}}>
                  {cast.hook}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <TideBar value={cast.tideCount} max={maxTide}/>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',flexShrink:0,minWidth:'48px',textAlign:'right'}}>
                    {formatTide(cast.tideCount)}
                  </span>
                </div>
              </div>
              {cast.tideCount >= SURGE_THRESHOLD * 0.8 && (
                <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'#FF6B35',flexShrink:0,animation:'fuelPulse 1.5s ease-in-out infinite'}}>
                  🔥
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:'12px',paddingTop:'10px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',lineHeight:1.6}}>
          Surge path: 1M reads / 24h → Lighthouse<br/>
          Sustained: 500 reads × 3 tides → Lighthouse
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',textAlign:'right'}}>
          {ranked.length} signals<br/>
          tracked
        </div>
      </div>
    </div>
  )
}
