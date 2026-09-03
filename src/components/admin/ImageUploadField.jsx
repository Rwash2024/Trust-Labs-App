import { useRef, useState } from 'react'
import { adminUploadImage } from '../../lib/admin'

// Recommended banner-card image size: 2:1 landscape (matches the featured-tests /
// packages carousel's aspect-ratio in CSS). Enforced with tolerance rather than an
// exact pixel match, since demanding an exact size is brittle for real-world photos.
const DEFAULT_TARGET_WIDTH = 800
const DEFAULT_TARGET_HEIGHT = 400
const DEFAULT_RATIO_TOLERANCE = 0.15
const DEFAULT_MIN_WIDTH = 600

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('الملف مش صورة صالحة'))
    }
    img.src = url
  })
}

export default function ImageUploadField({
  label,
  folder,
  value,
  onChange,
  targetWidth = DEFAULT_TARGET_WIDTH,
  targetHeight = DEFAULT_TARGET_HEIGHT,
  ratioTolerance = DEFAULT_RATIO_TOLERANCE,
  minWidth = DEFAULT_MIN_WIDTH,
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const targetRatio = targetWidth / targetHeight

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')

    try {
      const { width, height } = await readImageDimensions(file)
      const ratio = width / height
      if (width < minWidth) {
        setError(`الصورة صغيرة أوي (${width}×${height}px) — المقاس المطلوب ${targetWidth}×${targetHeight}px على الأقل`)
        return
      }
      if (Math.abs(ratio - targetRatio) / targetRatio > ratioTolerance) {
        setError(
          `نسبة الصورة (${width}×${height}px) مش مناسبة — المقاس المطلوب زي ${targetWidth}×${targetHeight}px تقريبًا`
        )
        return
      }

      setUploading(true)
      const url = await adminUploadImage(file, folder)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="admin-image-upload">
      <span className="admin-image-upload__label">{label}</span>
      <div className="admin-image-upload__body">
        {value ? (
          <img className="admin-image-upload__preview" src={value} alt="" />
        ) : (
          <div className="admin-image-upload__placeholder">مفيش صورة</div>
        )}
        <div className="admin-image-upload__actions">
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'جاري الرفع...' : value ? 'تغيير الصورة' : 'رفع صورة'}
          </button>
          {value && (
            <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => onChange(null)}>
              حذف الصورة
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
        <p className="admin-image-upload__hint">
          المقاس المفضّل: {targetWidth}×{targetHeight}px
        </p>
        {error && <p className="admin-error">{error}</p>}
      </div>
    </div>
  )
}
