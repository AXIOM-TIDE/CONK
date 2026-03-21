import { useStore } from './store/store'
import { Onboarding } from './pages/Onboarding'
import { Drift } from './pages/Drift'
import { Harbor } from './pages/Harbor'
import { Dock } from './pages/Dock'
import { Siren } from './pages/Siren'
import { Nav } from './components/Nav'

export default function App() {
  const isOnboarded = useStore((s) => s.isOnboarded)
  const activeTab   = useStore((s) => s.activeTab)

  if (!isOnboarded) {
    return <Onboarding />
  }

  return (
    <div className="app-shell">
      <main className="page">
        {activeTab === 'drift'  && <Drift />}
        {activeTab === 'dock'   && <Dock />}
        {activeTab === 'harbor' && <Harbor />}
        {activeTab === 'siren'  && <Siren />}
      </main>
      <Nav />
    </div>
  )
}
