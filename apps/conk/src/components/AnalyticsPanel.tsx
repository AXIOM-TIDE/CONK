/**
 * AnalyticsPanel — Creator analytics for the Dock
 *
 * Drop into apps/conk/src/components/AnalyticsPanel.tsx
 *
 * Shows plays, revenue, unique vessels, and top content
 * for everything the current vessel has published.
 *
 * Add to DockPanel.tsx:
 *   1. Import: import { AnalyticsPanel } from '../components/AnalyticsPanel'
 *   2. Add tab: 'analytics' to the filter type
 *   3. Add analytics section above or below the dock list
 */

import { useMemo } from 'react'
import { useStore } from '../store/store'

function StatCard({ label, value, sub, color }: {
  label: string
  value: string | number
  sub?:  string
  color?: string
}) {
  return (
    <div style={{
      padding:      '10px 12px',
      background:   'var(--surface2)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      flex:         1,
      minWidth:     '80px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   '16px',
        fontWeight: 700,
        color:      color ?? 'var(--teal)',
        marginBottom: '3px',
      }}>
        {value}
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-off)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', marginTop:'2px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height:'4px', background:'var(--surface3)', borderRadius:'2px', overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${pct}%`, background: color ?? 'var(--teal)', borderRadius:'2px', transition:'width 0.3s' }}/>
    </div>
  )
}

export function AnalyticsPanel() {
  const vessel      = useStore((s) => s.vessel)
  const driftCasts  = useStore((s) => s.driftCasts)
  const lighthouses = useStore((s) => s.lighthouses)
  const sirens      = useStore((s) => s.sirens)
  const subscriptions = useStore((s) => (s as any).subscriptions ?? [])

  const analytics = useMemo(() => {
    if (!vessel) return null

    const myCasts       = driftCasts.filter((c: any) => c.vesselId === vessel.id)
    const myLighthouses = lighthouses.filter((l: any) => l.vesselId === vessel.id || l.beaconId === vessel.id)
    const mySirens      = sirens.filter((s: any) => s.vesselId === vessel.id && s.sirenType === 'audio')
    const mySubs        = subscriptions.filter((s: any) => s.vesselId === vessel.id && s.active)

    const totalReads    = myCasts.reduce((sum: number, c: any) => sum + (c.tideCount ?? 0), 0)
      + myLighthouses.reduce((sum: number, l: any) => sum + (l.tideCount ?? 0), 0)

    const totalRevenue  = myCasts.reduce((sum: number, c: any) => sum + (c.revenueEarned ?? 0), 0)
      + myLighthouses.reduce((sum: number, l: any) => sum + (l.revenueEarned ?? 0), 0)

    const subRevenue    = mySubs.reduce((sum: number, s: any) => sum + (s.priceUsdc ?? 0), 0)

    // Top content by reads
    const allContent = [
      ...myCasts.map((c: any) => ({ id:c.id, hook:c.hook, reads:c.tideCount??0, type:'cast', revenue:c.revenueEarned??0 })),
      ...myLighthouses.map((l: any) => ({ id:l.id, hook:l.hook, reads:l.tideCount??0, type:'lighthouse', revenue:l.revenueEarned??0 })),
    ].sort((a, b) => b.reads - a.reads).slice(0, 5)

    const maxReads = allContent[0]?.reads ?? 1

    // Revenue last 7 days (from createdAt)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentRevenue = myCasts
      .filter((c: any) => c.createdAt > sevenDaysAgo)
      .reduce((sum: number, c: any) => sum + (c.revenueEarned ?? 0), 0)

    return {
      totalReads,
      totalRevenue,
      subRevenue,
      recentRevenue,
      castCount:      myCasts.length,
      lighthouseCount: myLighthouses.length,
      sirenCount:     mySirens.length,
      subCount:       mySubs.length,
      allContent,
      maxReads,
    }
  }, [vessel, driftCasts, lighthouses, sirens, subscriptions])

  if (!vessel || !analytics) return null

  const fmtUsdc  = (v: number) => `$${(v / 1_000_000).toFixed(2)}`
  const fmtCents = (v: number) => `$${(v / 100).toFixed(2)}`

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

      {/* Header */}
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
        Analytics · {vessel.displayName ?? 'your vessel'}
      </div>

      {/* Top stats */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
        <StatCard label="Total reads"   value={analytics.totalReads.toLocaleString()} />
        <StatCard label="Revenue"       value={fmtUsdc(analytics.totalRevenue)} color="var(--teal)" />
        <StatCard label="Subscribers"   value={analytics.subCount} sub={`${fmtUsdc(analytics.subRevenue)}/period`} />
        <StatCard label="7-day revenue" value={fmtUsdc(analytics.recentRevenue)} color="#34C759" />
      </div>

      {/* Content breakdown */}
      <div style={{ display:'flex', gap:'8px' }}>
        <StatCard label="Casts"       value={analytics.castCount} />
        <StatCard label="Lighthouses" value={analytics.lighthouseCount} />
        <StatCard label="Sirens"      value={analytics.sirenCount} />
      </div>

      {/* Top content */}
      {analytics.allContent.length > 0 && (
        <div style={{
          padding:      '12px',
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'10px' }}>
            Top content
          </div>
          {analytics.allContent.map((item, i) => (
            <div key={item.id} style={{ marginBottom: i < analytics.allContent.length - 1 ? '10px' : 0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-off)', flexShrink:0 }}>
                    {item.type === 'lighthouse' ? '⚓' : '◌'}
                  </span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {item.hook}
                  </span>
                </div>
                <div style={{ display:'flex', gap:'8px', flexShrink:0, marginLeft:'8px' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)' }}>
                    {item.reads.toLocaleString()}
                  </span>
                  {item.revenue > 0 && (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--teal)' }}>
                      {fmtUsdc(item.revenue)}
                    </span>
                  )}
                </div>
              </div>
              <MiniBar value={item.reads} max={analytics.maxReads}/>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {analytics.allContent.length === 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)' }}>
          No published content yet — sound a cast to start tracking
        </div>
      )}

      {/* Treasury note */}
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-off)', lineHeight:1.7, padding:'8px 10px', background:'var(--surface2)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
        Revenue shown is your 97% share after treasury cut · Updates on each read
      </div>
    </div>
  )
}
