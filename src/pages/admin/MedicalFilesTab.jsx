import { useEffect, useState } from 'react'
import {
  adminFindPatientCard,
  adminListActivatedCards,
  adminListBranches,
  adminDistributeCards,
  adminCardsByBranch,
  adminListFamilyMembers,
  adminUpdatePatientMedicalFile,
  adminUpdateFamilyMemberMedicalFile,
  adminUploadPatientReport,
  adminGetTrustCardPricing,
  adminSaveTrustCardPricing,
} from '../../lib/admin'

const CARD_TYPE_LABEL = { personal: 'شخصي', family: 'عائلي' }

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

// توزيع الكروت على الفروع: اختار الفرع، الصق أكواد الكروت اللي سلّمتها له، وسجّل التاريخ.
function DistributionPanel({ onChanged }) {
  const [branches, setBranches] = useState([])
  const [branch, setBranch] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    adminListBranches()
      .then((rows) => setBranches(rows.map((b) => b.name)))
      .catch((e) => setError(e.message))
  }, [])

  const codes = [...new Set(text.toLowerCase().split(/[\s,;،]+/).filter(Boolean))]

  const submit = async (force = false) => {
    setBusy(true)
    setError('')
    try {
      const res = await adminDistributeCards({ codes, branch, date, force })
      setResult({ ...res, branch })
      if (res.invalid.length === 0 && res.conflicts.length === 0) setText('')
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault()
        setResult(null)
        submit(false)
      }}
      style={{ maxWidth: 520, marginBottom: 'var(--space-6)' }}
    >
      <h3>تسجيل كروت وُزّعت على فرع</h3>
      <div className="admin-form__row">
        <label>
          <span>الفرع</span>
          <select required value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">اختر الفرع</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>تاريخ التسليم</span>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        <span>أكواد الكروت (كل كود في سطر، أو بينهم مسافة/فاصلة)</span>
        <textarea
          rows={5}
          dir="ltr"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'038o9p\n03xo0f\n06y8jj'}
        />
      </label>
      <p className="admin-form__hint">عدد الأكواد المكتوبة: {codes.length}</p>
      <div className="admin-form__actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || !branch || codes.length === 0}>
          {busy ? 'جاري التسجيل...' : 'سجّل التوزيع'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {result && (
        <div className="admin-form__hint" style={{ lineHeight: 1.9 }}>
          <p>
            ✅ اتسجّل <b>{result.assigned}</b> كارت لفرع {result.branch} (شخصي {result.personal} — عائلي {result.family}).
          </p>
          {result.already.length > 0 && <p>ℹ️ {result.already.length} كارت كانوا متسجّلين للفرع ده قبل كده.</p>}
          {result.invalid.length > 0 && (
            <p className="admin-error">
              ❌ أكواد مش موجودة ({result.invalid.length}، متسجّلتش): <span dir="ltr">{result.invalid.join(' ')}</span>
            </p>
          )}
          {result.conflicts.length > 0 && (
            <div className="admin-error">
              <p>⚠️ {result.conflicts.length} كارت متسلّمين لفرع تاني ولسه ما اتنقلوش:</p>
              <p dir="ltr">{result.conflicts.map((c) => `${c.code} (${c.branch})`).join('  ')}</p>
              <button type="button" className="admin-btn" disabled={busy} onClick={() => submit(true)}>
                انقلهم لفرع {result.branch}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  )
}

// تقرير الفروع: كل فرع استلم كام كارت واتفعّل منهم كام.
function BranchReportPanel({ refreshKey }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminCardsByBranch()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [refreshKey])

  if (error) return <p className="admin-error">{error}</p>
  if (!data) return null
  const sum = (k) => data.rows.reduce((t, r) => t + r[k], 0)

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div className="admin-toolbar">
        <h2>تقرير الفروع — كروت الثقة</h2>
      </div>
      {data.rows.length === 0 ? (
        <p className="admin-form__hint">لسه ما اتسجّلش توزيع على أي فرع. الكروت اللي ما اتوزعتش: {data.unassigned}.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>الفرع</th>
              <th>استلم</th>
              <th>شخصي</th>
              <th>عائلي</th>
              <th>اتفعّل</th>
              <th>لسه معاه</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.branch}>
                <td>{r.branch}</td>
                <td>{r.received}</td>
                <td>{r.personal}</td>
                <td>{r.family}</td>
                <td>{r.activated}</td>
                <td>{r.received - r.activated}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td>الإجمالي</td>
              <td>{sum('received')}</td>
              <td>{sum('personal')}</td>
              <td>{sum('family')}</td>
              <td>{sum('activated')}</td>
              <td>{sum('received') - sum('activated')}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="admin-form__hint">كروت لسه ما اتوزعتش على أي فرع: {data.unassigned}</p>
    </div>
  )
}

// كل كارت اتفعّل: كوده، تاريخ التفعيل، تاريخ الانتهاء (سنة كاملة)، وبيانات صاحبه.
function ActivatedCardsPanel({ onOpen, refreshKey }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all | personal | family
  const [now] = useState(() => Date.now())

  useEffect(() => {
    adminListActivatedCards()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [refreshKey])

  if (error) return <p className="admin-error">{error}</p>
  if (!data) return null

  const rows = data.cards.filter((c) => filter === 'all' || c.card_type === filter)
  const daysLeft = (c) => Math.ceil((new Date(c.expires_at) - now) / 86400000)

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div className="admin-toolbar">
        <h2>
          الكروت المفعّلة ({data.cards.length} من {data.total})
        </h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">الكل</option>
          <option value="personal">شخصي</option>
          <option value="family">عائلي</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="admin-form__hint">لسه مفيش كروت مفعّلة.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>النوع</th>
              <th>الفرع</th>
              <th>الاسم</th>
              <th>الموبايل</th>
              <th>فصيلة الدم</th>
              <th>تاريخ التفعيل</th>
              <th>تاريخ الانتهاء</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const left = daysLeft(c)
              return (
                <tr key={c.card_code} style={{ cursor: 'pointer' }} onClick={() => onOpen(c.card_code)}>
                  <td dir="ltr">{c.card_code}</td>
                  <td>{CARD_TYPE_LABEL[c.card_type] || c.card_type}</td>
                  <td>{c.branch_name || '—'}</td>
                  <td>{c.name}</td>
                  <td dir="ltr">{c.phone}</td>
                  <td>{c.blood_group || '—'}</td>
                  <td>{fmtDate(c.activated_at)}</td>
                  <td>{fmtDate(c.expires_at)}</td>
                  <td>{left > 0 ? `${left.toLocaleString('ar-EG')} يوم` : 'منتهي'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// أسعار الكروت — بيانها الأول مرة في الشات مع الفريق (شخصي 250 = 200 نصيب
// المعمل + 50 عمولة الموظف؛ عائلي 650 = 600 + 50)، متسجّلة هنا بدل ما تفضل
// في رأس حد بس.
function PricingPanel() {
  const [pricing, setPricing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminGetTrustCardPricing()
      .then(setPricing)
      .catch((e) => setError(e.message))
  }, [])

  const updateField = (field) => (e) => {
    setPricing((prev) => ({ ...prev, [field]: e.target.value }))
    setSaved(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminSaveTrustCardPricing({
        personal_price: Number(pricing.personal_price),
        personal_commission: Number(pricing.personal_commission),
        family_price: Number(pricing.family_price),
        family_commission: Number(pricing.family_commission),
      })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!pricing) return null

  return (
    <form className="admin-form" onSubmit={handleSave} style={{ maxWidth: 480 }}>
      <h3>أسعار كارت الثقة</h3>
      <div className="admin-form__row">
        <label>
          <span>سعر الكارت الشخصي (جنيه)</span>
          <input type="number" min="0" value={pricing.personal_price} onChange={updateField('personal_price')} />
        </label>
        <label>
          <span>عمولة الموظف (شخصي)</span>
          <input type="number" min="0" value={pricing.personal_commission} onChange={updateField('personal_commission')} />
        </label>
      </div>
      <div className="admin-form__row">
        <label>
          <span>سعر الكارت العائلي (جنيه)</span>
          <input type="number" min="0" value={pricing.family_price} onChange={updateField('family_price')} />
        </label>
        <label>
          <span>عمولة الموظف (عائلي)</span>
          <input type="number" min="0" value={pricing.family_commission} onChange={updateField('family_commission')} />
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {saved && <p className="admin-form__hint">تم الحفظ ✓</p>}

      <div className="admin-form__actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ الأسعار'}
        </button>
      </div>
    </form>
  )
}

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
  const [refreshKey, setRefreshKey] = useState(0)
  const [status, setStatus] = useState('idle') // idle | loading | found | not-found
  const [card, setCard] = useState(null)
  const [members, setMembers] = useState([])
  const [editingMember, setEditingMember] = useState(null)
  const [error, setError] = useState('')

  const loadMembers = (cardCode) => adminListFamilyMembers(cardCode).then(setMembers)

  const runSearch = async (q) => {
    setStatus('loading')
    setError('')
    setEditingMember(null)
    try {
      const found = await adminFindPatientCard(q)
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

  const handleSearch = (e) => {
    e.preventDefault()
    runSearch(query)
  }

  const openByCode = (code) => {
    setQuery(code)
    runSearch(code)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>الملفات الطبية — كارت الثقة</h2>
      </div>

      <DistributionPanel onChanged={() => setRefreshKey((k) => k + 1)} />

      <BranchReportPanel refreshKey={refreshKey} />

      <ActivatedCardsPanel onOpen={openByCode} refreshKey={refreshKey} />

      <PricingPanel />

      <div className="admin-toolbar">
        <h2>البحث عن مريض</h2>
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
