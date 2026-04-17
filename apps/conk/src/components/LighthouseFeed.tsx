/**
 * LighthouseFeed — updated to show both lighthouse types.
 *
 * VIRAL lighthouses:     earned by read momentum, has expiresAt, DecayBadge
 * PERMANENT lighthouses: published by creator, no expiry, PermanentBadge, streamable
 *
 * Replace apps/conk/src/components/LighthouseFeed.tsx with this file.
 */

import { useState }          from 'react'
import { useStore }          from '../store/store'
import { IconLighthouse, IconBack } from './Icons'
import { DecayBadge }        from './DecayBadge'
import { PermanentBadge, PermanentPill } from './PermanentBadge'
import { StreamPlayer }      from './StreamPlayer'

type Tab = 'viral' | 'permanent'

export function LighthouseFeed({
  onOpen,
  onBack,
}: {
  onOpen:  (id: string) => void
  onBack:  () => void
}) {
  const lighthouses = useStore((s) => s.lighthouses)
  const [tab,        setTab]        = useState<Tab>('viral')
  const [streaming,  setStreaming]  = useState<string | null>(null)

  const viral     = lighthouses.filter((lh) => lh.lighthouseType !== 'permanent')
  const permanent = lighthouses.filter((lh) => lh.lighthouseType === 'permanent')

  return (
    <div className="drift-col">

      {/* Top bar */}
      <div className="drift-filter-bar" style={{ gap: '8px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'none', border: 'none', color: 'var(--teal)',
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            cursor: 'pointer', padding: 0,
          }}
        >
          <IconBack size={12} color="var(--teal)"/> back
        </button>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px',
          color: 'var(--text-off)', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginLeft: '4px',
        }}>
          LIGHTHOUSES
        </span>

        {/* Tab switcher */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {(['viral', 'permanent'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background:   tab === t ? 'rgba(0,184,230,0.1)' : 'none',
                border:       tab === t ? '1px solid rgba(0,184,230,0.3)' : '1px solid transparent',
                borderRadius: '4px',
                color:        tab === t ? 'var(--teal)' : 'var(--text-off)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '9px',
                padding:      '2px 8px',
                cursor:       'pointer',
                letterSpacing:'0.06em',
              }}
            >
              {t} {t === 'viral' ? `(${viral.length})` : `(${permanent.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="drift-feed">

        {/* ── VIRAL tab ── */}
        {tab === 'viral' && (
          <>
            {viral.map((lh, i) => (
              <div
                key={lh.id}
                className="cast-row"
                style={{ animationDelay: `${i * 50}ms`, cursor: 'pointer', flexDirection: 'column', padding: 0 }}
                onClick={() => onOpen(lh.id)}
              >
                <div style={{ display: 'flex', gap: '12px', padding: '14px 16px' }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '4px', flexShrink: 0, paddingTop: '2px',
                  }}>
                    <div style={{
                      width: '20px', height: '20px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--teal)', filter: 'drop-shadow(0 0 6px rgba(0,184,230,0.6))',
                    }}>
                      <IconLighthouse size={16} color="var(--teal)"/>
                    </div>
                    <div className="cast-thread-line"/>
                  </div>
                  <div className="cast-content">
                    <div className="cast-badges">
                      {lh.isGenesis && (
                        <span className="badge" style={{
                          color: 'var(--teal)', borderColor: 'rgba(0,184,230,0.25)',
                          background: 'rgba(0,184,230,0.07)', letterSpacing: '0.06em',
                        }}>✦ genesis</span>
                      )}
                      <span className="badge badge-time">
                        {new Date(lh.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                      <span className="cast-tide">{lh.tideCount.toLocaleString()} reads</span>
                      <DecayBadge expiresAt={lh.expiresAt}/>
                    </div>
                    <div className="cast-hook">{lh.hook}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-off)', marginTop: '2px' }}>
                      {lh.isGenesis
                        ? 'free to read · permanent · unkillable'
                        : 'click to read · $0.001 · resets 100yr clock'}
                    </div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-off)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            ))}

            {viral.length === 0 && (
              <div className="empty-state">
                <IconLighthouse size={32} color="var(--text-off)"/>
                <div>no viral lighthouses yet</div>
                <div style={{ color: 'var(--text-off)', fontSize: '10px' }}>
                  earned by the tide — not purchased
                </div>
              </div>
            )}

            <div style={{
              padding: '20px 14px', fontFamily: 'var(--font-mono)', fontSize: '9px',
              color: 'var(--text-off)', textAlign: 'center', lineHeight: 1.8,
              borderTop: '1px solid var(--border)',
            }}>
              1,000,000 reads in 24h → instant lighthouse<br/>
              500,000 reads × 3 tides → earned lighthouse<br/>
              only open public casts are eligible
            </div>
          </>
        )}

        {/* ── PERMANENT tab ── */}
        {tab === 'permanent' && (
          <>
            {permanent.map((lh, i) => (
              <div key={lh.id} style={{ borderBottom: '1px solid var(--border)', animationDelay: `${i * 50}ms` }}>

                {/* Card header */}
                <div
                  style={{ display: 'flex', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setStreaming(streaming === lh.id ? null : lh.id)}
                >
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '4px', flexShrink: 0, paddingTop: '2px',
                  }}>
                    <div style={{
                      width: '20px', height: '20px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--teal)',
                      filter: 'drop-shadow(0 0 8px rgba(0,184,230,0.8))',
                    }}>
                      <AnchorGlyph/>
                    </div>
                  </div>

                  <div className="cast-content" style={{ flex: 1 }}>
                    <div className="cast-badges">
                      <PermanentPill size="sm"/>
                      <span className="badge badge-time">
                        {new Date(lh.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                      {lh.price !== undefined && (
                        <span className="badge" style={{ color: 'var(--text-off)' }}>
                          ${(lh.price / 1_000_000).toFixed(2)}
                        </span>
                      )}
                      {lh.mediaType && (
                        <span className="badge" style={{ color: 'var(--text-off)', letterSpacing: '0.04em' }}>
                          {lh.mediaType.split('/')[0]}
                        </span>
                      )}
                    </div>
                    <div className="cast-hook">{lh.hook}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-off)', marginTop: '2px' }}>
                      anchored · walrus storage · no expiry
                    </div>
                  </div>

                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-off)" strokeWidth="1.5" strokeLinecap="round"
                    style={{ transform: streaming === lh.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>

                {/* Stream player — expands inline */}
                {streaming === lh.id && lh.blobId && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <StreamPlayer
                      blobId={lh.blobId}
                      mediaType={lh.mediaType ?? 'application/octet-stream'}
                      title={lh.hook}
                      onClose={() => setStreaming(null)}
                    />
                  </div>
                )}
              </div>
            ))}

            {permanent.length === 0 && (
              <div className="empty-state">
                <AnchorGlyph large/>
                <div>no permanent lighthouses</div>
                <div style={{ color: 'var(--text-off)', fontSize: '10px' }}>
                  created by authors · anchored forever on walrus
                </div>
              </div>
            )}

            <div style={{
              padding: '20px 14px', fontFamily: 'var(--font-mono)', fontSize: '9px',
              color: 'var(--text-off)', textAlign: 'center', lineHeight: 1.8,
              borderTop: '1px solid var(--border)',
            }}>
              permanently anchored to walrus storage<br/>
              pay once · stream forever · creator paid instantly<br/>
              no platform · no takedowns · no expiry
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Anchor glyph (permanent lighthouse icon) ─────────────────────────────────

function AnchorGlyph({ large = false }: { large?: boolean }) {
  const s = large ? 32 : 16
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke="var(--teal)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="4" r="2"/>
      <line x1="8" y1="6" x2="8" y2="13"/>
      <line x1="4" y1="9" x2="12" y2="9"/>
      <path d="M4 9 Q2 9 2 11 Q2 13 4 13"/>
      <path d="M12 9 Q14 9 14 11 Q14 13 12 13"/>
    </svg>
  )
}
