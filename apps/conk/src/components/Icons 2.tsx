/**
 * CONK Icon System
 * Clean SVG tech glyphs matching the circuit-shell logo aesthetic.
 * All icons use stroke only, 1.5px weight, #00BFEE teal by default.
 */

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

const defaults = { size: 20, color: 'currentColor', strokeWidth: 1.5 }

export function IconHarbor({ size=20, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  )
}

export function IconVessel({ size=20, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
    </svg>
  )
}

export function IconCast({ size=20, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/>
      <path d="M22 2L15 22 11 13 2 9l20-7z"/>
    </svg>
  )
}

export function IconDock({ size=20, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

export function IconSiren({ size=20, color='currentColor', strokeWidth=1.5 }: IconProps) {
  // Horn / bugle shape
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11V13"/>
      <path d="M3 12h2l6 5V7L5 12H3z"/>
      <path d="M15 8.5c1.5 1 2.5 2.1 2.5 3.5s-1 2.5-2.5 3.5"/>
      <path d="M18 6c2.5 1.5 4 3.5 4 6s-1.5 4.5-4 6"/>
    </svg>
  )
}

export function IconLighthouse({ size=20, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      <path d="M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"/>
    </svg>
  )
}

export function IconBurn({ size=14, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/>
      <path d="M12 12c0 3-2 4-2 7a2 2 0 0 0 4 0c0-3-2-4-2-7z"/>
    </svg>
  )
}

export function IconOpen({ size=10, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <circle cx="6" cy="6" r="4.5"/>
      <circle cx="6" cy="6" r="1.5" fill={color} stroke="none"/>
    </svg>
  )
}

export function IconEye({ size=10, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <ellipse cx="6" cy="6" rx="5" ry="3"/>
      <circle cx="6" cy="6" r="1.5" fill={color} stroke="none"/>
    </svg>
  )
}

export function IconFlame({ size=10, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <path d="M6 1.5c0 3-3 4-3 7a3 3 0 0 0 6 0c0-3-3-4-3-7z"/>
    </svg>
  )
}

export function IconLock({ size=12, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

export function IconClose({ size=14, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  )
}

export function IconFuel({ size=12, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14"/>
      <path d="M3 14h10"/>
      <path d="M15 6l4 4"/>
      <path d="M19 6v8a2 2 0 0 1-2 2h-2"/>
    </svg>
  )
}

export function IconBack({ size=14, color='currentColor', strokeWidth=1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
  )
}
