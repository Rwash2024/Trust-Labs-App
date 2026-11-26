// Turns a picked image into a small square JPEG (center crop) for upload, so a
// 5 MB phone photo goes up as ~50 KB. Browser-only (canvas).
export const PHOTO_SIZE = 480

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to <img> (older Safari, odd formats)
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Resolves to { base64, previewUrl }; rejects with an Arabic message.
export async function fileToSquareJpeg(file, size = PHOTO_SIZE) {
  if (!file || !/^image\//.test(file.type)) throw new Error('اختار صورة (JPG أو PNG)')
  let source
  try {
    source = await loadBitmap(file)
  } catch {
    throw new Error('مش قادرين نفتح الصورة دي، جرّب صورة تانية')
  }
  const w = source.width
  const h = source.height
  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
  source.close?.()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { base64: dataUrl.replace(/^data:image\/jpeg;base64,/, ''), previewUrl: dataUrl }
}
