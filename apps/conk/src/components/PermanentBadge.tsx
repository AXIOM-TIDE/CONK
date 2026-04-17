/**
 * PermanentBadge — shown on lighthouses published permanently by a creator.
 * Visually distinct from DecayBadge — no timer, anchor icon, solid teal.
 *
 * Drop into apps/conk/src/components/PermanentBadge.tsx
 */

interface Props {
  size?:      'sm' | 'md'
  showIcon?:  boolean
  label?:     string
}

export function PermanentBadge({
  size      = 'sm',
  showIcon  = true,
  label     = 'permanent',
}: Props) {
  const fs = size === 'md' ? '11px' : '9px'
  const ds = size === 'md' ? '8px'  : '6px'

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '4px',
      fontFamily:    'var(--font-mono)',
      fontSize:      fs,
      color:         'var(--teal)',
      letterSpacing: '0.04em',
    }}>
      {showIcon && (
        <AnchorIcon size={size === 'md' ? 9 : 7}/>
      )}
      {label}
    </span>
  )
}

/** Full badge pill — used on lighthouse cards */
export function PermanentPill({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      gap:             '4px',
      fontFamily:      'var(--font-mono)',
      fontSize:        size === 'md' ? '11px' : '9px',
      color:           'var(--teal)',
      background:      'rgba(0,184,230,0.08)',
      border:          '1px solid rgba(0,184,230,0.2)',
      borderRadius:    '4px',
      padding:         size === 'md' ? '2px 7px' : '1px 5px',
      letterSpacing:   '0.06em',
    }}>
      <AnchorIcon size={size === 'md' ? 9 : 7}/>
      anchored · permanent
    </span>
  )
}

/** Anchor icon — SVG inline, no external deps */
function AnchorIcon({ size = 8 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="var(--teal)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {/* Circle top */}
      <circle cx="8" cy="4" r="2"/>
      {/* Vertical stem */}
      <line x1="8" y1="6" x2="8" y2="13"/>
      {/* Crossbar */}
      <line x1="4" y1="9" x2="12" y2="9"/>
      {/* Left curl */}
      <path d="M4 9 Q2 9 2 11 Q2 13 4 13"/>
      {/* Right curl */}
      <path d="M12 9 Q14 9 14 11 Q14 13 12 13"/>
    </svg>
  )
}
