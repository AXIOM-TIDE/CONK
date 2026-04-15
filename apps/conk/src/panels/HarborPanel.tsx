import { useState } from 'react'
import { getSession } from '../sui/zklogin'
import { useStore } from '../store/store'
import { ArcMeter } from '../components/FuelMeter'
import { IconBurn } from '../components/Icons'

export function HarborPanel() {
  const harbor       = useStore((s) => s.harbor)
  const vessel       = useStore((s) => s.vessel)
  const setHarbor    = useStore((s) => s.setHarbor)
  const setVessel    = useStore((s) => s.setVessel)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const [topAmt, setTopAmt]         = useState(500)
  const [destroying, setDestroying] = useState(false)

  if (!harbor) return <div className="empty-state">No Harbor open.</div>

  const reads   = Math.floor(harbor.balance / 0.1).toLocaleString()
  const days    = Math.ceil((harbor.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
  const balLabel = `$${(harbor.balance / 100).toFixed(2)}`

  // Color hint based on balance
  const low = harbor.balance < 50   // under $0.50
  const mid = harbor.balance < 200  // under $2.00

  return (
    <>
      {/* Arc meter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px' }}>
        <ArcMeter
          value={harbor.balance}
          max={1000}
          size={140}
          label={balLabel}
          sublabel="USDC"
        />
        <div style={{ display: 'flex', gap: '20px', marginTop: '2px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: low ? '#FF3A5C' : mid ? '#FFB020' : 'var(--teal)' }}>
              ~{reads}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>reads left</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)' }}>{days}d</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>expires</div>
          </div>
          {vessel && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>
                ${(vessel.fuel / 100).toFixed(2)}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>in vessel</div>
            </div>
          )}
        </div>

        {/* Copy address */}
        {(() => {
          const session = getSession()
          const addr = session?.address
          if (!addr) return null
          return (
            <div
              onClick={() => {
                navigator.clipboard.writeText(addr)
                  .then(() => {
                    const el = document.getElementById('addr-copy-label')
                    if (el) { el.textContent = 'Copied ✓'; setTimeout(() => { el.textContent = addr.slice(0,6) + '…' + addr.slice(-4) }, 1500) }
                  })
              }}
              style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'6px', padding:'6px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer' }}
            >
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Address</span>
              <span id="addr-copy-label" style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--teal)', flex:1 }}>
                {addr.slice(0,6)}…{addr.slice(-4)}
              </span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>copy ⎘</span>
            </div>
          )
        })()}

        {low && (
          <div style={{ marginTop: '10px', padding: '6px 12px', background: 'var(--burn-dim)', border: '1px solid rgba(255,58,92,0.2)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--burn)', letterSpacing: '0.04em' }}>
            Low balance — top up your Harbor
          </div>
        )}
      </div>

      {/* Top up */}
      <div className="section-hd" style={{ marginTop: '12px' }}>Top Up</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', marginBottom: '10px' }}>
        {[200, 500, 1000, 2000].map(c => (
          <button key={c} onClick={() => setTopAmt(c)} style={{
            padding: '10px', textAlign: 'center', cursor: 'pointer',
            background: topAmt === c ? 'var(--teal-dim)' : 'var(--surface)',
            border: `1px solid ${topAmt === c ? 'var(--border3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            color: topAmt === c ? 'var(--teal)' : 'var(--text)',
            fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600,
          }}>
            ${(c / 100).toFixed(0)}
          </button>
        ))}
      </div>
      <div style={{padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'20px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.8,textAlign:'center'}}>
        Send USDC to your Harbor address from <span style={{color:'var(--teal)'}}>Slush</span>, <span style={{color:'var(--teal)'}}>Sui Wallet</span>, or any Sui-compatible wallet
      </div>

      {/* Three Laws */}
      <div className="section-hd">Three Laws</div>
      {[
        ['I',   'Casts never reach the Harbor. Ever.'],
        ['II',  'The Harbor knows only that balance decreased.'],
        ['III', 'Vessel → Relay → Cast. The Harbor sees none of it.'],
      ].map(([n, l]) => (
        <div key={n} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--teal)', minWidth: '14px', marginTop: '2px' }}>{n}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.6 }}>{l}</span>
        </div>
      ))}

      {/* Fee schedule */}
      <div className="section-hd" style={{ marginTop: '12px' }}>Protocol Fees → Abyss</div>
      <div className="summary" style={{ marginBottom: '20px' }}>
        {[
          ['Harbor open',     '$0.05'],
          ['Vessel launch',   '$0.01'],
          ['Sound a cast',    '$0.001'],
          ['Read a cast',     '$0.001'],
          ['Open a Dock',     '$0.50'],
          ['Sound a Siren',   '$0.03'],
          ['Visit Lighthouse','$0.001'],
        ].map(([a, c]) => (
          <div key={a} className="summary-row"><span>{a}</span><span className="summary-val">{c}</span></div>
        ))}
      </div>

      {/* Destroy Harbor */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        {!destroying ? (
          <button
            onClick={() => setDestroying(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--burn-dim)', border: '1px solid rgba(255,58,92,0.2)', borderRadius: 'var(--radius)', color: 'var(--burn)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
          >
            <IconBurn size={12} color="var(--burn)"/> Destroy Harbor
          </button>
        ) : (
          <div style={{ padding: '12px', background: 'var(--burn-dim)', border: '1px solid rgba(255,58,92,0.25)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--burn)', marginBottom: '4px' }}>Destroy Harbor?</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)', lineHeight: 1.6, marginBottom: '12px' }}>
              Balance flows to the Abyss. Vessel sinks. All docks and sirens crumble. Cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                onClick={() => { setHarbor(null); setVessel(null); setOnboarded(false) }}>
                Confirm — destroy everything
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDestroying(false)}>cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
