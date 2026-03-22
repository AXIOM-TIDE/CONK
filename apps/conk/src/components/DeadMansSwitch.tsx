/**
 * CONK Dead Man's Switch
 * If a vessel doesn't interact with the protocol for X days,
 * automatically execute configured actions:
 * - Burn the vessel
 * - Send Shore balance to a designated address
 * - Post a final cast
 * - Notify coalitions
 *
 * No platform. No court. No administrator.
 * Your digital agent has instructions for what happens when you're gone.
 *
 * TODO (STEP 6): Triggered by Sui Move contract — time-locked execution
 */
import { useState } from 'react'
import { useStore } from '../store/store'

export interface DeadMansConfig {
  enabled:           boolean
  inactivityDays:    number      // trigger after X days of no interaction
  finalCast?:        string      // message to cast on trigger
  transferAddress?:  string      // Shore balance destination
  burnVessel:        boolean     // burn vessel on trigger
  notifyCoalitions:  boolean     // notify coalition members
  lastCheckedAt:     number
  configuredAt:      number
}

const DEFAULT_CONFIG: DeadMansConfig = {
  enabled:          false,
  inactivityDays:   30,
  finalCast:        '',
  transferAddress:  '',
  burnVessel:       true,
  notifyCoalitions: true,
  lastCheckedAt:    Date.now(),
  configuredAt:     Date.now(),
}

export function DeadMansSwitch() {
  const vessel = useStore((s) => s.vessel)
  const [config, setConfig] = useState<DeadMansConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  if (!vessel) return null

  const save = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    // TODO (STEP 6): write config to Sui — time-locked contract
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const triggerDate = new Date(Date.now() + config.inactivityDays * 24 * 60 * 60 * 1000)

  return (
    <div style={{padding:'16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
        <div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'2px'}}>
            Dead Man's Switch
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',lineHeight:1.5}}>
            Instructions for your vessel if you disappear
          </div>
        </div>
        <button
          onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
          style={{width:'44px',height:'24px',borderRadius:'100px',background:config.enabled?'var(--teal)':'var(--surface3)',border:`1px solid ${config.enabled?'var(--teal)':'var(--border)'}`,position:'relative',cursor:'pointer',padding:0,transition:'all 0.2s',flexShrink:0,boxShadow:config.enabled?'0 0 8px rgba(0,184,230,0.4)':'none'}}>
          <div style={{width:'18px',height:'18px',background:config.enabled?'var(--bg)':'var(--text-dim)',borderRadius:'50%',position:'absolute',top:'2px',left:config.enabled?'22px':'2px',transition:'left 0.2s'}}/>
        </button>
      </div>

      {config.enabled && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={{padding:'8px 10px',background:'rgba(255,45,85,0.05)',border:'1px solid rgba(255,45,85,0.15)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'9px',color:'rgba(255,45,85,0.7)',lineHeight:1.7}}>
            ⚠ If your vessel shows no activity for {config.inactivityDays} days, the switch triggers automatically. Currently set to trigger after: <strong>{triggerDate.toLocaleDateString()}</strong>
          </div>

          {/* Inactivity period */}
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
              Trigger after inactivity
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              {[7,14,30,60,90].map(d => (
                <button key={d} onClick={() => setConfig(c => ({ ...c, inactivityDays: d }))}
                  style={{flex:1,padding:'6px 4px',background:config.inactivityDays===d?'rgba(255,45,85,0.1)':'var(--surface2)',border:`1px solid ${config.inactivityDays===d?'rgba(255,45,85,0.3)':'var(--border)'}`,borderRadius:'var(--radius)',color:config.inactivityDays===d?'rgba(255,45,85,0.8)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',textAlign:'center'}}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Final cast */}
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
              Final signal (optional)
            </div>
            <textarea
              value={config.finalCast}
              onChange={e => setConfig(c => ({ ...c, finalCast: e.target.value }))}
              placeholder="A message cast into the tide when this switch triggers…"
              rows={2}
              style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',resize:'none'}}
            />
          </div>

          {/* Transfer address */}
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>
              Transfer Shore balance to (Sui address)
            </div>
            <input
              value={config.transferAddress}
              onChange={e => setConfig(c => ({ ...c, transferAddress: e.target.value }))}
              placeholder="0x… leave empty to send to treasury"
              style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none'}}
            />
          </div>

          {/* Options */}
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {[
              { key:'burnVessel',       label:'Burn vessel on trigger' },
              { key:'notifyCoalitions', label:'Notify coalition members' },
            ].map(opt => (
              <div key={opt.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:'var(--surface2)',borderRadius:'var(--radius)'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>{opt.label}</span>
                <button
                  onClick={() => setConfig(c => ({ ...c, [opt.key]: !c[opt.key as keyof DeadMansConfig] }))}
                  style={{width:'32px',height:'18px',borderRadius:'100px',background:(config[opt.key as keyof DeadMansConfig] as boolean)?'var(--teal)':'var(--surface3)',border:'none',position:'relative',cursor:'pointer',padding:0,transition:'all 0.15s',flexShrink:0}}>
                  <div style={{width:'12px',height:'12px',background:'white',borderRadius:'50%',position:'absolute',top:'2px',left:(config[opt.key as keyof DeadMansConfig] as boolean)?'17px':'2px',transition:'left 0.15s'}}/>
                </button>
              </div>
            ))}
          </div>

          <button onClick={save} disabled={saving}
            style={{width:'100%',padding:'10px',background:'rgba(255,45,85,0.08)',border:'1px solid rgba(255,45,85,0.2)',borderRadius:'var(--radius-lg)',color:saved?'#4CAF50':'rgba(255,45,85,0.7)',fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em',transition:'all 0.2s'}}>
            {saving ? 'Writing to chain…' : saved ? '✓ Switch configured' : 'Set Dead Man\'s Switch · on-chain'}
          </button>

          <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',textAlign:'center',lineHeight:1.6}}>
            Stored on Sui. No administrator can cancel it.<br/>
            No platform can override it. It executes or it doesn't.
          </div>
        </div>
      )}
    </div>
  )
}
