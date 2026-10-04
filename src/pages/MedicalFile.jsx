import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  activatePatientCard,
  fetchPatientFile,
  uploadPatientPhoto,
  fetchFamilyMembers,
  addFamilyMember,
  fetchReportUrl,
} from '../lib/data'
import {
  ShieldIcon,
  CardIcon,
  MedicalFileIcon,
  EmergencyIcon,
  TestTubeIcon,
  XRayIcon,
  MicroscopeIcon,
  PersonIcon,
  FamilyIcon,
  ArrowIcon,
  ChevronDownIcon,
  PlusIcon,
} from '../components/icons'
import './MedicalFile.css'

// "كارت الثقة" — replaces the old MedCloud QR link entirely (see chat/commit
// history: that link showed anyone who scanned an unactivated card a real
// patient's full medical file, forever, with zero login). Two rules here on
// purpose: a card_code alone never returns anything, and only a phone match
// unlocks the file. See supabase/patient_cards_migration.sql.

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function calcAge(dob) {
  if (!dob) return null
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

const GENDER_LABEL = { male: 'ذكر', female: 'أنثى' }

// The five tiles on the file "home" screen, closest to the MedCloud layout
// the request was matched against — each opens its own focused screen
// instead of one long page, same as the reference.
const MENU_ITEMS = [
  { key: 'full', label: 'الملف الطبي', Icon: MedicalFileIcon, tone: 'primary' },
  { key: 'emergency', label: 'ملف الطوارئ', Icon: EmergencyIcon, tone: 'danger' },
  { key: 'tests', label: 'التحاليل', Icon: TestTubeIcon, tone: 'primary' },
  { key: 'imaging', label: 'الأشعة', Icon: XRayIcon, tone: 'primary' },
  { key: 'diagnoses', label: 'كشف الأمراض', Icon: MicroscopeIcon, tone: 'primary' },
  { key: 'family', label: 'أفراد العائلة', Icon: FamilyIcon, tone: 'primary' },
]

// A PDF/image the staff attached — fetches a fresh signed URL on tap rather
// than storing one, since the link expires in a few minutes either way.
function ReportDownloadButton({ auth, kind, memberId }) {
  const [status, setStatus] = useState('idle') // idle | loading | error

  const handleClick = async () => {
    setStatus('loading')
    // Open the tab synchronously, inside the click itself — iOS Safari (most
    // patients' browser) drops the "this came from a real tap" permission a
    // moment after an `await`, and silently blocks window.open() called
    // after the fetch instead. Point this blank tab at the real URL once we
    // have it.
    const tab = window.open('', '_blank', 'noopener')
    const url = await fetchReportUrl({ cardCode: auth.cardCode, phone: auth.phone, kind, memberId })
    if (url && tab) {
      tab.location.href = url
      setStatus('idle')
    } else {
      tab?.close()
      setStatus('error')
    }
  }

  return (
    <div className="medfile__report-download">
      <button type="button" className="medfile__report-btn" onClick={handleClick} disabled={status === 'loading'}>
        {status === 'loading' ? 'جاري التحميل...' : 'تحميل التقرير المرفق'}
      </button>
      {status === 'error' && <p className="medfile__error">تعذّر فتح الملف، حاول تاني.</p>}
    </div>
  )
}

function AccordionItem({ title, value, download }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="medfile__accordion-item">
      <button
        type="button"
        className="medfile__accordion-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        <ChevronDownIcon className={`medfile__accordion-chevron${open ? ' open' : ''}`} width={18} height={18} />
      </button>
      {open && (
        <div className="medfile__accordion-body">
          <p>{value || 'لسه مفيش بيانات هنا — هتظهر أول ما تكون جاهزة.'}</p>
          {download}
        </div>
      )}
    </div>
  )
}

function Avatar({ photoUrl, danger, Icon = PersonIcon, size = 64 }) {
  if (photoUrl) {
    return (
      <span className={`medfile__avatar medfile__avatar--photo${danger ? ' medfile__avatar--danger' : ''}`} style={{ width: size, height: size }}>
        <img src={photoUrl} alt="" />
      </span>
    )
  }
  return (
    <span className={`medfile__avatar${danger ? ' medfile__avatar--danger' : ''}`} style={{ width: size, height: size }}>
      <Icon width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} />
    </span>
  )
}

// A simple "Label: value" line, matching the reference layout — not the
// boxed two-column rows we used before.
function FactsList({ facts }) {
  const shown = facts.filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (shown.length === 0) return null
  return (
    <div className="medfile__facts">
      {shown.map(([label, value, ltr]) => (
        <p className="medfile__fact-line" key={label}>
          {label}: <strong dir={ltr ? 'ltr' : undefined}>{value}</strong>
        </p>
      ))}
    </div>
  )
}

// Avatar + name + address side by side, same header shape as the reference
// screen — the avatar sits beside the text instead of centered above it.
function PersonHeader({ photoUrl, name, address, badge, danger }) {
  return (
    <div className="medfile__card-header">
      <Avatar photoUrl={photoUrl} danger={danger} size={56} />
      <div className="medfile__card-header-text">
        <h2 className="medfile__name">{name}</h2>
        {address && <p className="medfile__address">{address}</p>}
        {badge && <span className="medfile__relation-badge">{badge}</span>}
      </div>
    </div>
  )
}

function ProfileCard({ file }) {
  const age = calcAge(file.dob)
  return (
    <div className="medfile__card">
      <PersonHeader photoUrl={file.photo_url} name={file.name} address={file.address} />
      <FactsList
        facts={[
          ['فصيلة الدم', file.blood_group || 'غير معروفة'],
          ['النوع', GENDER_LABEL[file.gender] || file.gender],
          ['الحالة الاجتماعية', file.marital_status],
          ['السن', age],
          ['الموبايل', file.phone, true],
          ['رقم الطوارئ', file.emergency_phone, true],
        ]}
      />
    </div>
  )
}

function ScreenHeader({ title, onBack }) {
  return (
    <div className="medfile__screen-head">
      <button type="button" className="medfile__back" onClick={onBack}>
        <ArrowIcon width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        رجوع
      </button>
      <h2>{title}</h2>
    </div>
  )
}

function SingleSection({ title, value, onBack, download }) {
  return (
    <div className="medfile__view">
      <ScreenHeader title={title} onBack={onBack} />
      <div className="medfile__section">
        <p className="medfile__section-body">
          {value || 'لسه مفيش بيانات هنا — هتظهر أول ما تكون جاهزة.'}
        </p>
        {download}
      </div>
    </div>
  )
}

function FamilySection({ auth, onBack }) {
  const [members, setMembers] = useState(null) // null = loading
  const [adding, setAdding] = useState(false)
  const [openMember, setOpenMember] = useState(null)

  useEffect(() => {
    fetchFamilyMembers(auth.cardCode, auth.phone).then(setMembers)
  }, [auth.cardCode, auth.phone])

  const reload = () => {
    setMembers(null)
    fetchFamilyMembers(auth.cardCode, auth.phone).then(setMembers)
  }

  if (openMember) {
    return (
      <div className="medfile__view">
        <ScreenHeader title={openMember.name} onBack={() => setOpenMember(null)} />
        <div className="medfile__card">
          <PersonHeader photoUrl={openMember.photo_url} name={openMember.name} badge={openMember.relation} />
          <FactsList
            facts={[
              ['فصيلة الدم', openMember.blood_group || 'غير معروفة'],
              ['النوع', GENDER_LABEL[openMember.gender] || openMember.gender],
              ['السن', calcAge(openMember.dob)],
            ]}
          />
        </div>
        <div className="medfile__accordion">
          <AccordionItem title="التشخيصات" value={openMember.diagnoses} />
          <AccordionItem title="الأدوية الحالية" value={openMember.current_medications} />
          <AccordionItem
            title="الفحوصات"
            value={openMember.investigation}
            download={
              openMember.investigation_file_path && (
                <ReportDownloadButton auth={auth} kind="investigation" memberId={openMember.id} />
              )
            }
          />
          <AccordionItem
            title="الأشعة"
            value={openMember.imaging}
            download={
              openMember.imaging_file_path && <ReportDownloadButton auth={auth} kind="imaging" memberId={openMember.id} />
            }
          />
        </div>
      </div>
    )
  }

  if (adding) {
    return <AddFamilyMemberForm auth={auth} onDone={() => { setAdding(false); reload() }} onCancel={() => setAdding(false)} />
  }

  return (
    <div className="medfile__view">
      <ScreenHeader title="أفراد العائلة" onBack={onBack} />

      {members === null ? (
        <p className="medfile__section-body">جاري التحميل...</p>
      ) : members.length === 0 ? (
        <p className="medfile__empty">لسه مفيش حد مضاف. ضيف أول فرد من عيلتك للكارت.</p>
      ) : (
        <div className="medfile__menu">
          {members.map((m) => (
            <button key={m.id} className="medfile__nav-card" onClick={() => setOpenMember(m)}>
              <span className="medfile__nav-label">
                <ArrowIcon width={16} height={16} style={{ transform: 'rotate(135deg)' }} />
                {m.name}
                <span className="medfile__relation-badge">{m.relation}</span>
              </span>
              <span className="medfile__nav-icon">
                <PersonIcon width={22} height={22} />
              </span>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="medfile__submit" onClick={() => setAdding(true)}>
        <PlusIcon width={18} height={18} />
        إضافة فرد جديد
      </button>
    </div>
  )
}

function AddFamilyMemberForm({ auth, onDone, onCancel }) {
  const [form, setForm] = useState({ relation: '', name: '', gender: '', dob: '', bloodGroup: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | error | limit_reached | not_family_card

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    const result = await addFamilyMember({ cardCode: auth.cardCode, phone: auth.phone, ...form })
    if (result === 'added') {
      onDone()
      return
    }
    if (result === 'limit_reached' || result === 'not_family_card') {
      setStatus(result)
      return
    }
    setStatus('error')
  }

  return (
    <form className="medfile__form" onSubmit={handleSubmit}>
      <h2 className="medfile__form-title">إضافة فرد للعائلة</h2>

      <label className="medfile__field">
        <span>صلة القرابة</span>
        <select required value={form.relation} onChange={updateField('relation')}>
          <option value="" disabled>
            اختر
          </option>
          <option value="زوج">زوج</option>
          <option value="زوجة">زوجة</option>
          <option value="ابن">ابن</option>
          <option value="ابنة">ابنة</option>
          <option value="أب">أب</option>
          <option value="أم">أم</option>
          <option value="أخرى">أخرى</option>
        </select>
      </label>

      <label className="medfile__field">
        <span>الاسم بالكامل</span>
        <input required type="text" value={form.name} onChange={updateField('name')} placeholder="اسمه بالكامل" />
      </label>

      <div className="medfile__row">
        <label className="medfile__field">
          <span>النوع</span>
          <select value={form.gender} onChange={updateField('gender')}>
            <option value="">اختر</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </label>

        <label className="medfile__field">
          <span>تاريخ الميلاد</span>
          <input type="date" value={form.dob} onChange={updateField('dob')} />
        </label>
      </div>

      <label className="medfile__field">
        <span>فصيلة الدم</span>
        <select value={form.bloodGroup} onChange={updateField('bloodGroup')}>
          <option value="">غير معروفة</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>
      </label>

      {status === 'error' && <p className="medfile__error">حصل خطأ، حاول تاني.</p>}
      {status === 'limit_reached' && (
        <p className="medfile__error">وصلت للحد الأقصى (5 أفراد) على الكارت العائلي ده.</p>
      )}
      {status === 'not_family_card' && (
        <p className="medfile__error">الكارت ده كارت شخصي — إضافة أفراد العائلة متاحة بس على الكارت العائلي.</p>
      )}

      <button className="medfile__submit" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'جاري الإضافة...' : 'إضافة'}
      </button>
      <button type="button" className="medfile__link-btn" onClick={onCancel}>
        إلغاء
      </button>
    </form>
  )
}

function FileHome({ file, auth, onExit }) {
  const [section, setSection] = useState(null) // null = menu

  if (section === 'full') {
    return (
      <div className="medfile__view">
        <ScreenHeader title="الملف الطبي" onBack={() => setSection(null)} />
        <ProfileCard file={file} />
        <div className="medfile__accordion">
          <AccordionItem title="التشخيصات" value={file.diagnoses} />
          <AccordionItem title="الأدوية الحالية" value={file.current_medications} />
          <AccordionItem
            title="الفحوصات"
            value={file.investigation}
            download={file.investigation_file_path && <ReportDownloadButton auth={auth} kind="investigation" />}
          />
          <AccordionItem
            title="الأشعة"
            value={file.imaging}
            download={file.imaging_file_path && <ReportDownloadButton auth={auth} kind="imaging" />}
          />
        </div>
      </div>
    )
  }

  if (section === 'emergency') {
    return (
      <div className="medfile__view">
        <ScreenHeader title="ملف الطوارئ" onBack={() => setSection(null)} />
        <div className="medfile__card medfile__card--emergency">
          <PersonHeader photoUrl={file.photo_url} name={file.name} danger />
          <FactsList
            facts={[
              ['فصيلة الدم', file.blood_group || 'غير معروفة'],
              ['رقم الطوارئ', file.emergency_phone || '—', true],
              ['موبايل المريض', file.phone, true],
            ]}
          />
        </div>
      </div>
    )
  }

  if (section === 'tests')
    return (
      <SingleSection
        title="التحاليل"
        value={file.investigation}
        onBack={() => setSection(null)}
        download={file.investigation_file_path && <ReportDownloadButton auth={auth} kind="investigation" />}
      />
    )
  if (section === 'imaging')
    return (
      <SingleSection
        title="الأشعة"
        value={file.imaging}
        onBack={() => setSection(null)}
        download={file.imaging_file_path && <ReportDownloadButton auth={auth} kind="imaging" />}
      />
    )
  if (section === 'diagnoses') return <SingleSection title="كشف الأمراض" value={file.diagnoses} onBack={() => setSection(null)} />
  if (section === 'family') return <FamilySection auth={auth} onBack={() => setSection(null)} />

  // "أفراد العائلة" only exists on a family card — a personal card never even
  // sees the tile, rather than opening it and being told no each time.
  const visibleItems = MENU_ITEMS.filter((item) => item.key !== 'family' || file.card_type === 'family')

  return (
    <div className="medfile__view">
      <p className="medfile__greeting">أهلاً، {file.name}</p>
      <div className="medfile__menu">
        {visibleItems.map(({ key, label, Icon, tone }) => (
          <button key={key} className="medfile__nav-card" onClick={() => setSection(key)}>
            <span className="medfile__nav-label">
              <ArrowIcon width={16} height={16} style={{ transform: 'rotate(135deg)' }} />
              {label}
            </span>
            <span className={`medfile__nav-icon${tone === 'danger' ? ' medfile__nav-icon--danger' : ''}`}>
              <Icon width={22} height={22} />
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="medfile__link-btn" onClick={onExit}>
        خروج
      </button>
    </div>
  )
}

export default function MedicalFile() {
  const [params] = useSearchParams()
  const codeFromQr = params.get('code') || ''

  const [mode, setMode] = useState(codeFromQr ? null : 'choose') // null while deciding, 'activate' | 'view'
  const [file, setFile] = useState(null)
  const [auth, setAuth] = useState(null) // { cardCode, phone } — needed for family-member calls

  const handleSignedIn = (cardCode, phone, data) => {
    setAuth({ cardCode, phone })
    setFile(data)
  }

  const handleExit = () => {
    setFile(null)
    setAuth(null)
  }

  return (
    <div className="medfile">
      <section className="medfile__hero">
        <span className="medfile__blob" />
        <span className="medfile__icon">
          <ShieldIcon width={26} height={26} color="#fff" />
        </span>
        <h1 className="medfile__title">كارت الثقة</h1>
        <p className="medfile__subtitle">ملفك الطبي، محمي برقم موبايلك — مش بمجرد مسح الكارت.</p>
      </section>

      <div className="medfile__body">
        {file ? (
          <FileHome file={file} auth={auth} onExit={handleExit} />
        ) : mode === 'activate' ? (
          <ActivateForm initialCode={codeFromQr} onDone={handleSignedIn} onSwitchToView={() => setMode('view')} />
        ) : mode === 'view' ? (
          <ViewForm initialCode={codeFromQr} onFound={handleSignedIn} onSwitchToActivate={() => setMode('activate')} />
        ) : (
          <ChooseMode code={codeFromQr} onChoose={setMode} />
        )}
      </div>
    </div>
  )
}

function ChooseMode({ code, onChoose }) {
  return (
    <div className="medfile__choose">
      {code && (
        <p className="medfile__code-hint">
          كود الكارت: <span dir="ltr">{code}</span>
        </p>
      )}
      <button className="medfile__choice-btn" onClick={() => onChoose('activate')}>
        <CardIcon />
        الكارت ده أول مرة أستخدمه
      </button>
      <button className="medfile__choice-btn" onClick={() => onChoose('view')}>
        <ShieldIcon />
        سجّلت بياناتي قبل كده
      </button>
    </div>
  )
}

function ViewForm({ initialCode, onFound, onSwitchToActivate }) {
  const [cardCode, setCardCode] = useState(initialCode)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | not-found

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cardCode.trim() || !phone.trim()) return
    setStatus('loading')
    const data = await fetchPatientFile(cardCode, phone)
    if (data) {
      onFound(cardCode, phone, data)
    } else {
      setStatus('not-found')
    }
  }

  return (
    <form className="medfile__form" onSubmit={handleSubmit}>
      <h2 className="medfile__form-title">عرض ملفي الطبي</h2>

      <label className="medfile__field">
        <span>كود الكارت</span>
        <input
          required
          type="text"
          dir="ltr"
          value={cardCode}
          onChange={(e) => setCardCode(e.target.value)}
          placeholder="مثال: 587lhv"
        />
      </label>

      <label className="medfile__field">
        <span>رقم الموبايل المسجّل</span>
        <input
          required
          type="tel"
          dir="ltr"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="01xxxxxxxxx"
        />
      </label>

      {status === 'not-found' && (
        <p className="medfile__error">
          البيانات دي مش متطابقة مع أي كارت مفعّل. لو الكارت ده أول مرة تستخدمه، سجّل بياناتك الأول.
        </p>
      )}

      <button className="medfile__submit" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'جاري التحقق...' : 'عرض ملفي'}
      </button>

      <button type="button" className="medfile__link-btn" onClick={onSwitchToActivate}>
        الكارت ده أول مرة أستخدمه
      </button>
    </form>
  )
}

function ActivateForm({ initialCode, onDone, onSwitchToView }) {
  const [form, setForm] = useState({
    cardCode: initialCode,
    phone: '',
    name: '',
    gender: '',
    dob: '',
    maritalStatus: '',
    bloodGroup: '',
    address: '',
    emergencyPhone: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | submitting | error-invalid | error-activated | error

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handlePhotoChange = (e) => {
    const f = e.target.files?.[0] || null
    setPhotoFile(f)
    setPhotoPreview(f ? URL.createObjectURL(f) : null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    const photoUrl = await uploadPatientPhoto(photoFile)
    const result = await activatePatientCard({ ...form, photoUrl })

    if (result === 'activated') {
      const data = await fetchPatientFile(form.cardCode, form.phone)
      if (data) onDone(form.cardCode, form.phone, data)
      return
    }
    if (result === 'already_activated') {
      setStatus('error-activated')
      return
    }
    if (result === 'invalid_code') {
      setStatus('error-invalid')
      return
    }
    setStatus('error')
  }

  return (
    <form className="medfile__form" onSubmit={handleSubmit}>
      <h2 className="medfile__form-title">تسجيل كارت جديد</h2>
      <p className="medfile__form-subtitle">
        رقم موبايلك هو المفتاح الوحيد اللي هيفتح ملفك بعد كده — احفظه كويس.
      </p>

      <label className="medfile__field">
        <span>كود الكارت</span>
        <input
          required
          type="text"
          dir="ltr"
          value={form.cardCode}
          onChange={updateField('cardCode')}
          placeholder="مكتوب تحت الـ QR على الكارت"
        />
      </label>

      <label className="medfile__field">
        <span>رقم الموبايل</span>
        <input
          required
          type="tel"
          dir="ltr"
          inputMode="numeric"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
          placeholder="01xxxxxxxxx"
        />
      </label>

      <label className="medfile__field">
        <span>الاسم بالكامل</span>
        <input required type="text" value={form.name} onChange={updateField('name')} placeholder="اسمك بالكامل" />
      </label>

      <label className="medfile__field">
        <span>صورتك الشخصية (اختياري)</span>
        <div className="medfile__photo-picker">
          <span className="medfile__photo-preview">
            {photoPreview ? <img src={photoPreview} alt="" /> : <PersonIcon width={26} height={26} />}
          </span>
          <label className="medfile__photo-btn">
            {photoFile ? 'تغيير الصورة' : 'اختيار صورة'}
            <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </label>
        </div>
      </label>

      <div className="medfile__row">
        <label className="medfile__field">
          <span>النوع</span>
          <select value={form.gender} onChange={updateField('gender')} required>
            <option value="" disabled>
              اختر
            </option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </label>

        <label className="medfile__field">
          <span>تاريخ الميلاد</span>
          <input type="date" value={form.dob} onChange={updateField('dob')} />
        </label>
      </div>

      <div className="medfile__row">
        <label className="medfile__field">
          <span>الحالة الاجتماعية</span>
          <select value={form.maritalStatus} onChange={updateField('maritalStatus')}>
            <option value="">غير محدد</option>
            <option value="أعزب">أعزب</option>
            <option value="متزوج">متزوج</option>
            <option value="مطلق">مطلق</option>
            <option value="أرمل">أرمل</option>
          </select>
        </label>

        <label className="medfile__field">
          <span>فصيلة الدم</span>
          <select value={form.bloodGroup} onChange={updateField('bloodGroup')}>
            <option value="">غير معروفة</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="medfile__field">
        <span>العنوان</span>
        <input type="text" value={form.address} onChange={updateField('address')} placeholder="اختياري" />
      </label>

      <label className="medfile__field">
        <span>رقم للطوارئ</span>
        <input
          type="tel"
          dir="ltr"
          inputMode="numeric"
          value={form.emergencyPhone}
          onChange={(e) => setForm((prev) => ({ ...prev, emergencyPhone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
          placeholder="اختياري"
        />
      </label>

      {status === 'error-invalid' && (
        <p className="medfile__error">كود الكارت مش صحيح، تأكد إنك كتبته زي ما هو مكتوب على الكارت.</p>
      )}
      {status === 'error-activated' && (
        <p className="medfile__error">الكارت ده متسجّل بالفعل. جرّب تدخل بالموبايل اللي سجّلته بيه.</p>
      )}
      {status === 'error' && <p className="medfile__error">حصل خطأ، حاول تاني أو كلّم الخط الساخن 16183.</p>}

      <button className="medfile__submit" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'جاري التسجيل...' : 'تسجيل وعرض ملفي'}
      </button>

      <button type="button" className="medfile__link-btn" onClick={onSwitchToView}>
        سجّلت بياناتي قبل كده
      </button>
    </form>
  )
}

