import { useEffect, useState } from 'react'
import { adminGetTrustCardPrice, adminSaveTrustCardPrice } from '../../lib/admin'
import { DEFAULT_TRUST_CARD_PRICE } from '../../lib/data'
import TrustCardRequests from './TrustCardRequests'

export default function TrustCardTab() {
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    adminGetTrustCardPrice()
      .then((value) => setPrice(String(value ?? DEFAULT_TRUST_CARD_PRICE)))
      .catch((e) => {
        setPrice(String(DEFAULT_TRUST_CARD_PRICE))
        setError(`${e.message} — لو الجدول لسه مش موجود، شغّل supabase/trust_card_settings_migration.sql الأول.`)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    const value = Number(price)
    if (!Number.isFinite(value) || value <= 0) {
      setError('اكتب سعر صحيح أكبر من صفر')
      return
    }
    setSaving(true)
    setError('')
    setSavedAt(null)
    try {
      await adminSaveTrustCardPrice(value)
      setSavedAt(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div>
      <div className="admin-toolbar">
        <h2>كارت الثقة</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {savedAt && <p className="admin-success">تم الحفظ — السعر الجديد ظاهر دلوقتي في صفحة كارت الثقة</p>}

      <form className="admin-form" onSubmit={handleSave}>
        <label>
          <span>سعر الكارت (جنيه)</span>
          <input required type="number" min="1" step="1" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <div className="admin-form__actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>

      <TrustCardRequests />
    </div>
  )
}
