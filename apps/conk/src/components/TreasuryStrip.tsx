export function TreasuryStrip() {
  return (
    <div style={{
      flexShrink: 0,
      padding: '6px 16px',
      borderTop: '1px solid var(--border)',
      background: 'rgba(0,184,230,0.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--text-off)',
        letterSpacing: '0.06em',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Fees route to the CONK treasury · No refunds · No recovery · Protocol in development
      </span>
    </div>
  )
}
