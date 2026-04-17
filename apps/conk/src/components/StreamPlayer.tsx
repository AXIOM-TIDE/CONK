/**
 * StreamPlayer — streams media from a Walrus blobId.
 * Handles video, audio, PDF, and generic file downloads.
 * Wires into LighthouseReader for permanent lighthouse content.
 *
 * Drop into apps/conk/src/components/StreamPlayer.tsx
 */

import { useState, useEffect, useRef } from 'react'
import { ADDRESSES } from '../sui/index'

interface Props {
  blobId:    string
  mediaType: string
  title:     string
  onClose?:  () => void
}

type StreamState = 'idle' | 'loading' | 'ready' | 'error'

export function StreamPlayer({ blobId, mediaType, title, onClose }: Props) {
  const [state,    setState]    = useState<StreamState>('idle')
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState('')
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const walrusUrl = `${ADDRESSES.WALRUS_AGG}/v1/${blobId}`

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      abortRef.current?.abort()
    }
  }, [blobUrl])

  async function startStream() {
    setState('loading')
    setProgress(0)
    setError('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch(walrusUrl, { signal: abortRef.current.signal })

      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

      const contentLength = res.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : null
      const reader = res.body?.getReader()

      if (!reader) throw new Error('No response stream')

      const chunks: Uint8Array[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (total) setProgress(Math.round((received / total) * 100))
      }

      // Merge chunks
      const merged = new Uint8Array(received)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }

      const blob = new Blob([merged], { type: mediaType })
      const url  = URL.createObjectURL(blob)
      setBlobUrl(url)
      setState('ready')

    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message)
      setState('error')
    }
  }

  function handleDownload() {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href     = blobUrl
    a.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() +
                 extensionFor(mediaType)
    a.click()
  }

  const isVideo  = mediaType.startsWith('video/')
  const isAudio  = mediaType.startsWith('audio/')
  const isPdf    = mediaType === 'application/pdf'

  return (
    <div style={{
      background:   'var(--surface2)',
      border:       '1px solid var(--border)',
      borderRadius: '8px',
      padding:      '16px',
      display:      'flex',
      flexDirection:'column',
      gap:          '12px',
    }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <MediaIcon mediaType={mediaType}/>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-primary)' }}>
            {title}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'var(--text-off)',
            cursor:'pointer', fontSize:'16px', padding:'0 4px', lineHeight:1
          }}>×</button>
        )}
      </div>

      {/* BlobId */}
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-off)', letterSpacing:'0.04em' }}>
        {blobId.slice(0, 20)}…{blobId.slice(-8)}
      </div>

      {/* Player area */}
      {state === 'idle' && (
        <button onClick={startStream} style={{
          background:  'rgba(0,184,230,0.1)',
          border:      '1px solid rgba(0,184,230,0.3)',
          borderRadius:'6px',
          color:       'var(--teal)',
          fontFamily:  'var(--font-mono)',
          fontSize:    '11px',
          padding:     '10px 16px',
          cursor:      'pointer',
          letterSpacing:'0.06em',
        }}>
          ▶ stream {mediaTypeLabel(mediaType)}
        </button>
      )}

      {state === 'loading' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-off)' }}>
            streaming from walrus… {progress > 0 ? `${progress}%` : ''}
          </div>
          <div style={{ height:'2px', background:'var(--surface3)', borderRadius:'1px', overflow:'hidden' }}>
            <div style={{
              height:    '100%',
              width:     progress > 0 ? `${progress}%` : '30%',
              background:'var(--teal)',
              boxShadow: '0 0 4px var(--teal)',
              borderRadius:'1px',
              transition: progress > 0 ? 'width 0.3s ease' : 'none',
              animation:  progress === 0 ? 'streamPulse 1.5s ease-in-out infinite' : 'none',
            }}/>
          </div>
          <button onClick={() => abortRef.current?.abort()} style={{
            background:'none', border:'none', color:'var(--text-off)',
            fontFamily:'var(--font-mono)', fontSize:'9px', cursor:'pointer',
            textAlign:'left', padding:0
          }}>cancel</button>
        </div>
      )}

      {state === 'ready' && blobUrl && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

          {isVideo && (
            <video
              src={blobUrl}
              controls
              style={{ width:'100%', borderRadius:'6px', background:'#000' }}
            />
          )}

          {isAudio && (
            <audio
              src={blobUrl}
              controls
              style={{ width:'100%' }}
            />
          )}

          {isPdf && (
            <iframe
              src={blobUrl}
              style={{ width:'100%', height:'400px', border:'none', borderRadius:'6px' }}
              title={title}
            />
          )}

          {!isVideo && !isAudio && !isPdf && (
            <div style={{
              fontFamily:  'var(--font-mono)',
              fontSize:    '10px',
              color:       'var(--text-off)',
              background:  'var(--surface3)',
              borderRadius:'6px',
              padding:     '10px 12px',
            }}>
              {mediaTypeLabel(mediaType)} ready · {mediaType}
            </div>
          )}

          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleDownload} style={{
              background:  'rgba(0,184,230,0.1)',
              border:      '1px solid rgba(0,184,230,0.3)',
              borderRadius:'6px',
              color:       'var(--teal)',
              fontFamily:  'var(--font-mono)',
              fontSize:    '10px',
              padding:     '6px 12px',
              cursor:      'pointer',
              letterSpacing:'0.06em',
            }}>
              ↓ download
            </button>
            <button onClick={() => { setState('idle'); setBlobUrl(null) }} style={{
              background:'none', border:'1px solid var(--border)',
              borderRadius:'6px', color:'var(--text-off)',
              fontFamily:'var(--font-mono)', fontSize:'10px',
              padding:'6px 12px', cursor:'pointer',
            }}>
              reset
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--burn)' }}>
            stream failed: {error}
          </div>
          <button onClick={startStream} style={{
            background:'none', border:'1px solid var(--border)',
            borderRadius:'6px', color:'var(--text-off)',
            fontFamily:'var(--font-mono)', fontSize:'10px',
            padding:'6px 12px', cursor:'pointer',
          }}>
            retry
          </button>
        </div>
      )}

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MediaIcon({ mediaType }: { mediaType: string }) {
  const color = 'var(--teal)'
  const size  = 14

  if (mediaType.startsWith('video/')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="3" width="10" height="10" rx="2"/>
      <path d="M11 6l4-2v8l-4-2"/>
    </svg>
  )

  if (mediaType.startsWith('audio/')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 10V6l8-2v4M3 10a2 2 0 100 4 2 2 0 000-4zM11 8a2 2 0 100 4 2 2 0 000-4z"/>
    </svg>
  )

  if (mediaType === 'application/pdf') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1z"/>
      <path d="M9 1v5h5"/>
    </svg>
  )

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="12" height="12" rx="2"/>
      <path d="M5 8h6M5 11h4"/>
    </svg>
  )
}

function mediaTypeLabel(mediaType: string): string {
  if (mediaType.startsWith('video/'))           return 'video'
  if (mediaType.startsWith('audio/'))           return 'audio'
  if (mediaType === 'application/pdf')          return 'PDF'
  if (mediaType === 'application/epub+zip')     return 'ebook'
  if (mediaType === 'application/zip')          return 'archive'
  if (mediaType === 'application/json')         return 'data'
  if (mediaType.startsWith('image/'))           return 'image'
  if (mediaType.startsWith('text/'))            return 'text'
  return 'file'
}

function extensionFor(mediaType: string): string {
  const map: Record<string, string> = {
    'video/mp4':             '.mp4',
    'video/webm':            '.webm',
    'audio/mpeg':            '.mp3',
    'audio/wav':             '.wav',
    'audio/flac':            '.flac',
    'application/pdf':       '.pdf',
    'application/epub+zip':  '.epub',
    'application/zip':       '.zip',
    'application/json':      '.json',
    'image/jpeg':            '.jpg',
    'image/png':             '.png',
    'text/plain':            '.txt',
  }
  return map[mediaType] ?? ''
}
