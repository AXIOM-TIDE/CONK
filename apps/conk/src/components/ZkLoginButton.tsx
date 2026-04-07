/**
 * ZkLoginButton — Connect with Google
 * Derives an anonymous Sui vessel address from Google JWT.
 * No seed phrase. No wallet app. Just Google.
 */
import { useState, useEffect } from 'react'
import { startZkLogin, handleZkLoginCallback, getSession, clearSession, isLoggedIn, getAddress } from '../sui/zklogin'
import { useStore } from '../store/store'

export function ZkLoginButton() {
  const [loading, setLoading]   = useState(false)
  const [address, setAddress]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [showFund, setShowFund] = useState(false)
  const [copied, setCopied]     = useState(false)
  const setHarbor = useStore((s) => s.setHarbor)

  // Check for OAuth callback on mount
  useEffect(() => {
    const init = async () => {
      // Handle return from Google OAuth
      if (window.location.hash.includes('id_token')) {
        setLoading(true)
        try {
          const session = await handleZkLoginCallback()
          if (session) {
            setAddress(session.address)
            setShowFund(true)
            // Initialize Harbor with zkLogin address
            setHarbor({
              balance:      500,
              tier:         1,
              lastMovement: Date.now(),
              expiresAt:    Date.now() + 365*24*60*60*1000,
            })
          }
        } catch (e: any) {
          setError(e.message)
        } finally {
          setLoading(false)
        }
      } else if (isLoggedIn()) {
        setAddress(getAddress())
      }
    }
    init()
  }, [])

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      await startZkLogin()
      // Page redirects to Google — execution stops here
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    clearSession()
    setAddress(null)
  }

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (showFund && address) {
    return (
      <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(1,6,8,0.97)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{width:'100%',maxWidth:'400px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',padding:'24px'}}>
          <div style={{textAlign:'center',marginBottom:'20px'}}>
            <div style={{fontSize:'32px',marginBottom:'10px'}}>⚓</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>
              Fund Your Vessel
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7}}>
              Your anonymous Sui wallet is ready. Send SUI and USDC to start using CONK.
            </div>
          </div>

          {/* Address */}
          <div style={{marginBottom:'16px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'6px'}}>
              Your Wallet Address
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {address}
              </span>
              <button onClick={copyAddress}
                style={{background:'none',border:'none',color:copied?'#4CAF50':'var(--text-off)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:'9px',flexShrink:0,padding:0}}>
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
          </div>

          {/* What to send */}
          <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'16px'}}>
            {[
              ['SUI', 'For gas fees (~0.01 SUI is enough to start)'],
              ['USDC', 'To read casts ($0.001 per cast · any amount works)'],
            ].map(([token, desc]) => (
              <div key={token} style={{display:'flex',gap:'10px',padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:700,color:'var(--teal)',flexShrink:0,minWidth:'36px'}}>{token}</span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.5}}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Buy with Transak */}
          <button
            onClick={() => {
              const url = new URL('https://global.transak.com')
              url.searchParams.set('apiKey', '25117428-d358-438c-9f81-768ca665ee17')
              url.searchParams.set('network', 'sui')
              url.searchParams.set('cryptoCurrencyCode', 'USDC')
              url.searchParams.set('walletAddress', address!)
              url.searchParams.set('disableWalletAddressForm', 'true')
              url.searchParams.set('defaultCryptoCurrency', 'USDC')
              window.open(url.toString(), '_blank', 'width=450,height=700')
            }}
            style={{width:'100%',padding:'12px',background:'#0052FF',border:'none',borderRadius:'var(--radius-lg)',color:'#fff',fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em',marginBottom:'8px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            💳 Buy USDC with card — powered by Transak
          </button>

          {/* Manual option */}
          <div style={{padding:'10px 12px',background:'var(--surface2)',borderRadius:'var(--radius-lg)',marginBottom:'16px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7,textAlign:'center'}}>
            or send SUI + USDC manually from <span style={{color:'var(--teal)'}}>Slush</span> or any Sui wallet
          </div>

          <button onClick={() => setShowFund(false)}
            style={{width:'100%',padding:'12px',background:'var(--teal)',border:'none',borderRadius:'var(--radius-lg)',color:'var(--text-inv)',fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em'}}>
            Got it — enter the tide →
          </button>
          <button onClick={() => setShowFund(false)}
            style={{width:'100%',padding:'8px',background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',marginTop:'6px'}}>
            I'll fund it later
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <span className="spinner" style={{width:'12px',height:'12px',borderWidth:'2px'}}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>
          connecting...
        </span>
      </div>
    )
  }

  if (address) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 12px',background:'rgba(0,184,230,0.08)',border:'1px solid var(--border3)',borderRadius:'var(--radius-lg)'}}>
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 4px var(--teal)',flexShrink:0}}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)'}}>
          {address.slice(0,8)}…{address.slice(-4)}
        </span>
        <button onClick={handleDisconnect}
          style={{background:'none',border:'none',color:'var(--text-off)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:'9px',padding:'0 0 0 4px'}}>
          ×
        </button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={handleConnect}
        style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',cursor:'pointer',transition:'all 0.15s'}}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='var(--teal)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border2)'}
      >
        {/* Google icon */}
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',fontWeight:600,letterSpacing:'0.04em'}}>
          Connect with Google
        </span>
      </button>
      {error && (
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--burn)',marginTop:'4px'}}>
          {error}
        </div>
      )}
    </div>
  )
}
