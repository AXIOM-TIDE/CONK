import { useState } from 'react'
import { useStore } from './store/store'
import { Onboarding } from './pages/Onboarding'
import { Feed } from './pages/Feed'
import { HarborDrawer } from './pages/HarborDrawer'
import { DockPage } from './pages/DockPage'
import { SirenPage } from './pages/SirenPage'

export type View = 'feed' | 'dock' | 'siren'

export default function App() {
  const isOnboarded = useStore((s) => s.isOnboarded)
  const [view, setView]             = useState<View>('feed')
  const [harborOpen, setHarborOpen] = useState(false)

  if (!isOnboarded) return <Onboarding />

  return (
    <div className="app-shell">
      <Feed
        view={view}
        setView={setView}
        onHarborClick={() => setHarborOpen(true)}
      />
      {view === 'dock'  && <DockPage  onClose={() => setView('feed')} />}
      {view === 'siren' && <SirenPage onClose={() => setView('feed')} />}
      {harborOpen && <HarborDrawer onClose={() => setHarborOpen(false)} />}
    </div>
  )
}
