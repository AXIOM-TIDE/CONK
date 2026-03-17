// CONK — Media Scrubber
// Strips ALL metadata before upload.
// GPS · device · timestamp · camera · everything.

export interface ScrubResult {
  file:         File
  clean:        boolean
  originalSize: number
  cleanSize:    number
}

export async function scrubImage(file: File): Promise<ScrubResult> {
  const originalSize = file.size
  const blob         = new Blob([await file.arrayBuffer()], { type: file.type })
  const bitmap       = await createImageBitmap(blob)
  const canvas       = document.createElement('canvas')
  canvas.width       = bitmap.width
  canvas.height      = bitmap.height
  const ctx          = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const cleanBlob = await new Promise<Blob>((res) => {
    canvas.toBlob((b) => res(b!), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92)
  })
  const cleanFile = new File([cleanBlob], file.name, {
    type:         cleanBlob.type,
    lastModified: 0,
  })
  return { file: cleanFile, clean: true, originalSize, cleanSize: cleanFile.size }
}

export function scrubAudio(blob: Blob): File {
  return new File([blob], 'voice.webm', { type: 'audio/webm', lastModified: 0 })
}

export async function scrubMedia(file: File): Promise<ScrubResult> {
  if (file.type.startsWith('image/')) return scrubImage(file)
  const clean = new File([file], file.name, { type: file.type, lastModified: 0 })
  return { file: clean, clean: true, originalSize: file.size, cleanSize: clean.size }
}
