interface Props {
  onClick: () => void
  label?: string
  color?: string
}

export function BackButton({ onClick, label = 'Back', color = 'var(--text-dim)' }: Props) {
  return (
    <button className="back-btn" onClick={onClick} style={{ color }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      {label}
    </button>
  )
}
