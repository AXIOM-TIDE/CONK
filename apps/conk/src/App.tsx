import { useState } from 'react'
import { useStore } from './store/store'
import { Onboarding } from './pages/Onboarding'
import { HarborHome } from './pages/HarborHome'
import { VesselSelect } from './pages/VesselSelect'
import { VesselHome } from './pages/VesselHome'

type Screen = 'harbor' | 'vessels' | 'vessel'

export default function App() {
  const isOnboarded = useStore((s) => s.isOnboarded)
  const vessel      = useStore((s) => s.vessel)
  const [screen, setScreen] = useState<Screen>('harbor')

  if (!isOnboarded) return <Onboarding />

  if (screen === 'vessel' && vessel)
    return <VesselHome onBack={() => setScreen('vessels')} />

  if (screen === 'vessels')
    return <VesselSelect
      onEnter={() => setScreen('vessel')}
      onBack={() => setScreen('harbor')}
    />

  return <HarborHome
    onEnterVessel={() => setScreen('vessels')}
  />
}
