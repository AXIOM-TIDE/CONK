/**
 * RoyaltySplitEditor — Add to CastPanel compose step
 *
 * Drop into apps/conk/src/components/RoyaltySplitEditor.tsx
 * Import and add to CastPanel when mode !== 'burn'
 *
 * @example
 * // In CastPanel:
 * import { RoyaltySplitEditor } from '../components/RoyaltySplitEditor'
 *
 * const [royaltySplit, setRoyaltySplit] = useState<RoyaltySplit | null>(null)
 *
 * // In compose step JSX:
 * <RoyaltySplitEditor onChange={setRoyaltySplit}/>
 */

import { useState } from 'react'
import type { RoyaltySplit, RoyaltyRecipient } from '../sui/royalties'
import { validateRoyaltySplit } from '../sui/royalties'

interface Props {
  onChange: (split: RoyaltySplit | null) => void
}

export function RoyaltySplitEditor({ onChange }: Props) {
  const [enabled,    setEnabled]    = useState(false)
  const [recipients, setRecipients] = useState<RoyaltyRecipient[]>([
    { address: '', share: 100, label: '' },
  ])
  const [error, setError] = useState('')

  const totalShares = recipients.reduce((sum, r) => sum + (r.share || 0), 0)

  function update(index: number, field: keyof RoyaltyRecipient, value: string | number) {
    const updated = recipients.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    )
    setRecipients(updated)
    setError('')

    const split: RoyaltySplit = { recipients: updated, totalShares }
    const validation = validateRoyaltySplit(split)
    if (validation.valid) {
      onChange(split)
    } else {
      onChange(null)
    }
  }

  function addRecipient() {
    if (recipients.length >= 10) return
    // Auto-split remaining share
    const remaining = Math.max(0, 100 - totalShares)
    setRecipients([...recipients, { address: '', share: remaining, label: '' }])
    onChange(null)
  }

  function removeRecipient(index: number) {
    const updated = recipients.filter((_, i) => i !== index)
    setRecipients(updated)
    const newTotal = updated.reduce((sum, r) => sum + r.share, 0)
    const split: RoyaltySplit = { recipients: updated, totalShares: newTotal }
    const validation = validateRoyaltySplit(split)
    onChange(validation.valid ? split : null)
  }

  function toggle() {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange(null)
    } else {
      const split: RoyaltySplit = { recipients, totalShares }
      const validation = validateRoyaltySplit(split)
      onChange(validation.valid ? split : null)
    }
  }

  const shareColor = totalShares === 100
    ? 'var(--teal)'
    : totalShares > 100
      ? 'var(--burn)'
      : '#FFB020'

  return (
    <div style={{
      padding:      '12px',
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '10px',
    }}>

      {/* Header toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: enabled ? '12px' : 0 }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600, marginBottom:'2px' }}>
            Royalty splits
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)' }}>
            Split payment across multiple wallets
          </div>
        </div>
        <button
          onClick={toggle}
          style={{
            width:'36px', height:'20px', borderRadius:'100px',
            background: enabled ? 'var(--teal)' : 'var(--surface3)',
            border: `1px solid ${enabled ? 'var(--teal)' : 'var(--border)'}`,
            position:'relative', cursor:'pointer', padding:0,
            transition:'all 0.2s', flexShrink:0,
          }}
        >
          <div style={{
            width:'14px', height:'14px', background: enabled ? 'var(--bg)' : 'var(--text-dim)',
            borderRadius:'50%', position:'absolute', top:'2px',
            left: enabled ? '18px' : '2px', transition:'left 0.2s',
          }}/>
        </button>
      </div>

      {enabled && (
        <>
          {/* Recipients */}
          {recipients.map((r, i) => (
            <div key={i} style={{ marginBottom:'8px' }}>

              {/* Label row */}
              <div style={{ display:'flex', gap:'6px', marginBottom:'4px' }}>
                <input
                  value={r.label ?? ''}
                  onChange={e => update(i, 'label', e.target.value)}
                  placeholder={i === 0 ? 'e.g. Director' : `Recipient ${i + 1}`}
                  style={{
                    flex:1, background:'var(--surface2)', border:'1px solid var(--border)',
                    borderRadius:'var(--radius)', padding:'5px 8px',
                    fontFamily:'var(--font-mono)', fontSize:'10px',
                    color:'var(--text)', outline:'none',
                  }}
                />
                <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink:0 }}>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={r.share}
                    onChange={e => update(i, 'share', parseInt(e.target.value) || 0)}
                    style={{
                      width:'48px', background:'var(--surface2)',
                      border:`1px solid ${totalShares === 100 ? 'var(--border)' : shareColor}`,
                      borderRadius:'var(--radius)', padding:'5px 6px',
                      fontFamily:'var(--font-mono)', fontSize:'10px',
                      color:'var(--text)', outline:'none', textAlign:'center',
                    }}
                  />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>%</span>
                </div>
                {recipients.length > 1 && (
                  <button
                    onClick={() => removeRecipient(i)}
                    style={{
                      background:'none', border:'none', color:'var(--text-off)',
                      cursor:'pointer', fontSize:'14px', padding:'0 4px', lineHeight:1,
                      flexShrink:0,
                    }}
                  >×</button>
                )}
              </div>

              {/* Address row */}
              <input
                value={r.address}
                onChange={e => update(i, 'address', e.target.value)}
                placeholder="0x... wallet address"
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', padding:'5px 8px',
                  fontFamily:'var(--font-mono)', fontSize:'9px',
                  color:'var(--text-off)', outline:'none',
                }}
              />
            </div>
          ))}

          {/* Share total */}
          <div style={{
            display:'flex', justifyContent:'space-between',
            fontFamily:'var(--font-mono)', fontSize:'9px',
            color: shareColor, marginBottom:'8px',
          }}>
            <span>Total shares</span>
            <span style={{ fontWeight:600 }}>{totalShares}% {totalShares === 100 ? '✓' : totalShares > 100 ? '— over by ' + (totalShares - 100) + '%' : '— ' + (100 - totalShares) + '% remaining'}</span>
          </div>

          {/* Add recipient */}
          {recipients.length < 10 && (
            <button
              onClick={addRecipient}
              style={{
                width:'100%', padding:'6px',
                background:'none', border:'1px dashed var(--border)',
                borderRadius:'var(--radius)', color:'var(--text-off)',
                fontFamily:'var(--font-mono)', fontSize:'9px',
                cursor:'pointer', letterSpacing:'0.04em',
                marginBottom:'8px',
              }}
            >
              + add recipient
            </button>
          )}

          {/* Info */}
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'9px',
            color:'var(--text-off)', lineHeight:1.6,
          }}>
            97% of each payment splits across recipients · 3% → treasury<br/>
            shares must total 100% · max 10 recipients
          </div>

          {error && (
            <div style={{
              marginTop:'6px', fontFamily:'var(--font-mono)', fontSize:'9px',
              color:'var(--burn)',
            }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}
