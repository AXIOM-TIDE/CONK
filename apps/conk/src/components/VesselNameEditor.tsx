/**
 * VesselNameEditor
 * Drop into apps/conk/src/components/VesselNameEditor.tsx
 *
 * Lets a user set a display name and avatar color for their vessel.
 * Name is stored locally only — never linked to identity on-chain.
 * Shows in cast feeds, channel headers, and the Beacon profile.
 */

import { useState } from 'react'
import { useStore } from '../store/store'

const AVATAR_COLORS = [
  '#00B8E6',  // teal (default)
  '#5E4FE8',  // sealed purple
  '#FF2D55',  // burn red
  '#FFB020',  // amber
  '#34C759',  // green
  '#FF9F0A',  // orange
  '#BF5AF2',  // violet
  '#FF6B6B',  // coral
]

interface Props {
  vesselId:  string
  onClose?:  () => void
}

export function VesselNameEditor({ vesselId, onClose }: Props) {
  const vessels      = useStore((s) => s.vessels)
  const setVesselName = useStore((s) => s.setVesselName)

  const vessel = vessels?.find((v: any) => v.id === vesselId)
    ?? useStore.getState().vessel

  const [name,  setName]  = useState(vessel?.displayName ?? '')
  const [color, setColor] = useState(vessel?.avatarColor ?? AVATAR_COLORS[0])
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!name.trim() && !color) return
    setVesselName(vesselId, name.trim().slice(0, 32), color)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose?.()
    }, 800)
  }

  const preview = name.trim() || vessel?.id?.slice(0, 8) + '…'

  return (
    <div style={{
      padding:      '14px',
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
    }}>

      {/* Preview */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
        <div style={{
          width:'36px', height:'36px', borderRadius:'50%',
          background:   `${color}20`,
          border:       `1.5px solid ${color}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-mono)', fontSize:'13px', color,
          flexShrink:0,
        }}>
          {preview.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600 }}>
            {preview}
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
            vessel · {vessel?.class ?? 'unknown'}
          </div>
        </div>
      </div>

      {/* Name input */}
      <div style={{ marginBottom:'10px' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginBottom:'5px', letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Display name <span style={{ color:'var(--text-dim)' }}>(optional · max 32 chars)</span>
        </div>
        <input
          value={name}
          onChange={e => { setName(e.target.value.slice(0, 32)); setSaved(false) }}
          placeholder="anonymous"
          style={{
            width:'100%', boxSizing:'border-box',
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', padding:'8px 10px',
            fontFamily:'var(--font-mono)', fontSize:'11px',
            color:'var(--text)', outline:'none',
          }}
        />
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'4px' }}>
          never stored on-chain · local label only · does not affect anonymity
        </div>
      </div>

      {/* Color picker */}
      <div style={{ marginBottom:'14px' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginBottom:'6px', letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Avatar color
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {AVATAR_COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); setSaved(false) }}
              style={{
                width:'24px', height:'24px', borderRadius:'50%',
                background: c,
                border: color === c ? `2px solid var(--text)` : '2px solid transparent',
                cursor:'pointer', padding:0, flexShrink:0,
                boxShadow: color === c ? `0 0 8px ${c}80` : 'none',
                transition:'all 0.15s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:'8px' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              flex:1, padding:'9px',
              background:'none', border:'1px solid var(--border2)',
              borderRadius:'var(--radius)', color:'var(--text-dim)',
              fontFamily:'var(--font-mono)', fontSize:'11px', cursor:'pointer',
            }}
          >
            cancel
          </button>
        )}
        <button
          onClick={handleSave}
          style={{
            flex:2, padding:'9px',
            background: saved ? 'rgba(0,184,230,0.15)' : 'var(--teal)',
            border:'none', borderRadius:'var(--radius)',
            color: saved ? 'var(--teal)' : 'var(--text-inv)',
            fontFamily:'var(--font-mono)', fontSize:'11px',
            fontWeight:600, cursor:'pointer', letterSpacing:'0.04em',
            transition:'all 0.2s',
          }}
        >
          {saved ? '✓ saved' : 'save name'}
        </button>
      </div>
    </div>
  )
}

// ─── Vessel avatar display (use anywhere in the UI) ───────────────────────────

export function VesselAvatar({
  vessel,
  size = 32,
}: {
  vessel: { displayName?: string; avatarColor?: string; id: string; class?: string }
  size?:  number
}) {
  const color  = vessel.avatarColor ?? AVATAR_COLORS[0]
  const letter = (vessel.displayName ?? vessel.id).slice(0, 1).toUpperCase()

  return (
    <div style={{
      width:        `${size}px`,
      height:       `${size}px`,
      borderRadius: '50%',
      background:   `${color}20`,
      border:       `1.5px solid ${color}`,
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      fontFamily:   'var(--font-mono)',
      fontSize:     `${Math.round(size * 0.38)}px`,
      color,
      flexShrink:   0,
    }}>
      {letter}
    </div>
  )
}
