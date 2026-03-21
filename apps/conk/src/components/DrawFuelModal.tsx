import { useState } from 'react'
import { useStore } from '../store/store'
import { FuelBar } from './FuelMeter'

interface Props {
  onClose: () => void
}

export function DrawFuelModal({ onClose }: Props) {
  const vessel     = useStore((s) => s.vessel)
  const harbor     = useStore((s) => s.harbor)
  const fuelVessel = useStore((s) => s.fuelVessel)
  const [selected, setSelected] = useState<number|null>(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  if (!vessel) return null

  const bal       = harbor ? harbor.balance : 0
  const fuel      = vessel.fuel
  const isDry     = fuel <= 0
  const tierIcon = vessel.class === 'daemon' ? '⚙' : '◌'

  const AMOUNTS = [10, 25, 50, 100] // cents

  const handleDraw = async () => {
    if (!selected || !harbor || harbor.balance < selected) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    fuelVessel(selected)
    setLoading(false)
    setDone(true)
    setTimeout(onClose, 800)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:210,
      background:'rgba(1,6,8,0.93)', backdropFilter:'blur(16px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', animation:'fadeIn 0.15s ease',
    }}>
      <div data-testid="draw-fuel-modal" style={{
        width:'100%', maxWidth:'380px',
        background:'var(--surface)',
        border:'1px solid var(--border2)',
        borderRadius:'var(--radius-xl)',
        overflow:'hidden',
        boxShadow:'0 0 48px rgba(0,184,230,0.07)',
      }}>
        {/* Header */}
        <div style={{
          padding:'14px 20px',
          background:'rgba(0,184,230,0.04)',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,color:'var(--text)',letterSpacing:'0.04em'}}>
              ⚡ Draw Fuel
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>
              Fuel is bound to this vessel. No refunds. No transfer.
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-off)',cursor:'pointer',fontSize:'18px',lineHeight:1,padding:'4px'}}>×</button>
        </div>

        <div style={{padding:'18px 20px'}}>

          {/* Vessel + current fuel */}
          <div style={{
            display:'flex', alignItems:'center', gap:'12px',
            padding:'12px 14px',
            background:'var(--surface2)',
            border:`1px solid ${isDry?'var(--burn-line)':'var(--border)'}`,
            borderRadius:'var(--radius-lg)',
            marginBottom:'16px',
          }}>
            <div style={{
              width:'40px', height:'40px', borderRadius:'50%',
              background: isDry ? 'rgba(255,45,85,0.08)' : 'rgba(0,184,230,0.08)',
              border:`1px solid ${isDry?'var(--burn-line)':'var(--border2)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'18px', color:'var(--teal)', flexShrink:0,
            }}>
              {tierIcon}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--teal)',fontWeight:600,marginBottom:'4px'}}>
                vessel
                {isDry && <span style={{color:'var(--burn)',marginLeft:'8px',fontSize:'9px',border:'1px solid var(--burn-line)',borderRadius:'100px',padding:'1px 6px'}}>dry</span>}
              </div>
              <FuelBar value={done && selected ? Math.min(fuel + selected, 100) : fuel} max={100} width={140} showLabel animate/>
            </div>
          </div>

          {/* Amount selector */}
          <div style={{marginBottom:'16px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'10px'}}>
              Select amount
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
              {AMOUNTS.map(c => {
                const canAfford = harbor && harbor.balance >= c
                const isSelected = selected === c
                return (
                  <button key={c} data-testid={`fuel-amount-${c}`}
                    onClick={() => canAfford && setSelected(c)}
                    disabled={!canAfford}
                    style={{
                      padding:'12px 6px',
                      background: isSelected ? 'rgba(0,184,230,0.1)' : 'var(--surface2)',
                      border:`1px solid ${isSelected?'var(--teal)':canAfford?'var(--border)':'var(--border)'}`,
                      borderRadius:'var(--radius-lg)',
                      color: isSelected ? 'var(--teal)' : canAfford ? 'var(--text)' : 'var(--text-off)',
                      fontFamily:'var(--font-mono)',
                      fontSize:'13px', fontWeight:600,
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      textAlign:'center',
                      transition:'all 0.15s',
                      boxShadow: isSelected ? '0 0 10px rgba(0,184,230,0.15)' : 'none',
                      opacity: canAfford ? 1 : 0.4,
                    }}>
                    ${(c/100).toFixed(2)}
                  </button>
                )
              })}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'8px',textAlign:'center'}}>
              Harbor balance: <span style={{color:'var(--teal)'}}>${(bal/100).toFixed(2)}</span>
            </div>
          </div>

          {/* Void notice */}
          <div style={{
            padding:'8px 10px',
            background:'rgba(255,45,85,0.04)',
            border:'1px solid rgba(255,45,85,0.08)',
            borderRadius:'var(--radius)',
            marginBottom:'16px',
            fontFamily:'var(--font-mono)',fontSize:'9px',
            color:'rgba(255,45,85,0.5)',
            letterSpacing:'0.04em',lineHeight:1.7,
          }}>
            Fuel routes to the vessel. No refunds. No transfer.
          </div>

          {done ? (
            <div style={{padding:'12px',background:'rgba(0,184,230,0.07)',border:'1px solid var(--border3)',borderRadius:'var(--radius-lg)',textAlign:'center',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--teal)',fontWeight:600,letterSpacing:'0.04em'}}>
              ⚡ Vessel charged
            </div>
          ) : (
            <button
              onClick={handleDraw} data-testid="charge-vessel-btn"
              disabled={!selected || loading || (harbor ? harbor.balance < (selected||0) : true)}
              style={{
                width:'100%', padding:'12px',
                background: selected ? 'var(--teal)' : 'var(--surface2)',
                color: selected ? 'var(--text-inv)' : 'var(--text-off)',
                border:`1px solid ${selected?'var(--teal)':'var(--border)'}`,
                borderRadius:'var(--radius-lg)',
                fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:600,
                cursor: selected ? 'pointer' : 'not-allowed',
                letterSpacing:'0.04em',
                display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
                boxShadow: selected ? '0 0 16px rgba(0,184,230,0.2)' : 'none',
                transition:'all 0.15s',
                opacity: selected ? 1 : 0.6,
              }}>
              {loading
                ? <><span className="spinner" style={{borderTopColor:'var(--text-inv)',borderColor:'rgba(0,0,0,0.2)'}}/>Charging vessel…</>
                : selected
                ? `⚡ Charge Vessel · $${(selected/100).toFixed(2)}`
                : 'Select an amount'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
