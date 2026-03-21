/**
 * DecayBadge — shows time remaining on any CONK object.
 * Color shifts: teal (stable) → amber (fading) → red (critical)
 */
import { useState, useEffect } from 'react'
import { timeUntilExpiry } from '../utils/scrubber'

interface Props {
  expiresAt: number
  size?: 'sm' | 'md'
  showIcon?: boolean
}

export function DecayBadge({ expiresAt, size = 'sm', showIcon = true }: Props) {
  const [expiry, setExpiry] = useState(timeUntilExpiry(expiresAt))

  useEffect(() => {
    const iv = setInterval(() => setExpiry(timeUntilExpiry(expiresAt)), 10000)
    return () => clearInterval(iv)
  }, [expiresAt])

  if (expiry.dead) return (
    <span style={{fontFamily:'var(--font-mono)', fontSize: size === 'md' ? '11px' : '9px', color:'var(--burn)', letterSpacing:'0.04em', opacity:0.6}}>
      expired
    </span>
  )

  const color   = expiry.urgent ? 'var(--burn)' : '#FFB020'
  const isStable = !expiry.urgent

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'4px',
      fontFamily:'var(--font-mono)',
      fontSize: size === 'md' ? '11px' : '9px',
      color: isStable ? 'var(--text-off)' : color,
      letterSpacing:'0.04em',
    }}>
      {showIcon && (
        <span style={{
          display:'inline-block',
          width: size === 'md' ? '6px' : '5px',
          height: size === 'md' ? '6px' : '5px',
          borderRadius:'50%',
          background: isStable ? 'var(--text-off)' : color,
          boxShadow: isStable ? 'none' : `0 0 4px ${color}`,
          opacity: isStable ? 0.4 : 1,
          animation: expiry.urgent ? 'livePulse 1.5s ease-in-out infinite' : 'none',
          flexShrink:0,
        }}/>
      )}
      {expiry.label}
    </span>
  )
}

// Full decay bar — used on vessel/cast cards
export function DecayBar({ expiresAt, createdAt }: { expiresAt: number; createdAt: number }) {
  const total   = expiresAt - createdAt
  const elapsed = Date.now() - createdAt
  const pct     = Math.max(0, Math.min(100, (1 - elapsed/total) * 100))
  const expiry  = timeUntilExpiry(expiresAt)
  const color   = pct > 40 ? 'var(--teal)' : pct > 15 ? '#FFB020' : 'var(--burn)'

  return (
    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
      <div style={{flex:1, height:'2px', background:'var(--surface3)', borderRadius:'1px', overflow:'hidden'}}>
        <div style={{width:`${pct}%`, height:'100%', background:color, boxShadow:`0 0 4px ${color}`, transition:'width 1s linear', borderRadius:'1px'}}/>
      </div>
      <DecayBadge expiresAt={expiresAt}/>
    </div>
  )
}
