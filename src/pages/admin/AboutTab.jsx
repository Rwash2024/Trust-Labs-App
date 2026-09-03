import { useEffect, useState } from 'react'
import { adminGetAboutContent, adminSaveAboutContent } from '../../lib/admin'
import { defaultAboutContent } from '../../data/aboutContent'
import ImageUploadField from '../../components/admin/ImageUploadField'

const pillarLabels = ['التقنيات والمعايير', 'الرعاية الصحية', 'دقة التشخيص', 'الفريق المتخصص']

export default function AboutTab() {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(null)

  const load = () => {
    setLoading(true)
    adminGetAboutContent()
      .then((data) => setContent(data || { ...defaultAboutContent }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const update = (field, value) => setContent({ ...content, [field]: value })

  const updatePillar = (i, field, value) => {
    const pillars = content.pillars.map((p, idx) => (idx === i ? { ...p, [field]: value } : p))
    update('pillars', pillars)
  }

  const updateTeamMember = (i, field, value) => {
    const team = content.team.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    update('team', team)
  }

  const addTeamMember = () => update('team', [...content.team, { name: '', title: '', photo_url: null }])
  const removeTeamMember = (i) => update('team', content.team.filter((_, idx) => idx !== i))

  const updateAccreditation = (i, field, value) => {
    const accreditations = content.accreditations.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
    update('accreditations', accreditations)
  }

  const addAccreditation = () => update('accreditations', [...content.accreditations, { name: '', logo_url: null }])
  const removeAccreditation = (i) => update('accreditations', content.accreditations.filter((_, idx) => idx !== i))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSavedAt(null)
    try {
      await adminSaveAboutContent(content)
      setSavedAt(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !content) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div>
      <div className="admin-toolbar">
        <h2>صفحة "من نحن"</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {savedAt && <p className="admin-success">تم الحفظ بنجاح</p>}

      <form className="admin-form" onSubmit={handleSave}>
        <h3>المقدمة والإحصائيات</h3>
        <label>
          <span>الشعار التعريفي (تحت "من نحن")</span>
          <textarea rows={2} required value={content.tagline} onChange={(e) => update('tagline', e.target.value)} />
        </label>
        <div className="admin-form__row">
          <label>
            <span>سنة التأسيس</span>
            <input required value={content.founded_year} onChange={(e) => update('founded_year', e.target.value)} />
          </label>
          <label>
            <span>عدد الفروع</span>
            <input required value={content.branches_count} onChange={(e) => update('branches_count', e.target.value)} />
          </label>
          <label>
            <span>عدد الحالات المكتملة</span>
            <input required value={content.cases_count} onChange={(e) => update('cases_count', e.target.value)} />
          </label>
        </div>

        <h3>قصتنا</h3>
        <label>
          <span>الفقرة الأولى</span>
          <textarea rows={4} required value={content.story_p1} onChange={(e) => update('story_p1', e.target.value)} />
        </label>
        <label>
          <span>الفقرة الثانية</span>
          <textarea rows={3} required value={content.story_p2} onChange={(e) => update('story_p2', e.target.value)} />
        </label>

        <h3>ركائزنا الأربعة</h3>
        {content.pillars.map((p, i) => (
          <div className="admin-form__row" key={i}>
            <label>
              <span>{pillarLabels[i] || `عنوان ${i + 1}`}</span>
              <input required value={p.title} onChange={(e) => updatePillar(i, 'title', e.target.value)} />
            </label>
            <label>
              <span>الوصف</span>
              <textarea rows={2} required value={p.desc} onChange={(e) => updatePillar(i, 'desc', e.target.value)} />
            </label>
          </div>
        ))}

        <div className="admin-toolbar">
          <h3>فريق العمل</h3>
          <button type="button" className="admin-btn admin-btn--sm" onClick={addTeamMember}>
            + إضافة عضو
          </button>
        </div>
        {content.team.map((m, i) => (
          <div className="admin-form" key={i} style={{ marginBottom: 16 }}>
            <ImageUploadField
              label="صورة العضو"
              folder="about-team"
              value={m.photo_url}
              onChange={(url) => updateTeamMember(i, 'photo_url', url)}
              targetWidth={400}
              targetHeight={400}
              ratioTolerance={0.4}
              minWidth={200}
            />
            <div className="admin-form__row">
              <label>
                <span>الاسم</span>
                <input required value={m.name} onChange={(e) => updateTeamMember(i, 'name', e.target.value)} />
              </label>
              <label>
                <span>المسمى الوظيفي</span>
                <input required value={m.title} onChange={(e) => updateTeamMember(i, 'title', e.target.value)} />
              </label>
            </div>
            <div className="admin-form__actions">
              <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => removeTeamMember(i)}>
                حذف العضو
              </button>
            </div>
          </div>
        ))}

        <div className="admin-toolbar">
          <h3>الاعتمادات والشهادات</h3>
          <button type="button" className="admin-btn admin-btn--sm" onClick={addAccreditation}>
            + إضافة اعتماد
          </button>
        </div>
        {content.accreditations.map((a, i) => (
          <div className="admin-form" key={i} style={{ marginBottom: 16 }}>
            <ImageUploadField
              label="الشعار"
              folder="about-accreditations"
              value={a.logo_url}
              onChange={(url) => updateAccreditation(i, 'logo_url', url)}
              targetWidth={300}
              targetHeight={300}
              ratioTolerance={0.6}
              minWidth={100}
            />
            <label>
              <span>الاسم</span>
              <input required value={a.name} onChange={(e) => updateAccreditation(i, 'name', e.target.value)} />
            </label>
            <div className="admin-form__actions">
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => removeAccreditation(i)}
              >
                حذف الاعتماد
              </button>
            </div>
          </div>
        ))}

        <div className="admin-form__actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ كل التعديلات'}
          </button>
        </div>
      </form>
    </div>
  )
}
