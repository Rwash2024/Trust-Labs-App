import { useState } from 'react'
import {
  adminFindPatientCard,
  adminListFamilyMembers,
  adminUpdatePatientMedicalFile,
  adminUpdateFamilyMemberMedicalFile,
  adminUploadPatientReport,
} from '../../lib/admin'

const CARD_TYPE_LABEL = { personal: 'شخصي', family: 'عائلي' }

// One person's editable medical fields — used for the holder and reused for
// every family member, so the two stay visually identical.
function MedicalFileEditor({ title, subtitle, target, initial, onSaved }) {
  const [form, setForm] = useState({
    diagnoses: initial.diagnoses || '',
    current_medications: initial.current_medications || '',
    investigation: initial.investigation || '',
    imaging: initial.imaging || '',
  })
  const [files, setFiles] = useState({ investigation: initial.investigation_file_path, imaging: initial.imaging_file_path })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null) // 'investigation' | 'imaging' | null
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setSaved(false)
  }

  const handleUpload = (kind) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(kind)
    setError('')
    try {
      const path = await adminUploadPatientReport(file, kind, target)
      setFiles((prev) => ({ ...prev, [kind]: path }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (target.memberId) {
        await adminUpdateFamilyMemberMedicalFile(target.memberId, form)
      } else {
        await adminUpdatePatientMedicalFile(target.cardCode, form)
      }
      setSaved(true)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSave}>
      <h3>{title}</h3>
      {subtitle && <p className="admin-form__hint">{subtitle}</p>}

      <label>
        <span>التشخيصات</span>
        <textarea rows={3} value={form.diagnoses} onChange={updateField('diagnoses')} placeholder="مفيش تشخيصات مسجّلة" />
      </label>

      <label>
        <span>الأدوية الحالية</span>
        <textarea
          rows={3}
          value={form.current_medications}
          onChange={updateField('current_medications')}
          placeholder="مفيش أدوية مسجّلة"
        />
      </label>

      <label>
        <span>الفحوصات (التحاليل)</span>
        <textarea rows={3} value={form.investigation} onChange={updateField('investigation')} placeholder="ملخّص النتيجة" />
      </label>
      <div className="admin-form__row">
        <label>
          <span>ملف التحليل (PDF أو صورة)</span>
          <input type="file" accept=".pdf,image/*" onChange={handleUpload('investigation')} disabled={uploading === 'investigation'} />
        </label>
        {files.investigation && <span className="admin-form__hint">✓ فيه ملف مرفوع بالفعل</span>}
      </div>

      <label>
        <span>الأشعة</span>
        <textarea rows={3} value={form.imaging} onChange={updateField('imaging')} placeholder="ملخّص النتيجة" />
      </label>
      <div className="admin-form__row">
        <label>
          <span>ملف الأشعة (PDF أو صورة)</span>
          <input type="file" accept=".pdf,image/*" onChange={handleUpload('imaging')} disabled={uploading === 'imaging'} />
        </label>
        {files.imaging && <span className="admin-form__hint">✓ فيه ملف مرفوع بالفعل</span>}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {saved && <p className="admin-form__hint">تم الحفظ ✓</p>}

      <div className="admin-form__actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </form>
  )
}

export default function MedicalFilesTab() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | found | not-found
  const [card, setCard] = useState(null)
  const [members, setMembers] = useState([])
  const [editingMember, setEditingMember] = useState(null)
  const [error, setError] = useState('')

  const loadMembers = (cardCode) => adminListFamilyMembers(cardCode).then(setMembers)

  const handleSearch = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    setEditingMember(null)
    try {
      const found = await adminFindPatientCard(query)
      if (!found) {
        setCard(null)
        setStatus('not-found')
        return
      }
      setCard(found)
      setStatus('found')
      if (found.card_type === 'family') await loadMembers(found.card_code)
      else setMembers([])
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>الملفات الطبية — كارت الثقة</h2>
      </div>

      <form className="admin-form" onSubmit={handleSearch} style={{ maxWidth: 420 }}>
        <label>
          <span>كود الكارت أو رقم موبايل المريض</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="مثال: 587lhv أو 01xxxxxxxxx" />
        </label>
        <div className="admin-form__actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'جاري البحث...' : 'بحث'}
          </button>
        </div>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {status === 'not-found' && <p className="admin-error">مفيش كارت مطابق للكود أو الرقم ده.</p>}

      {card && (
        <>
          <p className="admin-form__hint">
            {card.name || '(الكارت لسه مش مفعّل)'} — {card.phone || '—'} — كارت {CARD_TYPE_LABEL[card.card_type]}
          </p>

          {!card.name ? (
            <p className="admin-error">الكارت ده لسه مش مفعّل — المريض لازم يسجّل بياناته الأول من الأبلكيشن.</p>
          ) : (
            <MedicalFileEditor
              title="الملف الطبي — صاحب الكارت"
              target={{ cardCode: card.card_code }}
              initial={card}
              onSaved={() => {}}
            />
          )}

          {card.card_type === 'family' && members.length > 0 && (
            <>
              <div className="admin-toolbar">
                <h2>أفراد العائلة ({members.length})</h2>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>صلة القرابة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.relation}</td>
                      <td className="admin-table__actions">
                        <button className="admin-btn admin-btn--sm" onClick={() => setEditingMember(m)}>
                          تعديل الملف الطبي
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {editingMember && (
                <MedicalFileEditor
                  title={`الملف الطبي — ${editingMember.name}`}
                  subtitle={`صلة القرابة: ${editingMember.relation}`}
                  target={{ cardCode: card.card_code, memberId: editingMember.id }}
                  initial={editingMember}
                  onSaved={() => loadMembers(card.card_code)}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
