/**
 * MediaUpload — drag & drop or click to upload files to Walrus
 * Used in CastPanel (images/media) and BountyPanel (proof files)
 */
import { useState, useRef } from 'react'
import { uploadToWalrus, formatFileSize, type WalrusUploadResult } from '../sui/walrus'

interface MediaUploadProps {
  onUpload: (result: WalrusUploadResult) => void
  onRemove: () => void
  uploaded?: WalrusUploadResult | null
  accept?: string
  label?: string
  maxMB?: number
}

export function MediaUpload({
  onUpload, onRemove, uploaded, accept = 'image/*,application/pdf,.txt,.md',
  label = 'Attach file', maxMB = 100
}: MediaUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError('')
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File too large. Max ${maxMB}MB.`)
      return
    }
    setUploading(true)
    try {
      const result = await uploadToWalrus(file)
      onUpload(result)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (uploaded) {
    const isImage = uploaded.url.match(/\.(jpg|jpeg|png|gif|webp)/i) || uploaded.blobId
    return (
      <div style={{border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',overflow:'hidden',marginBottom:'2px'}}>
        {isImage && (
          <img
            src={uploaded.url}
            alt="attachment"
            style={{width:'100%',maxHeight:'200px',objectFit:'cover',display:'block'}}
            onError={e => (e.currentTarget.style.display='none')}
          />
        )}
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',background:'var(--surface)'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            ✓ {uploaded.blobId.slice(0,16)}… · {formatFileSize(uploaded.size)}
          </span>
          <button onClick={onRemove}
            style={{background:'none',border:'none',color:'var(--text-off)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:'9px',padding:'0',flexShrink:0}}>
            remove ×
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border:`1px dashed ${dragging?'var(--teal)':'var(--border)'}`,
          borderRadius:'var(--radius-lg)',
          padding:'14px',
          textAlign:'center',
          cursor:'pointer',
          background:dragging?'rgba(0,184,230,0.04)':'transparent',
          transition:'all 0.15s',
        }}
      >
        <input ref={inputRef} type="file" accept={accept} style={{display:'none'}}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>
        {uploading ? (
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)'}}>
            <span className="spinner" style={{marginRight:'6px'}}/>uploading to Walrus…
          </div>
        ) : (
          <>
            <div style={{fontSize:'20px',marginBottom:'4px',opacity:0.4}}>⊕</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)'}}>{label}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginTop:'2px'}}>
              drag & drop or click · max {maxMB}MB · stored on Walrus
            </div>
          </>
        )}
      </div>
      {error && (
        <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--burn)',marginTop:'4px'}}>{error}</div>
      )}
    </div>
  )
}
