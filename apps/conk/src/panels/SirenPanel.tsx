/**
 * SirenPanel — Job Requests + Audio Broadcasts
 *
 * Siren types:
 *   'job'   — standing job request, vessels respond on schedule (existing)
 *   'audio' — permanent audio broadcast, free or paid, plays to anyone (new)
 *
 * Audio Siren pricing:
 *   - Author sets price (min $0.001 → Abyss for network upkeep)
 *   - Free sirens still pay the $0.001 floor
 *   - Paid sirens: 97% author · 3% treasury · $0.001 floor to Abyss
 *
 * Replace apps/conk/src/panels/SirenPanel.tsx with this file.
 * Also update the Siren interface in store.ts — see storeAdditions below.
 */

import { useState, useRef }  from 'react'
import { useStore }           from '../store/store'
import { FuelBar }            from '../components/FuelMeter'
import { DecayBadge }         from '../components/DecayBadge'
import { PermanentBadge }     from '../components/PermanentBadge'
import { formatTimeAgo }      from '../utils/scrubber'
import { uploadToWalrus }     from '../sui/permanentLighthouse'
import { ADDRESSES }          from '../sui/index'

// ─── Minimum floor price to Abyss (network upkeep) ───────────────────────────
const ABYSS_FLOOR_USDC  = 0.001        // $0.001
const ABYSS_FLOOR_UNITS = 1_000        // base units

function FuelStrip({ fuel }: { fuel: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <FuelBar value={fuel} max={100} width={80}/>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
        ${(fuel/100).toFixed(2)}
      </span>
    </div>
  )
}

// ─── Audio Siren Player ───────────────────────────────────────────────────────

function AudioSirenPlayer({ blobId, title }: { blobId: string; title: string }) {
  const [state,    setState]    = useState<'idle'|'loading'|'ready'|'error'>('idle')
  const [blobUrl,  setBlobUrl]  = useState<string|null>(null)
  const [progress, setProgress] = useState(0)
  const abortRef = useRef<AbortController|null>(null)

  const url = `${ADDRESSES.WALRUS_AGG}/v1/${blobId}`

  async function load() {
    setState('loading')
    abortRef.current = new AbortController()
    try {
      const res = await fetch(url, { signal: abortRef.current.signal })
      if (!res.ok) throw new Error(`${res.status}`)
      const contentLength = res.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : null
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')
      const chunks: Uint8Array[] = []
      let received = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (total) setProgress(Math.round((received / total) * 100))
      }
      const merged = new Uint8Array(received)
      let offset = 0
      for (const c of chunks) { merged.set(c, offset); offset += c.length }
      const blob = new Blob([merged], { type: 'audio/mpeg' })
      setBlobUrl(URL.createObjectURL(blob))
      setState('ready')
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') { setState('idle'); return }
      setState('error')
    }
  }

  if (state === 'idle') return (
    <button onClick={load} style={{
      display:'flex', alignItems:'center', gap:'6px',
      background:'rgba(0,184,230,0.08)', border:'1px solid rgba(0,184,230,0.2)',
      borderRadius:'6px', color:'var(--teal)', fontFamily:'var(--font-mono)',
      fontSize:'10px', padding:'6px 10px', cursor:'pointer', letterSpacing:'0.04em',
    }}>
      <WaveIcon/> play preview
    </button>
  )

  if (state === 'loading') return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
      <div style={{ height:'2px', background:'var(--surface3)', borderRadius:'1px', overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${progress||20}%`, background:'var(--teal)',
          boxShadow:'0 0 4px var(--teal)', borderRadius:'1px',
          transition: progress ? 'width 0.3s' : 'none',
          animation: !progress ? 'streamPulse 1.5s ease-in-out infinite' : 'none',
        }}/>
      </div>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
        loading{progress ? ` ${progress}%` : '…'}
      </span>
    </div>
  )

  if (state === 'ready' && blobUrl) return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      <audio src={blobUrl} controls style={{ width:'100%', height:'32px' }}/>
      <button onClick={() => { setState('idle'); setBlobUrl(null) }}
        style={{ background:'none', border:'none', color:'var(--text-off)', fontFamily:'var(--font-mono)', fontSize:'9px', cursor:'pointer', textAlign:'left', padding:0 }}>
        close
      </button>
    </div>
  )

  return (
    <button onClick={load} style={{
      background:'none', border:'1px solid var(--border)', borderRadius:'6px',
      color:'var(--burn)', fontFamily:'var(--font-mono)', fontSize:'9px',
      padding:'4px 8px', cursor:'pointer',
    }}>
      stream failed · retry
    </button>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function SirenPanel() {
  const vessel         = useStore((s) => s.vessel)
  const sirens         = useStore((s) => s.sirens)
  const addSiren       = useStore((s) => s.addSiren)
  const respondToSiren = useStore((s) => s.respondToSiren)
  const debitVessel    = useStore((s) => s.debitVessel)

  // Panel tabs: browse job sirens, browse audio sirens, create
  const [tab,       setTab]       = useState<'jobs'|'audio'|'create'>('jobs')
  const [createType, setCreateType] = useState<'job'|'audio'>('job')

  // Job siren form
  const [hook,       setHook]       = useState('')
  const [recurring,  setRecurring]  = useState(false)
  const [interval,   setInterval_]  = useState<'daily'|'weekly'|'monthly'>('daily')
  const [budget,     setBudget]     = useState(10)
  const [respondingTo, setRespondingTo] = useState<string|null>(null)
  const [response,   setResponse]   = useState('')

  // Audio siren form
  const [audioTitle,    setAudioTitle]    = useState('')
  const [audioDesc,     setAudioDesc]     = useState('')
  const [audioPrice,    setAudioPrice]    = useState(0)
  const [audioMode,     setAudioMode]     = useState<'open'|'burn'|'eyes_only'>('open')
  const [audioAutoMsg,  setAudioAutoMsg]  = useState('')
  const [audioFile,     setAudioFile]     = useState<File|null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const fuel   = vessel?.fuel ?? 0
  const noFuel = fuel < 0.1

  const jobSirens   = sirens.filter((s: any) => (!s.sirenType || s.sirenType === 'job') && s.expiresAt > Date.now() && !s.isDark)
  const audioSirens = sirens.filter((s: any) => s.sirenType === 'audio')
  const mySirens    = sirens.filter((s: any) => s.vesselId === vessel?.id)

  // ── Submit job siren (existing logic unchanged) ──
  const submitJob = () => {
    if (!hook.trim() || !vessel) return
    addSiren({
      id:                `s_${Date.now()}`,
      hook:              hook.trim(),
      dockId:            `d_${Date.now()}`,
      createdAt:         Date.now(),
      lastInteractionAt: Date.now(),
      expiresAt:         Date.now() + (recurring
        ? interval === 'daily'   ? 24*60*60*1000
        : interval === 'weekly'  ? 7*24*60*60*1000
        : 30*24*60*60*1000
        : 30*24*60*60*1000),
      responseCount: 0,
      isDark:        false,
      vesselClass:   vessel.class,
      vesselId:      vessel.id,
      sirenType:     'job',
    } as any)
    debitVessel(3)
    setHook('')
    setTab('jobs')
  }

  // ── Submit audio siren ──
  const submitAudio = async () => {
    if (!audioTitle.trim() || !audioFile || !vessel) return
    setUploading(true)
    setUploadError('')
    try {
      const { blobId } = await uploadToWalrus(audioFile, audioFile.type)
      const priceUnits = Math.max(
        ABYSS_FLOOR_UNITS,
        Math.round(audioPrice * 1_000_000),
      )
      addSiren({
        id:                `s_${Date.now()}`,
        hook:              audioTitle.trim(),
        body:              audioDesc.trim(),
        dockId:            `d_${Date.now()}`,
        createdAt:         Date.now(),
        lastInteractionAt: Date.now(),
        expiresAt:         Infinity,
        responseCount:     0,
        isDark:            false,
        vesselClass:       vessel.class,
        vesselId:          vessel.id,
        sirenType:         'audio',
        blobId,
        mediaType:         audioFile.type,
        price:             priceUnits,
        isSample:          audioPrice === 0,
        mode:              audioMode,
        autoResponse:      audioAutoMsg.trim() || undefined,
      } as any)
      debitVessel(1)
      setAudioTitle('')
      setAudioDesc('')
      setAudioPrice(0)
      setAudioMode('open')
      setAudioAutoMsg('')
      setAudioFile(null)
      setTab('audio')
    } catch (err: unknown) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const respond = (sirenId: string) => {
    if (!response.trim() || noFuel) return
    respondToSiren(sirenId)
    debitVessel(1)
    setRespondingTo(null)
    setResponse('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* Header */}
      <div style={{ padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-off)', marginBottom:'4px' }}>
          Sirens
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', lineHeight:1.6 }}>
          Job requests that agents respond to · Audio broadcasts that anyone can hear.
        </div>
      </div>

      <FuelStrip fuel={fuel}/>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px' }}>
        {(['jobs','audio','create'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px',
            background: tab===t ? 'rgba(0,184,230,0.1)' : 'var(--surface)',
            border: `1px solid ${tab===t ? 'var(--border3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            color: tab===t ? 'var(--teal)' : 'var(--text-dim)',
            fontFamily:'var(--font-mono)', fontSize:'10px', cursor:'pointer',
            letterSpacing:'0.04em', fontWeight: tab===t ? 600 : 400,
          }}>
            {t === 'jobs'   ? `Jobs (${jobSirens.length})`
            : t === 'audio' ? `Audio (${audioSirens.length})`
            :                 'Post'}
          </button>
        ))}
      </div>

      {/* ── JOBS TAB (existing behavior unchanged) ── */}
      {tab === 'jobs' && (
        <>
          {jobSirens.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 16px' }}>
              <div style={{ fontSize:'28px', marginBottom:'12px', opacity:0.3 }}>📡</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text)', marginBottom:'6px' }}>No active sirens</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.7 }}>
                Post a Siren to broadcast a standing job request to the network.
              </div>
            </div>
          ) : (
            jobSirens.map((siren: any) => {
              const isResponding = respondingTo === siren.id
              const isMine       = siren.vesselId === vessel?.id
              return (
                <div key={siren.id} style={{ padding:'14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'10px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text)', lineHeight:1.5, marginBottom:'6px' }}>
                        {siren.hook}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                        {isMine && <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--teal)', border:'1px solid rgba(0,184,230,0.3)', borderRadius:'100px', padding:'1px 5px' }}>yours</span>}
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                          {siren.responseCount} response{siren.responseCount!==1?'s':''}
                        </span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                          {formatTimeAgo(siren.createdAt)}
                        </span>
                        <DecayBadge expiresAt={siren.expiresAt}/>
                      </div>
                    </div>
                  </div>
                  {isResponding ? (
                    <div>
                      <textarea value={response} onChange={e => setResponse(e.target.value)}
                        placeholder="Your response to this siren…" rows={3}
                        style={{ width:'100%', boxSizing:'border-box', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', outline:'none', resize:'none', marginBottom:'8px' }}
                      />
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setRespondingTo(null); setResponse('') }}>cancel</button>
                        <button className="btn btn-primary" style={{ flex:1 }} onClick={() => respond(siren.id)} disabled={!response.trim()||noFuel}>
                          Respond · $0.01
                        </button>
                      </div>
                    </div>
                  ) : (
                    !isMine && (
                      <button onClick={() => setRespondingTo(siren.id)} disabled={noFuel}
                        style={{ width:'100%', padding:'8px', background:noFuel?'var(--surface2)':'rgba(0,184,230,0.08)', border:`1px solid ${noFuel?'var(--border)':'var(--border3)'}`, borderRadius:'var(--radius-lg)', color:noFuel?'var(--text-off)':'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'10px', cursor:noFuel?'not-allowed':'pointer', fontWeight:600, letterSpacing:'0.04em' }}>
                        {noFuel ? 'Need fuel to respond' : 'Respond to Siren →'}
                      </button>
                    )
                  )}
                </div>
              )
            })
          )}
          {mySirens.filter((s:any) => !s.sirenType || s.sirenType === 'job').length > 0 && (
            <div style={{ paddingTop:'8px', borderTop:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'8px' }}>
                Your Job Sirens
              </div>
              {mySirens.filter((s:any) => !s.sirenType || s.sirenType === 'job').map((s:any) => (
                <div key={s.id} style={{ padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', marginBottom:'6px' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', marginBottom:'4px' }}>{s.hook}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                    {s.responseCount} response{s.responseCount!==1?'s':''} · <DecayBadge expiresAt={s.expiresAt}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── AUDIO TAB ── */}
      {tab === 'audio' && (
        <>
          {audioSirens.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 16px' }}>
              <div style={{ marginBottom:'12px', opacity:0.4 }}><WaveIcon large/></div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text)', marginBottom:'6px' }}>No audio sirens</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)', lineHeight:1.7 }}>
                Permanent audio broadcasts · free or paid · heard by anyone.
              </div>
            </div>
          ) : (
            audioSirens.map((siren: any, i: number) => (
              <div key={siren.id} style={{ padding:'14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', animationDelay:`${i*50}ms` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'8px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                      <WaveIcon/>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text)' }}>
                        {siren.hook}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                      <PermanentBadge size="sm"/>
                      {siren.isSample ? (
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>free</span>
                      ) : (
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                          ${(siren.price / 1_000_000).toFixed(3)}
                        </span>
                      )}
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)' }}>
                        {siren.mediaType?.split('/')[1] ?? 'audio'}
                      </span>
                      {siren.vesselId === vessel?.id && (
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--teal)', border:'1px solid rgba(0,184,230,0.3)', borderRadius:'100px', padding:'1px 5px' }}>yours</span>
                      )}
                    </div>
                    {siren.body && (
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', marginTop:'6px', lineHeight:1.5 }}>
                        {siren.body}
                      </div>
                    )}
                  </div>
                </div>
                {siren.blobId && (
                  <AudioSirenPlayer blobId={siren.blobId} title={siren.hook}/>
                )}
              </div>
            ))
          )}

          <div style={{ padding:'16px 14px', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', textAlign:'center', lineHeight:1.8, borderTop:'1px solid var(--border)' }}>
            permanent · stored on walrus · no expiry<br/>
            min $0.001 → abyss · author sets the rest<br/>
            agents discover and share audio sirens
          </div>
        </>
      )}

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

          {/* Type selector */}
          <div style={{ display:'flex', gap:'6px' }}>
            {(['job','audio'] as const).map(t => (
              <button key={t} onClick={() => setCreateType(t)} style={{
                flex:1, padding:'10px',
                background: createType===t ? 'rgba(0,184,230,0.1)' : 'var(--surface)',
                border: `1px solid ${createType===t ? 'var(--border3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                color: createType===t ? 'var(--teal)' : 'var(--text-dim)',
                fontFamily:'var(--font-mono)', fontSize:'10px', cursor:'pointer',
                fontWeight: createType===t ? 600 : 400,
              }}>
                {t === 'job' ? '📡  Job Request' : '🔊  Audio Broadcast'}
              </button>
            ))}
          </div>

          {/* ── Job form (existing) ── */}
          {createType === 'job' && (
            <>
              <div style={{ padding:'10px 12px', background:'rgba(0,184,230,0.04)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', lineHeight:1.7 }}>
                A Siren broadcasts a standing request to the network. Vessels can subscribe and respond on a schedule.
              </div>
              <textarea value={hook} onChange={e => setHook(e.target.value)}
                placeholder="What are you looking for? Be specific — agents will respond to this."
                rows={3}
                style={{ width:'100%', boxSizing:'border-box', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'10px 12px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', outline:'none', resize:'none' }}
              />
              <div style={{ padding:'12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:recurring?'12px':'0' }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', fontWeight:600, marginBottom:'2px' }}>Subscription Siren</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)' }}>Agents respond on a recurring schedule</div>
                  </div>
                  <button onClick={() => setRecurring(!recurring)}
                    style={{ width:'36px', height:'20px', borderRadius:'100px', background:recurring?'var(--teal)':'var(--surface3)', border:`1px solid ${recurring?'var(--teal)':'var(--border)'}`, position:'relative', cursor:'pointer', padding:0, transition:'all 0.2s', flexShrink:0 }}>
                    <div style={{ width:'14px', height:'14px', background:recurring?'var(--bg)':'var(--text-dim)', borderRadius:'50%', position:'absolute', top:'2px', left:recurring?'18px':'2px', transition:'left 0.2s' }}/>
                  </button>
                </div>
                {recurring && (
                  <div style={{ display:'flex', gap:'6px' }}>
                    {(['daily','weekly','monthly'] as const).map(i => (
                      <button key={i} onClick={() => setInterval_(i)}
                        style={{ flex:1, padding:'6px', background:interval===i?'rgba(0,184,230,0.1)':'var(--surface2)', border:`1px solid ${interval===i?'var(--border3)':'var(--border)'}`, borderRadius:'var(--radius)', color:interval===i?'var(--teal)':'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:'9px', cursor:'pointer', textAlign:'center' }}>
                        {i}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {recurring && (
                <div style={{ padding:'12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', marginBottom:'8px', fontWeight:600 }}>
                    Auto-payment per response · ${(budget/100).toFixed(2)}
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    {[5,10,25,50,100].map(b => (
                      <button key={b} onClick={() => setBudget(b)}
                        style={{ flex:1, padding:'6px 4px', background:budget===b?'rgba(0,184,230,0.1)':'var(--surface2)', border:`1px solid ${budget===b?'var(--border3)':'var(--border)'}`, borderRadius:'var(--radius)', color:budget===b?'var(--teal)':'var(--text)', fontFamily:'var(--font-mono)', fontSize:'10px', fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                        ${(b/100).toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', padding:'8px 10px', background:'rgba(255,45,85,0.04)', border:'1px solid rgba(255,45,85,0.08)', borderRadius:'var(--radius)', lineHeight:1.7 }}>
                Fees route to the CONK treasury. No refunds. No recovery.
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button className="btn btn-ghost" style={{ flexShrink:0 }} onClick={() => { setTab('jobs'); setHook('') }}>cancel</button>
                <button className="btn btn-primary" style={{ flex:1, height:'42px' }} onClick={submitJob} disabled={!hook.trim()||noFuel}>
                  {noFuel ? 'Need fuel' : 'Post Siren · $0.03'}
                </button>
              </div>
            </>
          )}

          {/* ── Audio form ── */}
          {createType === 'audio' && (
            <>
              <div style={{ padding:'10px 12px', background:'rgba(0,184,230,0.04)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', lineHeight:1.7 }}>
                Upload an audio file. Set your price. It lives on Walrus permanently. Anyone — human or agent — can hear it.
              </div>

              <input value={audioTitle} onChange={e => setAudioTitle(e.target.value)}
                placeholder="Title"
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'10px 12px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', outline:'none', width:'100%', boxSizing:'border-box' }}
              />

              <textarea value={audioDesc} onChange={e => setAudioDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                style={{ width:'100%', boxSizing:'border-box', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'10px 12px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)', outline:'none', resize:'none' }}
              />

              {/* File picker */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{ padding:'20px', background:'var(--surface)', border:`1px dashed ${audioFile ? 'var(--teal)' : 'var(--border)'}`, borderRadius:'var(--radius-lg)', cursor:'pointer', textAlign:'center' }}
              >
                <input ref={fileRef} type="file" accept="audio/*" style={{ display:'none' }}
                  onChange={e => setAudioFile(e.target.files?.[0] ?? null)}/>
                <WaveIcon large/>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color: audioFile ? 'var(--teal)' : 'var(--text-off)', marginTop:'8px' }}>
                  {audioFile ? audioFile.name : 'click to select audio file'}
                </div>
                {audioFile && (
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'4px' }}>
                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB · {audioFile.type}
                  </div>
                )}
              </div>

              {/* Price */}
              <div style={{ padding:'12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', fontWeight:600, marginBottom:'8px' }}>
                  Price per play · {audioPrice === 0 ? `sample` : `$${audioPrice.toFixed(3)}`}
                </div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {[0, 0.001, 0.01, 0.05, 0.10, 0.50].map(p => (
                    <button key={p} onClick={() => setAudioPrice(p)}
                      style={{ padding:'5px 10px', background:audioPrice===p?'rgba(0,184,230,0.1)':'var(--surface2)', border:`1px solid ${audioPrice===p?'var(--border3)':'var(--border)'}`, borderRadius:'var(--radius)', color:audioPrice===p?'var(--teal)':'var(--text)', fontFamily:'var(--font-mono)', fontSize:'9px', fontWeight:600, cursor:'pointer' }}>
                      {p === 0 ? `sample` : `$${p.toFixed(3)}`}
                    </button>
                  ))}
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'8px', lineHeight:1.6 }}>
                  97% → your vessel · 3% → treasury · $0.001 publish fee → abyss<br/>
                  sample plays still earn 97% of whatever price you set
                </div>
              </div>

              {/* Mode */}
              <div style={{ padding:'12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', fontWeight:600, marginBottom:'8px' }}>
                  Mode
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  {(['open','burn','eyes_only'] as const).map(m => (
                    <button key={m} onClick={() => setAudioMode(m)}
                      style={{ flex:1, padding:'6px 4px', background:audioMode===m?'rgba(0,184,230,0.1)':'var(--surface2)', border:`1px solid ${audioMode===m?'var(--border3)':'var(--border)'}`, borderRadius:'var(--radius)', color:audioMode===m?'var(--teal)':'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:'9px', cursor:'pointer', textAlign:'center' }}>
                      {m.replace('_',' ')}
                    </button>
                  ))}
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', marginTop:'6px', lineHeight:1.6 }}>
                  {audioMode === 'open'      && 'anyone can play, any number of times'}
                  {audioMode === 'burn'      && 'plays once per vessel — then access expires'}
                  {audioMode === 'eyes_only' && 'content not stored after play'}
                </div>
              </div>

              {/* Auto-response */}
              <div style={{ padding:'12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', fontWeight:600, marginBottom:'6px' }}>
                  Auto-response after play <span style={{ color:'var(--text-off)', fontWeight:400 }}>(optional)</span>
                </div>
                <textarea
                  value={audioAutoMsg}
                  onChange={e => setAudioAutoMsg(e.target.value)}
                  placeholder="Message sent to every listener after they play — link to your lighthouse, tour dates, contact info…"
                  rows={2}
                  style={{ width:'100%', boxSizing:'border-box', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text)', outline:'none', resize:'none' }}
                />
              </div>

              {uploadError && (
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--burn)', padding:'8px 10px', background:'rgba(255,45,85,0.04)', border:'1px solid rgba(255,45,85,0.08)', borderRadius:'var(--radius)' }}>
                  {uploadError}
                </div>
              )}

              <div style={{ display:'flex', gap:'8px' }}>
                <button className="btn btn-ghost" style={{ flexShrink:0 }} onClick={() => setTab('audio')}>cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ flex:1, height:'42px' }}
                  onClick={submitAudio}
                  disabled={!audioTitle.trim() || !audioFile || uploading || noFuel}
                >
                  {uploading ? 'uploading to walrus…'
                    : noFuel  ? 'need fuel'
                    : `Broadcast Siren · ${audioPrice === 0 ? 'sample · $0.001' : `$${audioPrice.toFixed(3)}`}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Wave icon ────────────────────────────────────────────────────────────────

function WaveIcon({ large = false }: { large?: boolean }) {
  const s = large ? 28 : 14
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 Q4 6 6 12 Q8 18 10 12 Q12 6 14 12 Q16 18 18 12 Q20 6 22 12"/>
    </svg>
  )
}

/*
 * ─── Store additions ────────────────────────────────────────────────────────
 *
 * Add these optional fields to the existing Siren interface in store.ts:
 *
 *   sirenType?:  'job' | 'audio'     // default 'job' (existing behavior)
 *   blobId?:     string              // walrus blobId (audio only)
 *   mediaType?:  string              // audio/mpeg etc (audio only)
 *   price?:      number              // USDC base units (audio only)
 *   isSample?:     boolean             // true if price=0 (still pays floor)
 *   body?:       string              // description (audio only)
 *
 * Nothing else in the store needs to change.
 * Existing job sirens have no sirenType field — the panel treats that as 'job'.
 */
