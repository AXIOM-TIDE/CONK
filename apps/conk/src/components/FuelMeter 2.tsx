import { useEffect, useRef, useState } from 'react'

// ─── PREMIUM FUEL BAR ─────────────────────────────────────────
// Glow shifts: cyan (healthy) → blue (fading) → amber → red (critical) → dark (dry)

interface FuelBarProps {
  value: number      // cents
  max?: number       // cents, default 100 ($1.00)
  width?: number
  showLabel?: boolean
  animate?: boolean
  onClick?: () => void
}

export function FuelBar({ value, max = 100, width = 80, showLabel = false, animate = true, onClick }: FuelBarProps) {
  const pct       = Math.max(0, Math.min(100, (value / max) * 100))
  const prev      = useRef(pct)
  const [display, setDisplay] = useState(pct)

  // Animate bar change
  useEffect(() => {
    if (!animate || prev.current === pct) { setDisplay(pct); prev.current = pct; return }
    const start = prev.current
    const end   = pct
    const dur   = 400
    const t0    = performance.now()
    const tick  = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplay(start + (end - start) * e)
      if (p < 1) requestAnimationFrame(tick)
      else { prev.current = end; setDisplay(end) }
    }
    requestAnimationFrame(tick)
  }, [pct])

  const isDry      = value <= 0
  const isCritical = pct > 0 && pct <= 20
  const isFading   = pct > 20 && pct <= 50
  const isStable   = pct > 50

  const barColor = isDry      ? 'rgba(255,255,255,0.08)'
                 : isCritical ? 'linear-gradient(90deg,#FF3A5C,#FF6B35)'
                 : isFading   ? 'linear-gradient(90deg,#1860FF,#00B8E6)'
                 : 'linear-gradient(90deg,#00B8E6,#14D4FF)'

  const glowColor = isDry      ? 'none'
                  : isCritical ? '0 0 8px rgba(255,58,92,0.7)'
                  : isFading   ? '0 0 8px rgba(24,96,255,0.5)'
                  : '0 0 10px rgba(0,184,230,0.65)'

  const pulseSpeed = isDry ? '0' : isCritical ? '1.2s' : isFading ? '2.5s' : '3.5s'

  return (
    <div
      onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:'7px', cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{
        width, height:'5px',
        background:'rgba(255,255,255,0.06)',
        borderRadius:'3px',
        overflow:'hidden',
        position:'relative',
        flexShrink:0,
      }}>
        <div style={{
          position:'absolute', top:0, left:0, bottom:0,
          width:`${display}%`,
          background: barColor,
          borderRadius:'3px',
          boxShadow: glowColor,
          transition: animate ? 'width 0.4s cubic-bezier(0.16,1,0.3,1)' : 'none',
          animation: !isDry && pct > 0 ? `fuelPulse ${pulseSpeed} ease-in-out infinite` : 'none',
        }}/>
      </div>
      {showLabel && (
        <span style={{
          fontFamily:"'IBM Plex Mono', monospace",
          fontSize:'10px',
          fontWeight:600,
          color: isDry ? 'var(--text-off)' : isCritical ? 'var(--burn)' : isFading ? 'var(--blue)' : 'var(--teal)',
          minWidth:'36px',
          letterSpacing:'0.02em',
        }}>
          {isDry ? 'dry' : `$${(value/100).toFixed(2)}`}
        </span>
      )}
    </div>
  )
}

// ─── ARC METER (Harbor) ───────────────────────────────────────

interface ArcMeterProps {
  value: number
  max?: number
  size?: number
  label?: string
  sublabel?: string
}

export function ArcMeter({ value, max = 1000, size = 120, label, sublabel }: ArcMeterProps) {
  const pct    = Math.min(1, value / max)
  const radius = (size / 2) - 10
  const cx     = size / 2
  const cy     = size / 2

  const startAngle = 225
  const sweepAngle = 270
  const endAngle   = startAngle + sweepAngle * pct
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const arcPath = (start: number, end: number) => {
    const s = { x: cx + radius * Math.cos(toRad(start)), y: cy + radius * Math.sin(toRad(start)) }
    const e = { x: cx + radius * Math.cos(toRad(end)),   y: cy + radius * Math.sin(toRad(end))   }
    const large = (end - start) > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const color    = pct > 0.5 ? '#00B8E6' : pct > 0.2 ? '#FFB020' : '#FF3A5C'
  const glowClr  = pct > 0.5 ? 'rgba(0,184,230,0.5)' : pct > 0.2 ? 'rgba(255,176,32,0.5)' : 'rgba(255,58,92,0.5)'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size}`} style={{ overflow:'visible' }}>
        <path d={arcPath(startAngle, startAngle + sweepAngle)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round"/>
        {pct > 0 && (
          <path d={arcPath(startAngle, endAngle)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 4px ${glowClr})`, transition:'stroke 0.6s ease' }}/>
        )}
        {[0,0.25,0.5,0.75,1].map((t, i) => {
          const angle = startAngle + sweepAngle * t
          const inner = radius - 8, outer = radius - 2
          return (
            <line key={i}
              x1={cx + inner * Math.cos(toRad(angle))} y1={cy + inner * Math.sin(toRad(angle))}
              x2={cx + outer * Math.cos(toRad(angle))} y2={cy + outer * Math.sin(toRad(angle))}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
          )
        })}
        {label && (
          <text x={cx} y={cy - 4} textAnchor="middle"
            style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'15px', fontWeight:600, fill:color, transition:'fill 0.6s' }}>
            {label}
          </text>
        )}
        {sublabel && (
          <text x={cx} y={cy + 12} textAnchor="middle"
            style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'9px', fill:'rgba(255,255,255,0.3)', letterSpacing:'0.08em' }}>
            {sublabel}
          </text>
        )}
      </svg>
    </div>
  )
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────

export function AnimatedCounter({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    const start = prev.current, end = value, dur = 600, t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplay(start + (end - start) * e)
      if (p < 1) requestAnimationFrame(tick)
      else { prev.current = end; setDisplay(end) }
    }
    requestAnimationFrame(tick)
  }, [value])

  return <>{(display / 100).toFixed(decimals)}</>
}
