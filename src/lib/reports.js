// Management report: one Excel workbook for a date range — a summary sheet for
// the review meeting, the most / never requested tests, and one detail sheet
// per admin screen. Built in the browser; exceljs is loaded only when a report
// is actually generated, so it never weighs on the public app.
import { adminFetchReportData } from './admin'
import { fetchAllTests, fetchPackages } from './data'
import { ratingLevel, lowestScore } from './ratings'
import { BRANCH_SLUGS, QR_PLACEMENTS } from '@client/data/branchSlugs'

const BRAND_GREEN = 'FF39B76E'
const LIGHT_GREEN = 'FFE9F8EF'

const MODES = { home: 'زيارة منزلية', branch: 'فرع' }
const SOURCES = { booking_form: 'صفحة الحجز', chat_assistant: 'المساعد الذكي' }
const VISIT_TYPES = { branch: 'فرع', home: 'زيارة منزلية' }
const LEVELS = { low: 'سيء — اتسجلت شكوى', medium: 'مقبول — محتاج متابعة', good: 'كويس' }

// 01094827361 -> 010****7361: enough to tell customers apart and find them in
// the admin, without a leaked file exposing everyone's number.
export function maskPhone(phone) {
  if (!phone) return ''
  const p = String(phone)
  return p.length < 8 ? '****' : `${p.slice(0, 3)}****${p.slice(-4)}`
}

// Excel has no time zones and exceljs writes dates as UTC, so shift to the
// admin's local wall-clock time (Cairo) — otherwise every time shows 2–3h early.
const dateTime = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
}
const countBy = (rows, key) =>
  rows.reduce((acc, r) => {
    const k = (typeof key === 'function' ? key(r) : r[key]) || '—'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
const average = (values) => {
  const nums = values.filter((v) => typeof v === 'number')
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN } }
  row.alignment = { vertical: 'middle', wrapText: true }
  row.height = 22
}

// A plain table sheet: header row + one row per record, RTL, frozen header, filters on.
function addTableSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }))
  styleHeader(sheet.getRow(1))
  rows.forEach((r) => sheet.addRow(r))
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  columns.forEach((c, i) => {
    if (c.date) sheet.getColumn(i + 1).numFmt = 'yyyy-mm-dd hh:mm'
    sheet.getColumn(i + 1).alignment = { vertical: 'top', wrapText: true }
  })
  if (rows.length === 0) sheet.addRow({ [columns[0].key]: 'مفيش بيانات في الفترة دي' })
  return sheet
}

// Summary sheet: small titled blocks of label/value pairs, one after another.
function addSummarySheet(workbook, { fromDate, toDate, data }) {
  const sheet = workbook.addWorksheet('ملخص', { views: [{ rightToLeft: true }] })
  sheet.columns = [{ width: 38 }, { width: 20 }, { width: 16 }, { width: 30 }]

  const title = sheet.addRow([`تقرير Trust Labs — من ${fromDate} إلى ${toDate}`])
  title.font = { bold: true, size: 16, color: { argb: BRAND_GREEN } }
  sheet.addRow([`اتعمل في ${new Date().toLocaleString('ar-EG')}`]).font = { italic: true, color: { argb: 'FF6B7280' } }

  const block = (heading, pairs, cols = ['', 'العدد']) => {
    sheet.addRow([])
    const h = sheet.addRow([heading, ...cols.slice(1)])
    styleHeader(h)
    Object.entries(pairs).forEach(([label, value]) => {
      const row = sheet.addRow([label, ...(Array.isArray(value) ? value : [value])])
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREEN } }
    })
  }

  const { cards, samples, bookings, complaints, ratings, scans } = data

  block('نظرة عامة', {
    'طلبات كارت الثقة': cards.length,
    'عينات اتسجلت': samples.length,
    'حجوزات': bookings.length,
    'شكاوى واقتراحات واستفسارات': complaints.length,
    'تقييمات «قيّم زيارتك»': ratings.length,
    'مسح أكواد QR في الفروع': scans.length,
    'أجهزة مختلفة مسحت كود': new Set(scans.map((s) => s.device_id).filter(Boolean)).size,
  })

  const activeCards = cards.filter((c) => c.status !== 'ملغي')
  block(
    'كارت الثقة',
    {
      'لنفسه': cards.filter((c) => c.for_whom === 'self').length,
      'هدية لشخص تاني': cards.filter((c) => c.for_whom === 'other').length,
      ...Object.fromEntries(Object.entries(countBy(cards, 'status')).map(([k, v]) => [`الحالة: ${k}`, v])),
      'الإيراد المتوقع (من غير الملغي) — جنيه': activeCards.reduce((s, c) => s + Number(c.price || 0), 0),
      'الإيراد من الكروت المفعّلة — جنيه': cards
        .filter((c) => c.status === 'تم التفعيل')
        .reduce((s, c) => s + Number(c.price || 0), 0),
    },
  )

  if (scans.length) {
    block('مسح أكواد QR حسب الفرع', countBy(scans, (s) => BRANCH_SLUGS[s.branch] || s.branch))
    block('مسح أكواد QR حسب المكان', countBy(scans, (s) => QR_PLACEMENTS[s.placement]?.label || s.placement))
  }

  block('العينات حسب الحالة', countBy(samples, 'status'))
  block('العينات حسب الفرع', countBy(samples, 'branch_name'))

  block('الحجوزات', {
    ...Object.fromEntries(Object.entries(countBy(bookings, (b) => MODES[b.mode] || b.mode)).map(([k, v]) => [`النوع: ${k}`, v])),
    ...Object.fromEntries(Object.entries(countBy(bookings, (b) => SOURCES[b.source] || b.source)).map(([k, v]) => [`المصدر: ${k}`, v])),
    'إجمالي قيمة الحجوزات — جنيه': bookings.reduce((s, b) => s + Number(b.total || 0), 0),
  })

  block('الشكاوى حسب النوع', countBy(complaints, 'type'))
  block('الشكاوى حسب الحالة', countBy(complaints, 'status'))
  block('الشكاوى حسب الفرع', countBy(complaints, 'branch_name'))

  const levels = countBy(ratings, (r) => LEVELS[ratingLevel([r.overall, r.speed, r.punctuality, r.staff])])
  block('التقييمات', {
    'متوسط التقييم العام (من 5)': average(ratings.map((r) => r.overall)) ?? '—',
    ...levels,
  })

  // Per branch: the overall average alone hides a 😡 on staff or speed, so the
  // count of low ratings (any answer 😡/😞) sits next to it. Worst branches first.
  const byBranch = {}
  ratings.forEach((r) => {
    const key = r.visit_type === 'home' ? 'زيارة منزلية' : r.branch_name || 'فرع غير محدد'
    const entry = (byBranch[key] ||= { overall: [], low: 0 })
    entry.overall.push(r.overall)
    if (ratingLevel([r.overall, r.speed, r.punctuality, r.staff]) === 'low') entry.low += 1
  })
  block(
    'التقييم لكل فرع',
    Object.fromEntries(
      Object.entries(byBranch)
        .sort((a, b) => b[1].low - a[1].low || average(a[1].overall) - average(b[1].overall))
        .map(([k, v]) => [k, [average(v.overall), v.overall.length, v.low]]),
    ),
    ['', 'متوسط التقييم العام', 'عدد التقييمات', 'تقييمات سيئة (😡/😞 في أي سؤال)'],
  )

  return sheet
}

// Tests/packages named in bookings, ranked. Bookings store names (not codes),
// so names are matched case-insensitively against the catalog for the price.
function testDemand(bookings, catalog) {
  const counts = {}
  bookings.forEach((b) => (Array.isArray(b.tests) ? b.tests : []).forEach((name) => {
    const key = String(name).trim()
    if (key) counts[key] = (counts[key] || 0) + 1
  }))
  const byName = new Map(catalog.map((t) => [t.name.trim().toLowerCase(), t]))
  const requested = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => {
      const match = byName.get(name.toLowerCase())
      return { rank: i + 1, name, kind: match?.kind || 'مش في الكتالوج', count, price: match?.price ?? '' }
    })
  const requestedNames = new Set(Object.keys(counts).map((n) => n.toLowerCase()))
  const neverRequested = catalog
    .filter((t) => !requestedNames.has(t.name.trim().toLowerCase()))
    .map((t) => ({ name: t.name, kind: t.kind, price: t.price }))
  return { requested, neverRequested }
}

function addDemandNote(sheet, text) {
  sheet.spliceRows(1, 0, [text], [])
  const note = sheet.getRow(1)
  note.font = { italic: true, color: { argb: 'FFB45309' } }
  sheet.mergeCells(1, 1, 1, sheet.columnCount)
  note.alignment = { wrapText: true, vertical: 'top' }
  note.height = 36
  sheet.views = [{ rightToLeft: true, state: 'frozen', ySplit: 3 }]
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: sheet.columnCount } }
}

export async function buildManagementReport({ fromDate, toDate, fullPhones = false }) {
  const [{ default: ExcelJS }, data, tests, packages] = await Promise.all([
    import('exceljs'),
    adminFetchReportData(fromDate, toDate),
    fetchAllTests(),
    fetchPackages(),
  ])
  const phone = fullPhones ? (p) => p || '' : maskPhone

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Trust Labs'
  workbook.created = new Date()

  addSummarySheet(workbook, { fromDate, toDate, data })

  const catalog = [
    ...packages.map((p) => ({ name: p.name, price: p.price, kind: 'باقة' })),
    ...tests.map((t) => ({ name: t.name, price: t.price, kind: 'تحليل' })),
  ]
  const { requested, neverRequested } = testDemand(data.bookings, catalog)
  const onlineOnly =
    'ملحوظة: الأرقام دي من الحجوزات الأونلاين (صفحة الحجز والمساعد الذكي) بس — الزيارات المباشرة في الفروع والحجز بالتليفون مش متسجلة هنا. لقرار حملة إعلانية، قارنها بأرقام سيستم المعمل.'

  addDemandNote(
    addTableSheet(
      workbook,
      'التحاليل الأكثر طلبًا',
      [
        { header: 'الترتيب', key: 'rank', width: 10 },
        { header: 'التحليل / الباقة', key: 'name', width: 40 },
        { header: 'النوع', key: 'kind', width: 16 },
        { header: 'عدد مرات الطلب', key: 'count', width: 16 },
        { header: 'السعر (جنيه)', key: 'price', width: 14 },
      ],
      requested,
    ),
    onlineOnly,
  )

  addDemandNote(
    addTableSheet(
      workbook,
      'تحاليل ما اتطلبتش',
      [
        { header: 'التحليل / الباقة', key: 'name', width: 44 },
        { header: 'النوع', key: 'kind', width: 14 },
        { header: 'السعر (جنيه)', key: 'price', width: 14 },
      ],
      neverRequested,
    ),
    `تحاليل وباقات من الكتالوج ما اتطلبتش ولا مرة أونلاين في الفترة دي. ${onlineOnly.replace('ملحوظة: الأرقام دي من', 'المصدر:')}`,
  )

  addTableSheet(
    workbook,
    'كارت الثقة',
    [
      { header: 'التاريخ', key: 'created_at', width: 18, date: true },
      { header: 'صاحب الكارت', key: 'holder', width: 28 },
      { header: 'لمين', key: 'forWhom', width: 14 },
      { header: 'صلة القرابة', key: 'relationship', width: 14 },
      { header: 'الطالب', key: 'buyer', width: 22 },
      { header: 'الموبايل', key: 'phone', width: 16 },
      { header: 'السعر (جنيه)', key: 'price', width: 12 },
      { header: 'الحالة', key: 'status', width: 14 },
    ],
    data.cards.map((c) => ({
      created_at: dateTime(c.created_at),
      holder: c.card_holder_name,
      forWhom: c.for_whom === 'other' ? 'هدية' : 'لنفسه',
      relationship: c.relationship || '',
      buyer: c.for_whom === 'other' ? c.buyer_name : '',
      phone: phone(c.phone),
      price: Number(c.price),
      status: c.status,
    })),
  )

  addTableSheet(
    workbook,
    'العينات',
    [
      { header: 'وقت التسجيل', key: 'created_at', width: 18, date: true },
      { header: 'المريض', key: 'patient', width: 24 },
      { header: 'الموبايل', key: 'phone', width: 16 },
      { header: 'رقم الحجز', key: 'ref', width: 16 },
      { header: 'الفرع', key: 'branch', width: 18 },
      { header: 'الحالة', key: 'status', width: 22 },
      { header: 'آخر تحديث', key: 'updated_at', width: 18, date: true },
      { header: 'ملاحظات', key: 'notes', width: 28 },
    ],
    data.samples.map((s) => ({
      created_at: dateTime(s.created_at),
      patient: s.patient_name,
      phone: phone(s.phone),
      ref: s.booking_ref || '',
      branch: s.branch_name || '',
      status: s.status,
      updated_at: dateTime(s.updated_at),
      notes: s.notes || '',
    })),
  )

  addTableSheet(
    workbook,
    'الحجوزات',
    [
      { header: 'التاريخ', key: 'created_at', width: 18, date: true },
      { header: 'رقم الحجز', key: 'ref', width: 14 },
      { header: 'المصدر', key: 'source', width: 14 },
      { header: 'النوع', key: 'mode', width: 12 },
      { header: 'الاسم', key: 'name', width: 22 },
      { header: 'الموبايل', key: 'phone', width: 16 },
      { header: 'الفرع / العنوان', key: 'place', width: 26 },
      { header: 'الميعاد', key: 'preferred', width: 14 },
      { header: 'التحاليل', key: 'tests', width: 36 },
      { header: 'الإجمالي (جنيه)', key: 'total', width: 12 },
      { header: 'الدفع', key: 'payment', width: 10 },
      { header: 'التأمين / النادي', key: 'insurance', width: 16 },
      { header: 'عرض الإطلاق', key: 'offer', width: 10 },
      { header: 'وصل لـ Trust Lab Ops', key: 'synced', width: 12 },
      { header: 'الحالة', key: 'status', width: 12 },
      { header: 'ملاحظات', key: 'notes', width: 24 },
    ],
    data.bookings.map((b) => ({
      created_at: dateTime(b.created_at),
      ref: b.booking_ref,
      source: SOURCES[b.source] || b.source || '',
      mode: MODES[b.mode] || b.mode || '',
      name: b.name,
      phone: phone(b.phone),
      place: b.mode === 'home' ? b.address || '' : b.branch_name || '',
      preferred: b.preferred_date || '',
      tests: (Array.isArray(b.tests) ? b.tests : []).join('، '),
      total: b.total ?? '',
      payment: b.payment_method || '',
      insurance: b.patient_type && b.patient_type !== 'Normal' ? `${b.patient_type}${b.card_issuer ? ` (${b.card_issuer})` : ''}` : '',
      offer: b.launch_offer_applied ? 'أيوه' : '',
      synced: b.synced_to_erp ? 'أيوه' : 'لسه',
      status: b.status || '',
      notes: b.notes || '',
    })),
  )

  addTableSheet(
    workbook,
    'الشكاوى',
    [
      { header: 'التاريخ', key: 'created_at', width: 18, date: true },
      { header: 'النوع', key: 'type', width: 12 },
      { header: 'الاسم', key: 'name', width: 22 },
      { header: 'الموبايل', key: 'phone', width: 16 },
      { header: 'الفرع', key: 'branch', width: 18 },
      { header: 'التقييم', key: 'rating', width: 10 },
      { header: 'الرسالة', key: 'message', width: 50 },
      { header: 'الحالة', key: 'status', width: 14 },
    ],
    data.complaints.map((c) => ({
      created_at: dateTime(c.created_at),
      type: c.type,
      name: c.name,
      phone: phone(c.phone),
      branch: c.branch_name || '',
      rating: c.rating ?? '',
      message: c.message,
      status: c.status,
    })),
  )

  addTableSheet(
    workbook,
    'التقييمات',
    [
      { header: 'التاريخ', key: 'created_at', width: 18, date: true },
      { header: 'النوع', key: 'type', width: 14 },
      { header: 'الفرع', key: 'branch', width: 18 },
      { header: 'التقييم العام', key: 'overall', width: 10 },
      { header: 'السرعة / الالتزام بالميعاد', key: 'speed', width: 14 },
      { header: 'تعامل الموظفين / الكيميائي', key: 'staff', width: 14 },
      { header: 'أقل تقييم', key: 'lowest', width: 10 },
      { header: 'التصنيف', key: 'level', width: 22 },
      { header: 'الاسم', key: 'name', width: 20 },
      { header: 'الموبايل', key: 'phone', width: 16 },
      { header: 'الكيميائي', key: 'chemist', width: 18 },
      { header: 'التعليق', key: 'comment', width: 40 },
      { header: 'وصل لـ Trust Lab Ops', key: 'synced', width: 12 },
    ],
    data.ratings.map((r) => {
      const scores = [r.overall, r.speed, r.punctuality, r.staff]
      return {
        created_at: dateTime(r.created_at),
        type: VISIT_TYPES[r.visit_type] || r.visit_type,
        branch: r.branch_name || '',
        overall: r.overall,
        speed: r.visit_type === 'home' ? r.punctuality : r.speed,
        staff: r.staff,
        lowest: lowestScore(scores),
        level: LEVELS[ratingLevel(scores)],
        name: r.name || '',
        phone: phone(r.phone),
        chemist: r.chemist_name || '',
        comment: r.comment || '',
        synced: r.synced_to_erp ? 'أيوه' : 'لسه',
      }
    }),
  )

  addTableSheet(
    workbook,
    'مسح الأكواد',
    [
      { header: 'التاريخ', key: 'created_at', width: 18, date: true },
      { header: 'الفرع', key: 'branch', width: 24 },
      { header: 'المكان', key: 'placement', width: 26 },
      { header: 'الصفحة', key: 'path', width: 16 },
    ],
    data.scans.map((s) => ({
      created_at: dateTime(s.created_at),
      branch: BRANCH_SLUGS[s.branch] || s.branch,
      placement: QR_PLACEMENTS[s.placement]?.label || s.placement,
      path: s.path || '',
    })),
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Trust-Labs-Report_${fromDate}_to_${toDate}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return {
    cards: data.cards.length,
    samples: data.samples.length,
    bookings: data.bookings.length,
    complaints: data.complaints.length,
    ratings: data.ratings.length,
    scans: data.scans.length,
  }
}
