/**
 * DockPanel — Author's Flare management + Reader's claimed Docks
 *
 * Two sections:
 *   SENT — Flares the author published (CastSounded events, mode=EYES_ONLY)
 *          Enhanced with localStorage metadata (recipient email, price)
 *   CLAIMED — Docks the reader entered (DockClaimed events)
 *
 * Data sources:
 *   - On-chain: suix_queryEvents for CastSounded + DockClaimed
 *   - Local: conk:sent_flares in localStorage for recipient emails
 *   - Per-cast: fetchCastById for live status checks
 */
import React, { useEffect, useState } from 'react'
import { IconDock } from '../components/Icons'
import { fetchSentFlares, fetchClaimedDocks, fetchCastById } from '../sui/client'
import { getAddress } from '../sui/zklogin'

interface SentFlare {
  castId: string
  hook: string
  createdAt: number
  expiresAt: number
  recipient?: string
  price?: number
  sentAt?: number
  // Live status from on-chain
  status?: 'live' | 'claimed' | 'expired' | 'burned'
  claimsUsed?: number
  maxClaims?: number
  revenue?: number
}

interface ClaimedDock {
  castId: string
  claimsUsed: number
  maxClaims: number
  claimedAt: number
  // Enriched from fetchCastById
  hook?: string
  feePaid?: number
}

type DockTab = 'sent' | 'claimed'

export function DockPanel() {
  const [tab, setTab]             = useState<DockTab>('sent')
  const [sent, setSent]           = useState<SentFlare[]>([])
  const [claimed, setClaimed]     = useState<ClaimedDock[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    loadDockData()
  }, [])

  async function loadDockData() {
    setLoading(true)
    const addr = getAddress()
    if (!addr) { setLoading(false); return }

    // Load localStorage flare metadata
    const localFlares: Record<string, any> = {}
    try {
      const raw = JSON.parse(localStorage.getItem('conk:sent_flares') || '[]')
      for (const f of raw) {
        if (f.castId) localFlares[f.castId] = f
      }
    } catch {}

    // Fetch sent flares from on-chain events
    const sentEvents = await fetchSentFlares(addr)
    const enrichedSent: SentFlare[] = []

    for (const ev of sentEvents) {
      const local = localFlares[ev.castId]
      const now = Date.now()
      let status: SentFlare['status'] = 'live'
      let claimsUsed = 0
      let maxClaims = 1
      let revenue = 0

      // Fetch live cast status
      const cast = await fetchCastById(ev.castId)
      if (cast) {
        claimsUsed = cast.claimsUsed
        maxClaims  = cast.maxClaims
        if (cast.burned) status = 'burned'
        else if (cast.isDockFull) { status = 'claimed'; revenue = Math.floor(cast.feePaid * 0.97) * claimsUsed }
        else if (!cast.isLighthouse && cast.expiresAt < now) status = 'expired'
      }

      enrichedSent.push({
        castId:     ev.castId,
        hook:       ev.hook,
        createdAt:  ev.createdAt,
        expiresAt:  ev.expiresAt,
        recipient:  local?.recipient,
        price:      local?.price ?? cast?.feePaid,
        sentAt:     local?.sentAt,
        status,
        claimsUsed,
        maxClaims,
        revenue,
      })
    }
    setSent(enrichedSent)

    // Fetch claimed docks from on-chain events
    const claimedEvents = await fetchClaimedDocks(addr)
    const enrichedClaimed: ClaimedDock[] = []

    for (const ev of claimedEvents) {
      const cast = await fetchCastById(ev.castId)
      enrichedClaimed.push({
        ...ev,
        hook:    cast?.hook ?? '(burned)',
        feePaid: cast?.feePaid ?? 0,
      })
    }
    setClaimed(enrichedClaimed)
    setLoading(false)
  }

  const formatTime = (ms: number) => {
    if (!ms) return '—'
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const statusColor: Record<string, string> = {
    live:    'var(--teal)',
    claimed: 'var(--eyes)',
    expired: 'var(--text-off)',
    burned:  'var(--burn)',
  }

  const statusLabel: Record<string, string> = {
    live:    'LIVE',
    claimed: 'CLAIMED',
    expired: 'EXPIRED',
    burned:  'BURNED',
  }

  return (
    <div data-testid="dock-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border2)',
        fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
      }}>
        {(['sent', 'claimed'] as DockTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0', background: 'transparent', border: 'none',
            color: tab === t ? 'var(--teal)' : 'var(--text-off)',
            borderBottom: tab === t ? '2px solid var(--teal)' : '2px solid transparent',
            cursor: 'pointer', textTransform: 'uppercase',
          }}>
            {t === 'sent' ? `Sent (${sent.length})` : `Claimed (${claimed.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-off)' }}>
            Loading Dock data from Sui...
          </div>
        )}

        {/* ── SENT TAB ── */}
        {!loading && tab === 'sent' && (
          <>
            {sent.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <IconDock size={24} color="var(--text-off)" />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-off)', marginTop: '12px' }}>
                  No Flares sent yet
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)', marginTop: '4px' }}>
                  Go to Cast → Flare to send your first
                </div>
              </div>
            )}
            {sent.map(f => (
              <div key={f.castId} style={{
                padding: '12px', marginBottom: '8px',
                background: 'var(--surface)', border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em',
                    color: statusColor[f.status ?? 'live'],
                    border: `1px solid ${statusColor[f.status ?? 'live']}`,
                    borderRadius: '100px', padding: '1px 6px',
                  }}>
                    {statusLabel[f.status ?? 'live']}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)' }}>
                    {formatTime(f.sentAt ?? f.createdAt)}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '6px', wordBreak: 'break-word' }}>
                  {f.hook}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)' }}>
                  {f.recipient && <span>To: {f.recipient}</span>}
                  <span>Price: ${((f.price ?? 0) / 1_000_000).toFixed(2)}</span>
                  <span>Dock: {f.claimsUsed ?? 0}/{f.maxClaims ?? 1}</span>
                  {(f.revenue ?? 0) > 0 && <span style={{ color: 'var(--teal)' }}>Earned: ${((f.revenue ?? 0) / 1_000_000).toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── CLAIMED TAB ── */}
        {!loading && tab === 'claimed' && (
          <>
            {claimed.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <IconDock size={24} color="var(--text-off)" />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-off)', marginTop: '12px' }}>
                  No Docks claimed yet
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)', marginTop: '4px' }}>
                  Claim Docks by opening Flare links from your email
                </div>
              </div>
            )}
            {claimed.map(d => (
              <div key={d.castId} style={{
                padding: '12px', marginBottom: '8px',
                background: 'var(--surface)', border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em',
                    color: 'var(--eyes)',
                    border: '1px solid var(--eyes)',
                    borderRadius: '100px', padding: '1px 6px',
                  }}>
                    ENTERED
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)' }}>
                    {formatTime(d.claimedAt)}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '6px', wordBreak: 'break-word' }}>
                  {d.hook}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-off)' }}>
                  <span>Paid: ${((d.feePaid ?? 0) / 1_000_000).toFixed(2)}</span>
                  <span>Dock: {d.claimsUsed}/{d.maxClaims}</span>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}
