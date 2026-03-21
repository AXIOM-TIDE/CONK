/**
 * TreasuryStrip — persistent void/treasury disclaimer.
 * Shown at the bottom of Harbor and in all destructive flows.
 */

export function TreasuryStrip() {
  return (
    <div style={{
      padding:'8px 16px',
      background:'rgba(1,6,8,0.9)',
      borderTop:'1px solid rgba(255,45,85,0.08)',
      display:'flex', alignItems:'center', justifyContent:'center', gap:'16px',
      flexShrink:0,
    }}>
      {[
        'Fees sink to the void.',
        'No refunds.',
        'No recovery.',
        'No customer service.',
      ].map((text, i) => (
        <span key={i} style={{
          fontFamily:'var(--font-mono)', fontSize:'9px',
          color:'rgba(255,255,255,0.15)', letterSpacing:'0.08em',
          textTransform:'uppercase',
          display:'flex', alignItems:'center', gap:'8px',
        }}>
          {i > 0 && <span style={{opacity:0.3}}>·</span>}
          {text}
        </span>
      ))}
    </div>
  )
}
