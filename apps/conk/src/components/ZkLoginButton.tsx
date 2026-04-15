/**
 * AuthButton — Connect with Google or Sui Wallet
 * Google path: zkLogin — anonymous address derived from JWT
 * Wallet path: Slush / Sui Wallet / any Sui-compatible wallet
 * 
 * Both paths write identical session shape.
 * The rest of the app sees no difference.
 * Transak removed — wallets fund Harbor directly on-chain.
 */
import { useState, useEffect } from 'react'
import { startZkLogin, handleZkLoginCallback, getSession, clearSession, isLoggedIn, getAddress } from '../sui/zklogin'
import { getUsdcBalance } from '../sui/client'
import { getAvailableWallets, connectWallet, clearWalletSession, isWalletSession } from '../sui/walletSession'
import { useStore } from '../store/store'

export function ZkLoginButton() {
  const [loading, setLoading]       = useState(false)
  const [address, setAddress]       = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [showFund, setShowFund]     = useState(false)
  const [copied, setCopied]         = useState(false)
  const [showWallets, setShowWallets] = useState(false)
  const [wallets, setWallets]       = useState<{ name: string; wallet: any }[]>([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const setHarbor = useStore((s) => s.setHarbor)

  useEffect(() => {
    const init = async () => {
      if (window.location.hash.includes('id_token')) {
        setLoading(true)
        try {
          const session = await handleZkLoginCallback()
          if (session) {
            setAddress(session.address)
            setShowFund(true)
            const bal = await getUsdcBalance(session.address)
            setHarbor({ balance: bal, tier: 1, lastMovement: Date.now(), expiresAt: Date.now() + 365*24*60*60*1000 })
          }
        } catch (e: any) {
          setError(e.message)
        } finally {
          setLoading(false)
        }
      } else if (isLoggedIn() || isWalletSession()) {
        const addr = getAddress() ?? JSON.parse(sessionStorage.getItem("zklogin_session") || "{}").address
        if (addr) setAddress(addr)
      }
    }
    init()
  }, [])

  const handleGoogleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      await startZkLogin()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const handleShowWallets = () => {
    const available = getAvailableWallets()
    setWallets(available)
    setShowWallets(true)
  }

  const handleWalletConnect = async (walletObj: any, walletName: string) => {
    setLoading(true)
    setError(null)
    setShowWallets(false)
    try {
      const addr = await connectWallet(walletObj, walletName)
      setAddress(addr)
      setShowFund(true)
      const bal = await getUsdcBalance(addr)
      setHarbor({ balance: bal, tier: 1, lastMovement: Date.now(), expiresAt: Date.now() + 365*24*60*60*1000 })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    if (isWalletSession()) clearWalletSession()
    else clearSession()
    setAddress(null)
  }

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── FUND MODAL ────────────────────────────────────────────────
  if (showFund && address) {
    return (
      <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(1,6,8,0.97)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{width:'100%',maxWidth:'400px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',padding:'24px'}}>
          <div style={{textAlign:'center',marginBottom:'20px'}}>
            <div style={{fontSize:'32px',marginBottom:'10px'}}>⚓</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>
              Fund Your Harbor
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7}}>
              Send USDC from any Sui wallet to your Harbor address below.
              Your Harbor never sees what you read or who you pay.
            </div>
          </div>

          {/* Address */}
          <div style={{marginBottom:'16px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'6px'}}>
              Your Harbor Address
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
              ['USDC', 'To read casts and pay authors · any amount · $0.001 minimum per cast'],
              ['SUI',  'For gas fees · ~0.01 SUI is enough to start'],
            ].map(([token, desc]) => (
              <div key={token} style={{display:'flex',gap:'10px',padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:700,color:'var(--teal)',flexShrink:0,minWidth:'36px'}}>{token}</span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.5}}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Send from wallet instruction */}
          <div style={{padding:'10px 12px',background:'var(--surface2)',borderRadius:'var(--radius-lg)',marginBottom:'16px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7,textAlign:'center'}}>
            Send from <span style={{color:'var(--teal)'}}>Slush</span>, <span style={{color:'var(--teal)'}}>Sui Wallet</span>, or any Sui-compatible wallet.<br/>
            Copy the address above and send directly on-chain.
          </div>

          {/* Three Laws reminder */}
          <div style={{padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'16px'}}>
            {[
              'Harbor never sees what you read',
              'Harbor never sees who you pay',
              'Harbor knows only that balance decreased',
            ].map(law => (
              <div key={law} style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',lineHeight:1.8}}>
                · {law}
              </div>
            ))}
          </div>

          <button onClick={() => setShowFund(false)}
            style={{width:'100%',padding:'12px',background:'var(--teal)',border:'none',borderRadius:'var(--radius-lg)',color:'var(--text-inv)',fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em'}}>
            Enter the tide →
          </button>
          <button onClick={() => setShowFund(false)}
            style={{width:'100%',padding:'8px',background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',marginTop:'6px'}}>
            I'll fund it later
          </button>
        </div>
      </div>
    )
  }

  // ── WALLET PICKER ─────────────────────────────────────────────
  if (showWallets) {
    return (
      <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(1,6,8,0.97)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{width:'100%',maxWidth:'360px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',padding:'24px'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,color:'var(--text)',marginBottom:'16px',textAlign:'center'}}>
            Connect Wallet
          </div>
          {wallets.length === 0 ? (
            <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',textAlign:'center',lineHeight:1.8,padding:'16px 0'}}>
              No Sui wallet detected.<br/>
              Install <span style={{color:'var(--teal)'}}>Slush</span> or <span style={{color:'var(--teal)'}}>Sui Wallet</span> and try again.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
              {wallets.map(({ name, wallet }) => (
                <button key={name} onClick={() => handleWalletConnect(wallet, name)}
                  style={{width:'100%',padding:'12px 16px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,cursor:'pointer',textAlign:'left',letterSpacing:'0.04em'}}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='var(--teal)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                  {name}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowWallets(false)}
            style={{width:'100%',padding:'8px',background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
            cancel
          </button>
        </div>
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <span className="spinner" style={{width:'12px',height:'12px',borderWidth:'2px'}}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>connecting...</span>
      </div>
    )
  }

  // ── CONNECTED ─────────────────────────────────────────────────
  if (address) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 6px 4px 10px',background:'rgba(0,184,230,0.06)',border:'1px solid var(--border3)',borderRadius:'var(--radius-lg)'}}>
        {/* Live pulse */}
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#00E676',boxShadow:'0 0 6px #00E676',animation:'livePulse 2s ease-in-out infinite',flexShrink:0}}/>
        {/* Systems go label */}
        <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',fontWeight:700,color:'#00E676',letterSpacing:'0.12em',textTransform:'uppercase',flexShrink:0}}>
          live
        </span>
        {/* Divider */}
        <div style={{width:'1px',height:'12px',background:'var(--border)',flexShrink:0}}/>
        {/* Address */}
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',letterSpacing:'0.02em'}}>
          {address.slice(0,6)}…{address.slice(-4)}
        </span>
        {/* Divider */}
        <div style={{width:'1px',height:'12px',background:'var(--border)',flexShrink:0}}/>
        {/* Fund Harbor copy button */}
        <button
          onClick={copyAddress}
          title="Copy address to fund Harbor"
          style={{padding:'3px 8px',background:copied?'rgba(0,230,118,0.1)':'rgba(0,184,230,0.1)',border:`1px solid ${copied?'rgba(0,230,118,0.4)':'rgba(0,184,230,0.3)'}`,borderRadius:'var(--radius)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:'9px',color:copied?'#00E676':'var(--teal)',transition:'all 0.15s',whiteSpace:'nowrap',flexShrink:0}}>
          {copied ? '✓ copied' : '⛽ fund'}
        </button>
        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          title="Disconnect"
          style={{background:'none',border:'none',color:'var(--text-off)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:'13px',padding:'0 2px',lineHeight:1,flexShrink:0}}>
          ×
        </button>
      </div>
    )
  }

  // ── AUTH OPTIONS ──────────────────────────────────────────────
  if (!showAuthModal) {
    return (
      <button onClick={() => setShowAuthModal(true)}
        style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',cursor:'pointer',transition:'all 0.15s'}}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='var(--teal)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border2)'}>
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'var(--text-off)'}}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',fontWeight:600,letterSpacing:'0.04em'}}>connect</span>
      </button>
    )
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(1,6,8,0.97)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'360px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',padding:'24px'}}>
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <div style={{fontSize:'28px',marginBottom:'8px'}}>⚓</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>Enter the tide</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>Choose how to connect</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
          <button onClick={handleGoogleConnect}
            style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',cursor:'pointer',transition:'all 0.15s'}}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='var(--teal)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',letterSpacing:'0.04em'}}>Continue with Google</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)'}}>Anonymous · no seed phrase</div>
            </div>
          </button>
          <div style={{padding:'10px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7}}>
            <span style={{color:'var(--teal)'}}>Fund via any Sui wallet</span> — after connecting with Google, send USDC to your Harbor address from Slush or any Sui wallet.
          </div>
        </div>
        <button onClick={() => setShowAuthModal(false)}
          style={{width:'100%',padding:'8px',background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer'}}>
          cancel
        </button>
        {error && <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--burn)',marginTop:'6px',textAlign:'center'}}>{error}</div>}
      </div>
    </div>
  )
}
