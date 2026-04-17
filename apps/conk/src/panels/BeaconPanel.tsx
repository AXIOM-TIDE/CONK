/**
 * BeaconPanel — Cast Collections
 *
 * A unified view of everything a vessel has published.
 * Groups Lighthouses, Sirens, and Casts by vessel ID.
 * This is the creator profile page — the Beacon.
 *
 * Drop into apps/conk/src/panels/BeaconPanel.tsx
 *
 * Then add to VesselHome.tsx:
 *   1. Import: import { BeaconPanel } from '../panels/BeaconPanel'
 *   2. Add tab: { id:'beacon', icon:<span style={{fontSize:'13px'}}>⚓</span>, label:'Beacon', locked:false }
 *   3. Add to VesselTab type: 'beacon'
 *   4. Add to tab render: {tab === 'beacon' && <BeaconPanel/>}
 */

import { useState }          from 'react'
import { useStore }          from '../store/store'
import { DecayBadge }        from '../components/DecayBadge'
import { PermanentBadge }    from '../components/PermanentBadge'
import { VesselSubscribeButton } from '../components/VesselSubscribeButton'
import { VesselNameEditor, VesselAvatar }   from '../components/VesselNameEditor'

type BeaconTab = 'all' | 'lighthouses' | 'sirens' | 'casts'

export function BeaconPanel() {
  const vessel      = useStore((s) => s.vessel)
  const driftCasts  = useStore((s) => s.driftCasts)
  const lighthouses = useStore((s) => s.lighthouses)
  const sirens      = useStore((s) => s.sirens)

  const [tab,        setTab]        = useState<BeaconTab>('all')
  const [editingName, setEditingName] = useState(false)

  if (!vessel) return null

  // Filter to this vessel's published content
  const myLighthouses = lighthouses.filter((l: any) => l.vesselId === vessel.id || l.beaconId === vessel.id)
  const mySirens      = sirens.filter((s: any) => s.vesselId === vessel.id && s.sirenType === 'audio')
  const myCasts       = driftCasts.filter((c: any) => c.vesselId === vessel.id)

  const totalEarned   = myCasts.reduce((sum: number, c: any) => sum + (c.revenueEarned ?? 0), 0)
  const totalReads    = myCasts.reduce((sum: number, c: any) => sum + (c.tideCount ?? 0), 0)
    + myLighthouses.reduce((sum: number, l: any) => sum + (l.tideCount ?? 0), 0)

  const displayName = vessel.displayName || null
  const avatarColor = vessel.avatarColor || 'var(--teal)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* Beacon header */}
      <div style={{
        padding:      '14px',
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
          <VesselAvatar vessel={vessel} size={44}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text)', fontWeight:600 }}>
              {displayName ?? 'anonymous vessel'}
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'2px' }}>
              {vessel.class} · {vessel.id.slice(0, 16)}…
            </div>
          </div>
          <button
            onClick={() => setEditingName(!editingName)}
            style={{
              background:'none', border:'1px solid var(--border)',
              borderRadius:'var(--radius)', color:'var(--text-off)',
              fontFamily:'var(--font-mono)', fontSize:'9px',
              padding:'4px 8px', cursor:'pointer',
            }}
          >
            {editingName ? 'done' : 'edit'}
          </button>
        </div>

        {editingName && (
          <div style={{ marginBottom:'12px' }}>
            <VesselNameEditor vesselId={vessel.id} onClose={() => setEditingName(false)}/>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'flex', gap:'16px' }}>
          {[
            ['Lighthouses', myLighthouses.length],
            ['Sirens',      mySirens.length],
            ['Casts',       myCasts.length],
            ['Total reads', totalReads.toLocaleString()],
            ['Earned',      `$${(totalEarned / 100).toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label as string} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--teal)', fontWeight:600 }}>
                {value}
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-off)', marginTop:'2px' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab filter */}
      <div style={{ display:'flex', gap:'6px' }}>
        {(['all', 'lighthouses', 'sirens', 'casts'] as BeaconTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'7px 4px',
            background: tab===t ? 'rgba(0,184,230,0.1)' : 'var(--surface)',
            border: `1px solid ${tab===t ? 'var(--border3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            color: tab===t ? 'var(--teal)' : 'var(--text-dim)',
            fontFamily:'var(--font-mono)', fontSize:'9px',
            cursor:'pointer', fontWeight: tab===t ? 600 : 400,
            letterSpacing:'0.04em',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Lighthouses */}
      {(tab === 'all' || tab === 'lighthouses') && myLighthouses.length > 0 && (
        <div>
          {tab === 'all' && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>
              Lighthouses ({myLighthouses.length})
            </div>
          )}
          {myLighthouses.map((lh: any) => (
            <div key={lh.id} style={{
              padding:'12px 14px', background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-lg)',
              marginBottom:'6px',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600 }}>
                  {lh.hook}
                </div>
                {(lh as any).lighthouseType === 'permanent'
                  ? <PermanentBadge size="sm"/>
                  : <DecayBadge expiresAt={lh.expiresAt}/>
                }
              </div>
              <div style={{ display:'flex', gap:'12px', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                <span>{lh.tideCount?.toLocaleString() ?? 0} reads</span>
                {(lh as any).price && <span>${((lh as any).price / 1_000_000).toFixed(2)}</span>}
                {(lh as any).mediaType && <span>{(lh as any).mediaType.split('/')[0]}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audio Sirens */}
      {(tab === 'all' || tab === 'sirens') && mySirens.length > 0 && (
        <div>
          {tab === 'all' && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>
              Audio Sirens ({mySirens.length})
            </div>
          )}
          {mySirens.map((s: any) => (
            <div key={s.id} style={{
              padding:'12px 14px', background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-lg)',
              marginBottom:'6px',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600 }}>
                  {s.hook}
                </div>
                <PermanentBadge size="sm" label={s.isSample ? 'sample' : `$${(s.price / 1_000_000).toFixed(3)}`}/>
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                {s.mediaType?.split('/')[1] ?? 'audio'} · {s.mode ?? 'open'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Casts */}
      {(tab === 'all' || tab === 'casts') && myCasts.length > 0 && (
        <div>
          {tab === 'all' && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>
              Casts ({myCasts.length})
            </div>
          )}
          {myCasts.map((c: any) => (
            <div key={c.id} style={{
              padding:'12px 14px', background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-lg)',
              marginBottom:'6px',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600, flex:1, marginRight:'8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.hook}
                </div>
                <DecayBadge expiresAt={c.expiresAt}/>
              </div>
              <div style={{ display:'flex', gap:'12px', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                <span>{c.tideCount?.toLocaleString() ?? 0} reads</span>
                <span>{c.mode}</span>
                {c.revenueEarned > 0 && <span style={{ color:'var(--teal)' }}>${(c.revenueEarned / 100).toFixed(2)} earned</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {myLighthouses.length === 0 && mySirens.length === 0 && myCasts.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0' }}>
          <div style={{ fontSize:'32px', marginBottom:'12px', opacity:0.2 }}>⚓</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text)', marginBottom:'6px' }}>
            Nothing published yet
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.7 }}>
            Sound a cast · broadcast a siren · publish a lighthouse
          </div>
        </div>
      )}

      {/* Subscribe to this vessel */}
      <div style={{ paddingTop:'4px', borderTop:'1px solid var(--border)' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px' }}>
          Subscribe to this beacon
        </div>
        <VesselSubscribeButton
          vesselId={vessel.id}
          displayName={vessel.displayName}
          priceUsdc={100_000}
          interval="monthly"
        />
      </div>
    </div>
  )
}
