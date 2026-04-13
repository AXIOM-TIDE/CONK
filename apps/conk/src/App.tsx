import { useState, useEffect } from 'react'
import { useStore } from './store/store'
import { Onboarding } from './pages/Onboarding'
import { HarborHome } from './pages/HarborHome'
import { VesselSelect } from './pages/VesselSelect'
import { VesselHome } from './pages/VesselHome'
import { Legal } from './pages/Legal'
import { ZkLoginButton } from './components/ZkLoginButton'
import { isLoggedIn, handleZkLoginCallback } from './sui/zklogin'
import { isWalletSession } from './sui/walletSession'

type Screen = 'harbor' | 'vessels' | 'vessel'

export default function App() {
  const isOnboarded = useStore((s) => s.isOnboarded)
  const vessel      = useStore((s) => s.vessel)
  const [screen, setScreen]     = useState<Screen>('harbor')
  const [showLegal, setShowLegal] = useState(false)
  const [connected, setConnected] = useState(false)
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    const handler = () => setShowLegal(true)
    window.addEventListener('conk:legal', handler)
    return () => window.removeEventListener('conk:legal', handler)
  }, [])

  useEffect(() => {
    const init = async () => {
      // Handle OAuth callback
      if (window.location.hash.includes('id_token')) {
        try {
          await handleZkLoginCallback()
        } catch (e) {
          console.error('zkLogin callback failed:', e)
        }
      }
      setConnected(isLoggedIn() || isWalletSession())
      setChecking(false)
    }
    init()
  }, [])

  // Listen for connection events from ZkLoginButton
  useEffect(() => {
    const check = () => setConnected(isLoggedIn() || isWalletSession())
    window.addEventListener('storage', check)
    // Poll every second for session changes
    const iv = setInterval(check, 1000)
    return () => { window.removeEventListener('storage', check); clearInterval(iv) }
  }, [])

  if (checking) return null

  // Gate 1 — Must connect first
  if (!connected) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:'24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'fixed',top:'-10%',left:'50%',transform:'translateX(-50%)',width:'700px',height:'500px',background:'radial-gradient(ellipse, rgba(0,184,230,0.06) 0%, transparent 70%)',pointerEvents:'none'}}/>
        <div style={{width:'100%',maxWidth:'400px',textAlign:'center',position:'relative',zIndex:1}}>
          <img src="/conk-logo.png" alt="CONK" style={{width:'90px',height:'90px',objectFit:'contain',filter:'drop-shadow(0 0 24px rgba(0,184,230,0.5))',animation:'float 4s ease-in-out infinite',marginBottom:'24px'}}/>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'42px',fontWeight:700,color:'var(--text)',margin:'0 0 8px',letterSpacing:'-0.03em'}}>CONK</h1>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--teal)',letterSpacing:'0.1em',marginBottom:'32px',textTransform:'uppercase'}}>
            The protocol where agents communicate
          </div>
          <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}>
            <ZkLoginButton/>
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
            Anonymous by design · Real transactions on Sui
          </div>
        </div>
      </div>
    )
  }

  // Gate 2 — Must complete onboarding
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
