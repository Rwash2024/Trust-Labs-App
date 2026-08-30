import { useRef, useState } from 'react'
import { adminUploadImage } from '../../lib/admin'

// Recommended banner-card image size: 2:1 landscape (matches the featured-tests /
// packages carousel's aspect-ratio in CSS). Enforced with tolerance rather than an
// exact pixel match, since demanding an exact size is brittle for real-world photos.
const TARGET_WIDTH = 800
const TARGET_HEIGHT = 400
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT
const RATIO_TOLERANCE = 0.15
const MIN_WIDTH = 600

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

export default function ImageUploadField({ label, folder, value, onChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')

    try {
      const { width, height } = await readImageDimensions(file)
      const ratio = width / height
      if (width < MIN_WIDTH) {
        setError(`الصورة صغيرة أوي (${width}×${height}px) — المقاس المطلوب ${TARGET_WIDTH}×${TARGET_HEIGHT}px على الأقل`)
        return
      }
      if (Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO > RATIO_TOLERANCE) {
        setError(
          `نسبة الصورة (${width}×${height}px) مش مناسبة — المقاس المطلوب عريض بنسبة 2:1 تقريبًا (زي ${TARGET_WIDTH}×${TARGET_HEIGHT}px)`
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
          المقاس المفضّل: {TARGET_WIDTH}×{TARGET_HEIGHT}px (عرضي بنسبة 2:1)
        </p>
        {error && <p className="admin-error">{error}</p>}
      </div>
    </div>
  )
}
