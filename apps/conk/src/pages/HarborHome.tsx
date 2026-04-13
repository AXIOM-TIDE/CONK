/**
 * Harbor Home — the public face of CONK.
 * Beautiful read-only drift. No interaction.
 * Balance visible. Vessel list. 
 * Every element nudges toward launching or entering a vessel.
 */
import { useEffect, useRef, useState } from 'react'
import { useStore, type CastMode } from '../store/store'
import { formatTide, timeUntilExpiry, formatTimeAgo } from '../utils/scrubber'
import { ArcMeter } from '../components/FuelMeter'
import { TreasuryStrip } from '../components/TreasuryStrip'
import { DecayBadge } from '../components/DecayBadge'
import { ZkLoginButton } from '../components/ZkLoginButton'
import { clearSession } from '../sui/zklogin'
import { clearWalletSession, isWalletSession } from '../sui/walletSession'
import { getUsdcBalance } from '../sui/client'
import { getAddress } from '../sui/zklogin'

interface Props {
  onEnterVessel: () => void
}

export function HarborHome({ onEnterVessel }: Props) {
  const harbor  = useStore((s) => s.harbor)
  const vessel  = useStore((s) => s.vessel)
  const casts   = useStore((s) => s.driftCasts)
  const incTide = useStore((s) => s.incrementTide)
  const setVessel    = useStore((s) => s.setVessel)
  const setHarbor    = useStore((s) => s.setHarbor)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const feedRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<'all'|CastMode>('all')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAddr, setWithdrawAddr] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState(0)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawDone, setWithdrawDone] = useState(false)

  // Sync Harbor balance from chain on mount and every 30 seconds
  useEffect(() => {
    const sync = async () => {
      const address = getAddress()
      if (!address || !harbor) return
      const bal = await getUsdcBalance(address)
      if (bal !== harbor.balance) {
        setHarbor({ ...harbor, balance: bal })
      }
    }
    sync()
    const interval = setInterval(sync, 30000)
    return () => clearInterval(interval)
  }, [harbor?.balance])

  // Live tide
  useEffect(() => {
    const iv = setInterval(() => {
      const { driftCasts } = useStore.getState()
      const hot = driftCasts.filter(c => c.tideCount > 500)
      if (!hot.length) return
      incTide(hot[Math.floor(Math.random() * hot.length)].id)
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  const bal     = harbor ? (harbor.balance / 100).toFixed(2) : '0.00'

  const handleWithdraw = async () => {
    if (!withdrawAddr.trim() || !withdrawAmt || !harbor) return
    setWithdrawing(true)
    try {
      const { withdrawHarbor } = await import('../sui/client')
      const result = await withdrawHarbor({
        toAddress:  withdrawAddr.trim(),
        amountUsdc: withdrawAmt * 1000000,
      })
      console.log('Withdrawal confirmed:', result)
      setHarbor({ ...harbor, balance: harbor.balance - withdrawAmt * 100 })
      setWithdrawDone(true)
      setTimeout(() => {
        setShowWithdraw(false)
        setWithdrawDone(false)
        setWithdrawAddr('')
        setWithdrawAmt(0)
      }, 2000)
    } catch(e: any) {
      console.error('Withdrawal failed:', e)
    } finally {
      setWithdrawing(false)
    }
  }
  const filtered = filter === 'all' ? casts : casts.filter(c => c.mode === filter)

  return (
    <div className="shell" data-testid="harbor-home" style={{ background: 'var(--bg)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 16px', height:'52px', background:'rgba(3,12,20,0.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', flexShrink:0, zIndex:20, position:'relative' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <img src="/conk-logo.png" alt="CONK"
            style={{ width:'34px', height:'34px', objectFit:'contain', filter:'drop-shadow(0 0 8px rgba(0,184,230,0.8)) drop-shadow(0 0 20px rgba(0,80,200,0.3))' }}/>
          <span className="topbar-wordmark">CONK</span>
        </div>

        {/* Balance + Disconnect */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'10px' }}>
          <ZkLoginButton/>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'5px 12px', background:'rgba(0,184,230,0.05)', border:'1px solid var(--border2)', borderRadius:'var(--radius-lg)' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--teal)', boxShadow:'0 0 6px var(--teal)', animation:'livePulse 2.5s ease-in-out infinite' }}/>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:600, color:'var(--teal)' }}>${bal}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>USDC</span>
          </div>
          <button
            onClick={() => {
              if (isWalletSession()) clearWalletSession()
              else clearSession()
              window.location.reload()
            }}
            title="Disconnect"
            style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'4px 8px', color:'var(--text-off)', fontFamily:'var(--font-mono)', fontSize:'9px', cursor:'pointer', letterSpacing:'0.04em' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='var(--burn)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
            disconnect
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── LEFT: Harbor panel ── */}
        <div style={{ width:'220px', flexShrink:0, display:'flex', flexDirection:'column', background:'rgba(5,17,28,0.8)', backdropFilter:'blur(20px)', borderRight:'1px solid var(--border)', overflowY:'auto', scrollbarWidth:'none' }}>

          {/* Arc meter */}
          <div style={{ padding:'20px 16px 8px', display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid var(--border)' }}>
            <ArcMeter value={harbor?.balance ?? 0} max={Math.max(1000, (harbor?.balance ?? 0) * 1.2)} size={130} label={`$${bal}`} sublabel="USDC"/>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'4px', textAlign:'center' }}>
              ~{Math.floor((harbor?.balance ?? 0) / 0.1).toLocaleString()} reads remaining
            </div>
          </div>

          {/* Vessel list */}
          <div style={{ padding:'12px 12px 8px' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-off)', marginBottom:'8px' }}>
              {vessel ? 'Your Vessel' : 'No Vessel'}
            </div>

            {vessel ? (
              <button onClick={onEnterVessel} data-testid="enter-vessels-btn"
                style={{ width:'100%', padding:'12px', background:'var(--surface)', border:'1px solid var(--border3)', borderRadius:'var(--radius-lg)', cursor:'pointer', textAlign:'left', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--teal)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,184,230,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border3)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'18px', color:'var(--teal)' }}>
                    {vessel.class === 'daemon' ? '⚙' : '◌'}
                  </span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:600, color:'var(--teal)' }}>vessel</span>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', marginBottom:'8px' }}>
                  {vessel.id.slice(0, 12)}…
                </div>
                {/* Fuel bar */}
                <div style={{ height:'2px', background:'var(--surface3)', borderRadius:'1px', overflow:'hidden', marginBottom:'4px' }}>
                  <div style={{ width:`${Math.min(100, (vessel.fuel/100)*100)}%`, height:'100%', background:'var(--teal)', boxShadow:'0 0 4px var(--teal)', transition:'width 0.4s' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                  <span>${(vessel.fuel/100).toFixed(2)} fuel</span>
                  <span style={{ color:'var(--teal)', fontWeight:600 }}>enter →</span>
                </div>
              </button>
            ) : (
              <div style={{ padding:'12px', background:'var(--surface)', border:'1px dashed var(--border2)', borderRadius:'var(--radius-lg)', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', marginBottom:'8px', lineHeight:1.6 }}>
                  Launch a vessel to cast and read
                </div>
                <button onClick={onEnterVessel} data-testid="enter-vessels-btn"
                  style={{ padding:'7px 14px', background:'var(--teal)', color:'var(--text-inv)', border:'none', borderRadius:'var(--radius)', fontFamily:'var(--font-mono)', fontSize:'10px', fontWeight:600, cursor:'pointer', letterSpacing:'0.04em' }}>
                  Launch Vessel →
                </button>
              </div>
            )}
          </div>

          {/* Three laws */}
          <div style={{ padding:'12px', margin:'8px 12px', background:'rgba(0,184,230,0.03)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
            {[
              ['I',   'Casts never reach the Harbor.'],
              ['II',  'Harbor knows only balance decreased.'],
              ['III', 'Vessel → Relay → Cast. Harbor sees none.'],
            ].map(([n, l]) => (
              <div key={n} style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--teal)', minWidth:'12px', marginTop:'2px' }}>{n}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', lineHeight:1.6 }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Withdraw */}
          <div style={{padding:'12px 12px 8px'}}>
            {!showWithdraw ? (
              <button onClick={() => setShowWithdraw(true)}
                style={{width:'100%',padding:'8px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',letterSpacing:'0.04em'}}>
                ↑ Withdraw USDC
              </button>
            ) : (
              <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,color:'var(--teal)',marginBottom:'8px'}}>
                  Withdraw USDC
                </div>
                <input
                  placeholder="Destination Sui address (0x...)"
                  value={withdrawAddr}
                  onChange={e => setWithdrawAddr(e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'7px 9px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text)',outline:'none',marginBottom:'8px'}}
                />
                <div style={{display:'flex',gap:'4px',marginBottom:'8px',flexWrap:'wrap'}}>
                  {[1,5,10,50].map(amt => (
                    <button key={amt} onClick={() => setWithdrawAmt(amt)}
                      style={{flex:1,padding:'5px 4px',background:withdrawAmt===amt?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${withdrawAmt===amt?'var(--teal)':'var(--border)'}`,borderRadius:'var(--radius)',color:withdrawAmt===amt?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,cursor:'pointer',textAlign:'center'}}>
                      ${amt}
                    </button>
                  ))}
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'8px'}}>
                  Balance: ${bal} USDC
                </div>
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={() => {setShowWithdraw(false);setWithdrawAddr('');setWithdrawAmt(0)}}
                    style={{flex:1,padding:'7px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>
                    cancel
                  </button>
                  <button onClick={handleWithdraw}
                    disabled={!withdrawAddr.trim() || !withdrawAmt || withdrawing || withdrawDone}
                    style={{flex:2,padding:'7px',background:withdrawDone?'#4CAF50':'rgba(0,184,230,0.1)',border:`1px solid ${withdrawDone?'#4CAF50':'var(--border3)'}`,borderRadius:'var(--radius)',color:withdrawDone?'#fff':'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'9px',fontWeight:600,cursor:'pointer'}}>
                    {withdrawing?'sending…':withdrawDone?'✓ sent':'Withdraw →'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dev reset */}
          <div style={{ padding:'12px', marginTop:'auto' }}>
            <button onClick={() => { setVessel(null); setHarbor(null); setOnboarded(false) }}
              style={{ background:'none', border:'none', color:'var(--text-off)', fontFamily:'var(--font-mono)', fontSize:'9px', cursor:'pointer', opacity:0.4, width:'100%', textAlign:'center' }}>
              ↺ reset (dev)
            </button>
          </div>
        </div>

        {/* ── RIGHT: Public Drift — read only, visually stunning ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Filter strip */}
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderBottom:'1px solid var(--border)', background:'rgba(1,6,8,0.6)', backdropFilter:'blur(8px)', flexShrink:0, overflowX:'auto', scrollbarWidth:'none' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.12em', textTransform:'uppercase', flexShrink:0, marginRight:'4px' }}>DRIFT</span>
            {(['all','open','eyes_only','burn'] as const).map(f => (
              <button key={f} className={`chip ${filter===f?'active':''}`}
                style={{ fontSize:'10px', padding:'3px 9px', flexShrink:0 }}
                onClick={() => setFilter(f)}>
                {f === 'all' ? 'all' : f === 'open' ? 'open' : f === 'eyes_only' ? 'eyes only' : 'burn'}
              </button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'4px', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--teal)', opacity:0.7, flexShrink:0 }}>
              <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'var(--teal)', animation:'livePulse 2.5s ease-in-out infinite' }}/>
              live
            </div>
          </div>

          {/* Public feed — hooks only, no read button */}
          <div ref={feedRef} style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>
            {filtered.map((cast, i) => (
              <PublicCastRow key={cast.id} cast={cast} index={i} onNudge={onEnterVessel}/>
            ))}
            <div style={{ padding:'32px 20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', borderTop:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.06em' }}>
                {formatTide(filtered.reduce((a,c) => a+c.tideCount, 0))} reads · the tide decides
              </div>
              {!vessel && (
                <button onClick={onEnterVessel} data-testid="enter-vessels-btn"
                  style={{ padding:'10px 24px', background:'var(--teal)', color:'var(--text-inv)', border:'none', borderRadius:'var(--radius-lg)', fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:600, cursor:'pointer', letterSpacing:'0.04em', boxShadow:'var(--teal-glow)' }}>
                  Launch a vessel to participate →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <TreasuryStrip/>
      <div style={{padding:'8px 16px',textAlign:'center',display:'flex',justifyContent:'center',gap:'16px'}}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('conk:legal', {detail:'terms'}))}
          style={{background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.06em'}}>
          Terms
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('conk:legal', {detail:'privacy'}))}
          style={{background:'none',border:'none',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.06em'}}>
          Privacy
        </button>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
          © 2026 Axiom Tide LLC
        </span>
      </div>
    </div>
  )
}

// ── Public cast row — hooks only, beautiful, no interaction ──

function PublicCastRow({ cast, index, onNudge }: { cast: any; index: number; onNudge: () => void; key?: string }) {
  const isBurn  = cast.mode === 'burn'
  const isEyes  = cast.mode === 'eyes_only'
  const expiry  = timeUntilExpiry(cast.expiresAt)
  const lhPct   = Math.min(100, (cast.tideCount / 1_000_000) * 100)
  const modeCls = isBurn ? 'burn' : isEyes ? 'eyes' : 'open'
  const [tapped, setTapped] = useState(false)

  return (
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      {/* Hook row — tap to expand */}
      <div
        onClick={() => setTapped(t => !t)}
        style={{ display:'flex', gap:'12px', padding:'16px 18px', cursor:'pointer', transition:'background 0.15s', background: tapped ? 'var(--surface)' : 'transparent', animationDelay:`${Math.min(index,8)*40}ms` }}
        onMouseEnter={e => { if(!tapped) e.currentTarget.style.background = 'rgba(0,184,230,0.02)' }}
        onMouseLeave={e => { if(!tapped) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', flexShrink:0, paddingTop:'2px' }}>
          <div className={`cast-mode-dot ${modeCls}`} style={{ fontSize:'12px' }}>
            {isBurn ? '🔥' : isEyes ? '👁' : '◎'}
          </div>
          {tapped && <div style={{ width:'1px', flex:1, minHeight:'16px', background:'linear-gradient(to bottom, var(--border2), transparent)' }}/>}
        </div>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'6px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap' }}>
            <span className={`badge badge-${modeCls}`}>
              {isBurn ? 'Burn' : isEyes ? 'Eyes Only' : 'Open'}
            </span>
            {isEyes && <span className="badge badge-eyes">map required</span>}
            {isBurn && <span className="badge badge-burn">burns on read</span>}
            <span className="badge badge-time">{formatTimeAgo(cast.createdAt)}</span>
            {expiry.urgent && !expiry.dead && <span className="cast-expiry-urgent">{expiry.label}</span>}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--teal)', fontWeight:600, marginLeft:'auto', opacity:0.8 }}>
              {formatTide(cast.tideCount)}
            </span>
          </div>
          <div data-testid="cast-hook" style={{ fontFamily:'var(--font-display)', fontSize:'15px', fontWeight:500, color:'var(--text)', lineHeight:1.5, letterSpacing:'-0.01em' }}>
            {cast.hook}
          </div>
          {!tapped && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', opacity:0.5 }}>
              tap to read · $0.001
            </div>
          )}
          {cast.mode === 'open' && cast.tideCount >= 10000 && (
            <div className="lh-bar-row">
              <div className="lh-bar-track"><div className="lh-bar-fill" style={{ width:`${lhPct}%` }}/></div>
              <span className="lh-bar-label">
                {cast.tideCount >= 1_000_000 ? '🔆 lighthouse' : `${lhPct.toFixed(1)}% to lighthouse`}
              </span>
            </div>
          )}
        </div>

        <div style={{ color:'var(--text-off)', alignSelf:'flex-start', paddingTop:'3px', flexShrink:0, transition:'transform 0.2s', transform: tapped ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      {/* Expanded nudge — vessel required */}
      {tapped && (
        <div style={{ padding:'12px 18px 16px', background:'var(--surface)', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'rgba(0,184,230,0.04)', border:'1px solid var(--border2)', borderRadius:'var(--radius-lg)', marginBottom:'10px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text)', marginBottom:'3px' }}>
                Vessel required to read
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', lineHeight:1.6 }}>
                $0.001 debited from vessel fuel · vessel → relay → cast · Harbor never sees this
              </div>
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:700, color:'var(--teal)', flexShrink:0 }}>
              $0.001
            </div>
          </div>
          <button onClick={onNudge}
            style={{ width:'100%', padding:'11px', background:'var(--teal)', color:'var(--text-inv)', border:'none', borderRadius:'var(--radius-lg)', fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:600, cursor:'pointer', letterSpacing:'0.06em', boxShadow:'0 0 12px rgba(0,184,230,0.25)', transition:'all 0.15s' }}>
            Launch vessel to read →
          </button>
        </div>
      )}
    </div>
  )
}
