/**
 * ProtocolPanel — Sprint 4 Protocol Depth Features
 * Tide Index · Signal Futures · Dead Man's Switch · Harbor Inheritance · Void Receipt
 * The features that make CONK a permanent protocol, not just an app.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { TideIndex } from '../components/TideIndex'
import { DeadMansSwitch } from '../components/DeadMansSwitch'
import { VoidReceipt } from '../components/VoidReceipt'
import { BackButton } from '../components/BackButton'

function HarborInheritance() {
  const vessel = useStore((s) => s.vessel)
  const harbor = useStore((s) => s.harbor)
  const [successor, setSuccessor] = useState('')
  const [delay, setDelay]         = useState(90)
  const [saved, setSaved]         = useState(false)
  const [saving, setSaving]       = useState(false)

  const save = async () => {
    if (!successor.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    // TODO (STEP 6): write inheritance config to Sui time-locked contract
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>
        Harbor Inheritance
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',lineHeight:1.6,marginBottom:'12px'}}>
        If your Harbor is inactive for the set period, control transfers to the successor address. No court. No platform. No administrator.
      </div>

      <div style={{marginBottom:'10px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
          Successor Harbor address (Sui)
        </div>
        <input
          value={successor}
          onChange={e => setSuccessor(e.target.value)}
          placeholder="0x… successor wallet address"
          style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none'}}
        />
      </div>

      <div style={{marginBottom:'12px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
          Transfer after inactivity
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {[30,60,90,180,365].map(d => (
            <button key={d} onClick={() => setDelay(d)}
              style={{flex:1,padding:'6px 4px',background:delay===d?'rgba(0,184,230,0.1)':'var(--surface2)',border:`1px solid ${delay===d?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:delay===d?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',textAlign:'center'}}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'8px 10px',background:'rgba(0,184,230,0.04)',borderRadius:'var(--radius)',marginBottom:'10px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
        Current balance: <span style={{color:'var(--teal)',fontWeight:600}}>${((harbor?.balance ?? 0)/100).toFixed(2)}</span><br/>
        After {delay} days of inactivity, this transfers to the successor.
      </div>

      <button onClick={save} disabled={!successor.trim() || saving}
        style={{width:'100%',padding:'9px',background:successor.trim()?'rgba(0,184,230,0.08)':'var(--surface2)',border:`1px solid ${successor.trim()?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius-lg)',color:saved?'#4CAF50':successor.trim()?'var(--teal)':'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,cursor:successor.trim()?'pointer':'default',letterSpacing:'0.04em',transition:'all 0.2s'}}>
        {saving ? 'Writing to chain…' : saved ? '✓ Inheritance configured' : 'Set Harbor Inheritance · on-chain'}
      </button>
    </div>
  )
}

function SignalFuturesUI() {
  const vessel = useStore((s) => s.vessel)
  const casts  = useStore((s) => s.driftCasts)
  const futureCasts = casts.filter(c => c.unlocksAt && c.unlocksAt > Date.now())

  return (
    <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>
        Signal Futures
      </div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',lineHeight:1.6,marginBottom:'12px'}}>
        Casts that unlock when on-chain conditions are met — not just timestamps. Price triggers, tide thresholds, Lighthouse status.
      </div>

      {futureCasts.length === 0 ? (
        <div style={{textAlign:'center',padding:'16px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>
          No future signals active. Cast a signal with a future unlock condition from the Cast tab.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {futureCasts.map(c => {
            const remaining = (c.unlocksAt! - Date.now()) / 3600000
            return (
              <div key={c.id} style={{padding:'8px 10px',background:'var(--surface2)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'14px'}}>🔒</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {c.hook}
                  </div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)'}}>
                    Unlocks in {remaining < 1 ? '<1h' : remaining < 24 ? `${Math.floor(remaining)}h` : `${Math.floor(remaining/24)}d`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{marginTop:'10px',padding:'8px 10px',background:'rgba(0,184,230,0.04)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
        Add unlock conditions from the <strong>Cast</strong> tab → toggle "Future Release".<br/>
        <span style={{color:'var(--text-off)'}}>STEP 6: price triggers + tide thresholds verified by Sui oracle.</span>
      </div>
    </div>
  )
}

type SubTab = 'tide' | 'futures' | 'deadmans' | 'inheritance' | 'void'

export function ProtocolPanel({ onBack }: { onBack: () => void }) {
  const [sub, setSub] = useState<SubTab>('tide')

  const tabs: { id: SubTab; label: string; icon: string }[] = [
    { id:'tide',        label:'Tide Index',  icon:'⚡' },
    { id:'futures',     label:'Futures',     icon:'🔒' },
    { id:'deadmans',    label:'Switch',      icon:'⏳' },
    { id:'inheritance', label:'Inherit',     icon:'⚓' },
    { id:'void',        label:'Receipts',    icon:'◎' },
  ]

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
        <BackButton onClick={onBack} label="Drift"/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          Protocol Depth
        </span>
      </div>

      {/* Sub-tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'14px',overflowX:'auto',paddingBottom:'2px'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            style={{flexShrink:0,padding:'6px 10px',background:sub===t.id?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${sub===t.id?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:sub===t.id?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {sub === 'tide'        && <TideIndex/>}
      {sub === 'futures'     && <SignalFuturesUI/>}
      {sub === 'deadmans'    && <DeadMansSwitch/>}
      {sub === 'inheritance' && <HarborInheritance/>}
      {sub === 'void'        && <VoidReceipt/>}
    </div>
  )
}
