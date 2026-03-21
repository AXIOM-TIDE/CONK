import { useStore, type AppTab } from '../store/store'

const TABS: { id: AppTab; label: string; icon: (a: boolean) => JSX.Element }[] = [
  {
    id: 'drift',
    label: 'Drift',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    id: 'siren',
    label: 'Siren',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.364 5.636a9 9 0 0 1 0 12.728"/>
        <path d="M15.536 8.464a5 5 0 0 1 0 7.072"/>
        <path d="M5.636 5.636a9 9 0 0 0 0 12.728"/>
        <path d="M8.464 8.464a5 5 0 0 0 0 7.072"/>
        <line x1="12" y1="12" x2="12" y2="12.01"/>
      </svg>
    ),
  },
  {
    id: 'dock',
    label: 'Dock',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    id: 'harbor',
    label: 'Harbor',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3v18M3 12h18"/>
        <path d="M12 3c-2.5 2-4 5-4 9s1.5 7 4 9M12 3c2.5 2 4 5 4 9s-1.5 7-4 9"/>
      </svg>
    ),
  },
]

export function Nav() {
  const activeTab   = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon(activeTab === tab.id)}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
