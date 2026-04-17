/**
 * LighthouseReader — updated with SEAL decryption + StreamPlayer
 *
 * Replaces apps/conk/src/components/LighthouseReader.tsx
 *
 * Changes:
 *   1. After payment, checks for SEAL metadata in cast body
 *   2. If SEAL encrypted — requests decryption key, decrypts, renders media
 *   3. If permanent lighthouse with blobId — opens StreamPlayer
 *   4. If text cast — renders body as before
 */

import { useState, useEffect } from 'react'
import { useStore }            from '../store/store'
import { use402 }              from '../hooks/use402'
import { IconLighthouse, IconBack } from './Icons'
import { StreamPlayer }        from './StreamPlayer'
import { parseSealMetadata, decryptCast } from '../sui/seal'
import { getSession }          from '../sui/zklogin'

function fmtClock(ms: number) {
  if (ms <= 0) return 'expired'
  const y = Math.floor(ms / (365.25*24*60*60*1000))
  const d = Math.floor((ms % (365.25*24*60*60*1000)) / (24*60*60*1000))
  if (y > 0) return `${y}y ${d}d`
  return `${Math.floor(ms/(60*60*1000))}h`
}

export function LighthouseReader({ id, onClose }: { id: string; onClose: () => void }) {
  const lighthouses     = useStore((s) => s.lighthouses)
  const visitLighthouse = useStore((s) => s.visitLighthouse)
  const addChartEntry   = useStore((s) => s.addChartEntry)
  const debitVessel     = useStore((s) => s.debitVessel)
  const debitHarbor     = useStore((s) => s.debitHarbor)
  const vessel          = useStore((s) => s.vessel)
  const { pay, status, receipt } = use402({ amount: 1000 })

  const lh = lighthouses.find(l => l.id === id)

  const [visited,       setVisited]       = useState(false)
  const [confirm,       setConfirm]       = useState(false)
  const [clockMs,       setClockMs]       = useState(lh ? lh.expiresAt - Date.now() : 0)
  const [decrypting,    setDecrypting]    = useState(false)
  const [decryptError,  setDecryptError]  = useState('')
  const [decryptedUrl,  setDecryptedUrl]  = useState<string | null>(null)
  const [decryptedType, setDecryptedType] = useState<string>('application/octet-stream')

  useEffect(() => {
    const iv = setInterval(() => { if (lh) setClockMs(lh.expiresAt - Date.now()) }, 1000)
    return () => clearInterval(iv)
  }, [lh])

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => { if (decryptedUrl) URL.revokeObjectURL(decryptedUrl) }
  }, [decryptedUrl])

  if (!lh) return (
    <div className="lh-fullscreen">
      <div className="lh-reading">
        <button className="lh-back-btn" onClick={onClose}>
          <IconBack size={13} color="var(--teal)"/> back
        </button>
        <div style={{textAlign:'center',color:'var(--text-off)',fontFamily:'var(--font-mono)',fontSize:'12px',padding:'60px 0'}}>
          Lighthouse not found
        </div>
      </div>
    </div>
  )

  const canRead   = lh.isGenesis || visited
  const isPending = status === 'pending'

  // Check if this lighthouse has SEAL encrypted content
  const sealMeta    = lh.body ? parseSealMetadata(lh.body) : null
  const isSealed    = !!sealMeta
  const isPermanent = (lh as any).lighthouseType === 'permanent'
  const blobId      = (lh as any).blobId
  const mediaType   = (lh as any).mediaType ?? 'application/octet-stream'

  const doVisit = async () => {
    if (lh.isGenesis) {
      visitLighthouse(lh.id)
      addChartEntry({ type:'lighthouse', id:lh.id, name:lh.hook, visitedAt:Date.now() })
      setVisited(true)
      setConfirm(false)
      return
    }

    const payReceipt = await pay()
    if (!payReceipt) return

    if (vessel && vessel.fuel >= 0.1) debitVessel(0.1)
    else debitHarbor(0.1)

    visitLighthouse(lh.id)
    addChartEntry({ type:'lighthouse', id:lh.id, name:lh.hook, visitedAt:Date.now() })
    setVisited(true)
    setConfirm(false)

    // If SEAL encrypted — decrypt after payment
    if (sealMeta && payReceipt.txDigest) {
      setDecrypting(true)
      setDecryptError('')
      try {
        const session = getSession()
        if (!session) throw new Error('No session')

        const decryptedBytes = await decryptCast(sealMeta, {
          txDigest: payReceipt.txDigest,
          address:  session.address,
          proof:    session.proof,
          maxEpoch: session.maxEpoch,
        })

        const blob = new Blob([decryptedBytes], { type: mediaType })
        setDecryptedUrl(URL.createObjectURL(blob))
        setDecryptedType(mediaType)
      } catch (err: unknown) {
        setDecryptError((err as Error).message ?? 'Decryption failed')
      } finally {
        setDecrypting(false)
      }
    }
  }

  return (
    <div className="lh-fullscreen">
      <div className="lh-reading">
        <button className="lh-back-btn" onClick={onClose}>
          <IconBack size={13} color="var(--teal)"/> back
        </button>

        {lh.isGenesis && (
          <div style={{textAlign:'center',marginBottom:'20px'}}>
            <span className="lh-genesis-badge">✦ genesis · free · permanent · unkillable</span>
          </div>
        )}

        <div className="lh-beacon-wrap">
          <div className="lh-beacon-glow">
            <IconLighthouse size={44} color="var(--teal)"/>
          </div>
        </div>

        <div className="lh-reading-title">{lh.hook}</div>

        <div className="lh-reading-stats">
          <div className="lh-stat">
            <span className="lh-stat-label">Reads</span>
            <span className="lh-stat-val">{(lh.tideCount + (visited?1:0)).toLocaleString()}</span>
          </div>
          <div className="lh-stat">
            <span className="lh-stat-label">Clock</span>
            <span className="lh-stat-val">{fmtClock(clockMs)}</span>
          </div>
          <div className="lh-stat">
            <span className="lh-stat-label">Since</span>
            <span className="lh-stat-val">{new Date(lh.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
          {isSealed && (
            <div className="lh-stat">
              <span className="lh-stat-label">Content</span>
              <span className="lh-stat-val" style={{color:'var(--sealed)'}}>encrypted</span>
            </div>
          )}
        </div>

        {/* Content area */}
        {canRead ? (
          <div className="lh-reading-body">

            {/* Decrypting indicator */}
            {decrypting && (
              <div style={{textAlign:'center',padding:'20px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)'}}>
                <span className="spinner" style={{borderTopColor:'var(--teal)',borderColor:'rgba(0,184,230,0.2)',marginRight:'8px'}}/>
                decrypting via seal…
              </div>
            )}

            {/* Decrypt error */}
            {decryptError && (
              <div style={{padding:'10px 12px',background:'rgba(255,45,85,0.04)',border:'1px solid rgba(255,45,85,0.08)',borderRadius:'var(--radius)',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--burn)',marginBottom:'12px'}}>
                {decryptError}
              </div>
            )}

            {/* Decrypted media player */}
            {decryptedUrl && !decrypting && (
              <div style={{marginBottom:'16px'}}>
                {decryptedType.startsWith('video/') && (
                  <video src={decryptedUrl} controls style={{width:'100%',borderRadius:'8px'}}/>
                )}
                {decryptedType.startsWith('audio/') && (
                  <audio src={decryptedUrl} controls style={{width:'100%'}}/>
                )}
                {decryptedType === 'application/pdf' && (
                  <iframe src={decryptedUrl} style={{width:'100%',height:'500px',border:'none',borderRadius:'8px'}} title={lh.hook}/>
                )}
                {!decryptedType.startsWith('video/') && !decryptedType.startsWith('audio/') && decryptedType !== 'application/pdf' && (
                  <a href={decryptedUrl} download={lh.hook} style={{display:'inline-flex',alignItems:'center',gap:'6px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',textDecoration:'none',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'var(--radius)',padding:'8px 12px'}}>
                    ↓ download decrypted file
                  </a>
                )}
              </div>
            )}

            {/* Permanent lighthouse with unencrypted blob */}
            {isPermanent && blobId && !isSealed && !decrypting && (
              <div style={{marginBottom:'16px'}}>
                <StreamPlayer blobId={blobId} mediaType={mediaType} title={lh.hook}/>
              </div>
            )}

            {/* Text body — shown for text casts and after media */}
            {!isSealed && !isPermanent && lh.body.split('\n').map((line: string, i: number) =>
              line === '---' ? <hr key={i}/> :
              line === ''    ? <br key={i}/> :
              <p key={i}>{line}</p>
            )}

          </div>
        ) : confirm ? (
          <div style={{textAlign:'center',padding:'32px 0'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'20px',maxWidth:'280px',margin:'0 auto 20px'}}>
              {isSealed
                ? 'This lighthouse contains encrypted content. Payment unlocks decryption via SEAL.'
                : 'Reading this Lighthouse resets its 100-year clock. Your visit is permanent and recorded in the tide.'}
            </div>
            {isSealed && (
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--sealed)',marginBottom:'12px',padding:'6px 10px',background:'rgba(94,79,232,0.06)',border:'1px solid rgba(94,79,232,0.15)',borderRadius:'var(--radius)',display:'inline-block'}}>
                🔒 SEAL encrypted · only you can decrypt after payment
              </div>
            )}
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'16px',letterSpacing:'0.04em'}}>
              $0.001 · vessel → relay · Harbor never sees this
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
              <button className="btn btn-primary" style={{minWidth:'160px',height:'42px'}} onClick={doVisit} disabled={isPending}>
                {isPending ? <><span className="spinner"/>Visiting…</> : 'Visit · $0.001'}
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>cancel</button>
            </div>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{opacity:0.15,marginBottom:'20px',display:'flex',justifyContent:'center'}}>
              <IconLighthouse size={56} color="var(--teal)"/>
            </div>
            {isSealed && (
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--sealed)',marginBottom:'16px',padding:'6px 10px',background:'rgba(94,79,232,0.06)',border:'1px solid rgba(94,79,232,0.15)',borderRadius:'var(--radius)',display:'inline-block'}}>
                🔒 SEAL encrypted · payment required to decrypt
              </div>
            )}
            <p style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text-dim)',lineHeight:1.7,maxWidth:'280px',margin:'0 auto 20px'}}>
              {lh.isGenesis
                ? 'The Genesis Lighthouse is free to read. It will exist for 100 years.'
                : isSealed
                  ? 'This content is SEAL encrypted. Pay to receive your decryption key.'
                  : 'Visiting this Lighthouse costs $0.001. Your visit resets its 100-year clock.'}
            </p>
            {!vessel ? (
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--burn)'}}>You need a vessel to visit.</div>
            ) : (
              <button className="btn btn-primary" style={{minWidth:'220px',height:'42px'}} onClick={() => lh.isGenesis ? doVisit() : setConfirm(true)}>
                {lh.isGenesis ? 'Read the Genesis · free' : isSealed ? 'Unlock · $0.001' : 'Visit Lighthouse · $0.001'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
