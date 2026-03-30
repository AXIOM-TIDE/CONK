import { useState, useEffect } from 'react'
import { useStore } from './store/store'
import { Onboarding } from './pages/Onboarding'
import { HarborHome } from './pages/HarborHome'
import { VesselSelect } from './pages/VesselSelect'
import { VesselHome } from './pages/VesselHome'
import { Legal } from './pages/Legal'

type Screen = 'harbor' | 'vessels' | 'vessel'

export default function App() {
  const isOnboarded = useStore((s) => s.isOnboarded)
  const vessel      = useStore((s) => s.vessel)
  const [screen, setScreen] = useState<Screen>('harbor')
  const [showLegal, setShowLegal] = useState(false)

  useEffect(() => {
    const handler = () => setShowLegal(true)
    window.addEventListener('conk:legal', handler)
    return () => window.removeEventListener('conk:legal', handler)
  }, [])

  if (!isOnboarded) return <Onboarding />

  return (
    <>
      {showLegal && <Legal onClose={() => setShowLegal(false)}/>}

      {screen === 'vessel' && vessel && (
        <VesselHome onBack={() => setScreen('harbor')}/>
      )}
      {screen === 'vessels' && (
        <VesselSelect onEnter={() => setScreen('vessel')} onBack={() => setScreen('harbor')}/>
      )}
      {screen === 'harbor' && (
        <HarborHome onEnterVessel={() => setScreen('vessels')}/>
      )}
    </>
  )
}
