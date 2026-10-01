// Downscales and re-encodes an image file before it goes to Supabase Storage —
// a phone photo straight out of the camera can be 4000x3000 and several MB;
// nothing we store (profile photos, package banners, scanned reports) needs
// that. Non-image files (PDFs, SVGs) and anything the browser can't decode
// pass through untouched rather than blocking the upload.
const JPEG_QUALITY = 0.82

export async function compressImage(file, { maxDimension = 1600 } = {}) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
