/**
 * WreckModal — global irreversible action confirmation.
 * Used for: burn vessel, burn harbor, wreck cast, leave dock, etc.
 * Tone: severe, premium, final.
 */
import { useState } from 'react'

interface Props {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function WreckModal({ title, description, confirmLabel = 'Confirm — wreck it', onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState('')
  const ready = typed.toLowerCase() === 'wreck'

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(1,6,8,0.92)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', animation:'fadeIn 0.15s ease'
    }}>
      <div style={{
        width:'100%', maxWidth:'400px',
        background:'var(--surface)', border:'1px solid var(--burn-line)',
        borderRadius:'var(--radius-xl)', overflow:'hidden',
        boxShadow:'0 0 40px rgba(255,45,85,0.12)',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px',
          background:'var(--burn-dim)',
          borderBottom:'1px solid var(--burn-line)',
          display:'flex', alignItems:'center', gap:'10px'
        }}>
          <span style={{fontSize:'18px'}}>⚠</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600, color:'var(--burn)', letterSpacing:'0.04em'}}>
            {title}
          </span>
        </div>

        <div style={{padding:'20px'}}>
          {/* Description */}
          <p style={{fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text-dim)', lineHeight:1.7, marginBottom:'16px'}}>
            {description}
          </p>

          {/* Void warning */}
          <div style={{padding:'10px 12px', background:'rgba(255,45,85,0.05)', border:'1px solid rgba(255,45,85,0.1)', borderRadius:'var(--radius)', marginBottom:'16px'}}>
            {[
              'This action is irreversible.',
              'All linked value sinks to the void.',
              'No refunds. No recovery.',
              'Customer service does not exist for this action.',
            ].map((line, i) => (
              <div key={i} style={{fontFamily:'var(--font-mono)', fontSize:'10px', color:'rgba(255,45,85,0.6)', letterSpacing:'0.04em', marginBottom: i < 3 ? '4px' : 0}}>
                — {line}
              </div>
            ))}
          </div>

          {/* Type to confirm */}
          <div style={{marginBottom:'16px'}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px'}}>
              Type WRECK to confirm
            </div>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="wreck"
              style={{
                width:'100%', padding:'10px 12px',
                background:'var(--surface2)', border:`1px solid ${ready ? 'var(--burn)' : 'var(--border2)'}`,
                borderRadius:'var(--radius)', color: ready ? 'var(--burn)' : 'var(--text)',
                fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600,
                outline:'none', letterSpacing:'0.08em', transition:'border-color 0.15s',
              }}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={onCancel}
              style={{flex:1, padding:'10px', background:'none', border:'1px solid var(--border2)', borderRadius:'var(--radius)', color:'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:'11px', cursor:'pointer', transition:'all 0.12s'}}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}>
              cancel
            </button>
            <button
              onClick={() => ready && onConfirm()}
              disabled={!ready}
              style={{flex:2, padding:'10px', background: ready ? 'var(--burn)' : 'var(--burn-dim)', border:`1px solid ${ready ? 'var(--burn)' : 'var(--burn-line)'}`, borderRadius:'var(--radius)', color: ready ? '#fff' : 'rgba(255,45,85,0.4)', fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:600, cursor: ready ? 'pointer' : 'not-allowed', letterSpacing:'0.04em', transition:'all 0.15s', boxShadow: ready ? '0 0 12px rgba(255,45,85,0.3)' : 'none'}}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
