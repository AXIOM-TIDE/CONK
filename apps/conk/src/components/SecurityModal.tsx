/**
 * SecurityModal — opt-in security question gate on casts.
 * Shown when a cast has requiresSecurityAnswer set.
 * The caster sets the question. The reader must answer correctly.
 */

interface Props {
  question: string
  onSubmit: (answer: string) => void
  onCancel: () => void
  error?: boolean
}

import { useState } from 'react'

export function SecurityModal({ question, onSubmit, onCancel, error }: Props) {
  const [answer, setAnswer] = useState('')

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(1,6,8,0.92)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', animation:'fadeIn 0.15s ease'
    }}>
      <div style={{
        width:'100%', maxWidth:'380px',
        background:'var(--surface)',
        border:'1px solid var(--border2)',
        borderRadius:'var(--radius-xl)',
        overflow:'hidden',
        boxShadow:'0 0 40px rgba(0,184,230,0.08)',
      }}>
        {/* Header */}
        <div style={{
          padding:'14px 20px',
          background:'rgba(0,184,230,0.04)',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:'8px'
        }}>
          <span style={{fontSize:'16px'}}>🔐</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:600, color:'var(--text)', letterSpacing:'0.04em'}}>
            Security gate
          </span>
          <span style={{fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginLeft:'auto'}}>
            required by caster
          </span>
        </div>

        <div style={{padding:'20px'}}>
          <p style={{fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text-dim)', lineHeight:1.7, marginBottom:'4px'}}>
            This cast requires an answer before access is granted.
          </p>
          <p style={{fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginBottom:'16px'}}>
            The caster controls access. Wrong answers are not refunded.
          </p>

          {/* Question */}
          <div style={{padding:'12px', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'var(--radius-lg)', marginBottom:'14px'}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px'}}>Question</div>
            <div style={{fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text)', lineHeight:1.5}}>{question}</div>
          </div>

          {/* Error */}
          {error && (
            <div data-testid="security-error" style={{padding:'8px 10px', background:'var(--burn-dim)', border:'1px solid var(--burn-line)', borderRadius:'var(--radius)', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--burn)', marginBottom:'12px', letterSpacing:'0.04em'}}>
              Access denied. Wrong answer. $0.001 debited. No refund.
            </div>
          )}

          <div style={{marginBottom:'16px'}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px'}}>Your answer</div>
            <input
              data-testid="security-answer-input"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && answer.trim() && onSubmit(answer.trim())}
              placeholder="Answer the question..."
              style={{width:'100%', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:'12px', outline:'none', transition:'border-color 0.15s'}}
              autoFocus
            />
          </div>

          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={onCancel}
              style={{flex:1, padding:'10px', background:'none', border:'1px solid var(--border2)', borderRadius:'var(--radius)', color:'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:'11px', cursor:'pointer'}}>
              cancel
            </button>
            <button data-testid="security-submit-btn"
              onClick={() => answer.trim() && onSubmit(answer.trim())}
              disabled={!answer.trim()}
              style={{flex:2, padding:'10px', background:'var(--teal)', color:'var(--text-inv)', border:'none', borderRadius:'var(--radius)', fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:600, cursor: answer.trim() ? 'pointer' : 'not-allowed', opacity: answer.trim() ? 1 : 0.5, letterSpacing:'0.04em'}}>
              Submit answer · $0.001
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
