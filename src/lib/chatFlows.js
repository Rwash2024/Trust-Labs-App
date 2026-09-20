import { fetchPackages, fetchFeaturedTests, fetchBranchGroups, fetchSampleStatusByPhone, searchTests } from './data'
import { normalize } from './greeting'

// Rule-based answers for the chat widget's quick-action buttons. These read
// straight from the same tables as the app pages, so they work without the AI
// assistant (and keep working if the AI is unavailable).

export const RESULTS_PORTAL_URL = 'http://webresults.trustlabseg.com/Login/Index/?Type=Individual'
export const HOTLINE = '16183'
export const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/

export function normalizeDigits(text) {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

// A flow result: { text, link?: { to | href, label }, awaiting?: 'track_phone' }
export const QUICK_ACTIONS = [
  { id: 'track', label: '📦 تتبع عينتي' },
  { id: 'results', label: '🧪 نتيجة تحليلي' },
  { id: 'booking', label: '📅 حجز موعد' },
  { id: 'prices', label: '💳 أسعار التحاليل والباقات' },
  { id: 'featured', label: '⭐ التحاليل المميزة' },
  { id: 'branches', label: '📍 الفروع' },
  { id: 'prep', label: '📋 تعليمات التحضير' },
  { id: 'complaint', label: '📝 تقديم شكوى' },
]

const price = (n) => `${n} جنيه`

export const FLOWS = {
  track: async () => ({
    text: 'اكتب رقم موبايلك اللي سجّلت بيه الحجز (11 رقم) وأشوفلك حالة العينة 📱',
    awaiting: 'track_phone',
  }),

  results: async () => ({
    text: 'نتيجة تحليلك بتشوفها من بوابة النتائج الرسمية بالرقم السري اللي اتسلّمتلك 🔒',
    link: { href: RESULTS_PORTAL_URL, label: 'افتح بوابة النتائج' },
  }),

  booking: async () => ({
    text: 'تقدر تحجز زيارة منزلية أو تحجز في أقرب فرع من صفحة الحجز، وهتلاقي فيها كل التحاليل والباقات 📅',
    link: { to: '/booking', label: 'اذهب لصفحة الحجز' },
  }),

  prices: async () => ({
    text: 'اكتب اسم التحليل اللي عايز تعرف سعره (زي: فيتامين د، سكر، CBC، TSH) وأقولك السعر 💳\nولو عايز تشوف كل الباقات اكتب "الباقات".',
    link: { to: '/packages', label: 'شوف كل الباقات' },
    awaiting: 'price_query',
  }),

  featured: async () => {
    const tests = await fetchFeaturedTests()
    const lines = tests.map((t) => `• ${t.name} — ${price(t.price)}`)
    return {
      text: `التحاليل المميزة ⭐\n${lines.join('\n')}`,
      link: { to: '/booking', label: 'احجز الآن' },
    }
  },

  branches: async () => {
    const groups = await fetchBranchGroups()
    return { text: 'اختار المحافظة عشان أوريك فروعها 📍', choices: governorateChoices(groups) }
  },

  prep: async () => ({
    text: 'تعليمات التحضير قبل كل تحليل (زي الصيام) موجودة في صفحة شروط التحاليل 📋',
    link: { to: '/prep-instructions', label: 'شوف التعليمات' },
  }),

  complaint: async () => ({
    text: 'يهمنا نسمع منك 🙏 تقدر تسجّل شكوى أو اقتراح، وفريق الجودة هيتواصل معاك.',
    link: { to: '/complaints', label: 'سجّل شكوى أو اقتراح' },
  }),
}

// ---- Branches by governorate ----------------------------------------------

function governorateChoices(groups) {
  return [
    ...groups.map((g) => ({ label: `${g.governorate} (${g.list.length})`, kind: 'governorate', value: g.governorate })),
    { label: '🏠 القائمة الرئيسية', kind: 'menu' },
  ]
}

// One card per branch: address, phone, hours, plus location / call / WhatsApp buttons.
export async function branchesByGovernorate(governorate) {
  const groups = await fetchBranchGroups()
  const group = groups.find((g) => g.governorate === governorate)
  if (!group) return { intro: 'مش لاقي فروع للمحافظة دي 🤔', cards: [], choices: governorateChoices(groups) }

  const cards = group.list.map((b) => ({
    text: [`🏥 ${b.name}`, `📍 ${b.address}`, b.phone ? `📞 ${b.phone}` : null, b.hours ? `🕒 ${b.hours}` : null]
      .filter(Boolean)
      .join('\n'),
    links: [
      { href: b.mapsUrl, label: '📍 الموقع على الخريطة' },
      b.phone ? { href: `tel:${b.phone}`, label: '📞 اتصال' } : null,
      b.phone ? { href: b.whatsappUrl, label: '💬 واتساب' } : null,
    ].filter(Boolean),
  }))
  return {
    intro: `فروع ${governorate} 📍`,
    cards,
    choices: governorateChoices(groups),
  }
}

export async function trackSampleByPhone(phone) {
  const rows = await fetchSampleStatusByPhone(phone)
  if (rows.length === 0) {
    return { text: `مفيش حجز مسجّل بالرقم ده.\nتأكد إنه صح، أو كلّم الخط الساخن ${HOTLINE}.` }
  }
  const blocks = rows.slice(0, 3).map((r) =>
    [
      `👤 ${r.patient_name}`,
      r.booking_ref ? `🔖 رقم الحجز: ${r.booking_ref}` : null,
      `📌 الحالة: ${r.status}`,
      `🕒 آخر تحديث: ${new Date(r.updated_at).toLocaleString('ar-EG')}`,
    ]
      .filter(Boolean)
      .join('\n'),
  )
  return {
    text: blocks.join('\n\n'),
    link: { to: '/track-sample', label: 'تفاصيل التتبع' },
  }
}

// ---- Price lookup ---------------------------------------------------------

async function packagesFlow() {
  const packages = await fetchPackages()
  const lines = packages.map((p) => `• ${p.name} — ${price(p.price)}${p.testCount ? ` (${p.testCount} تحليل)` : ''}`)
  return {
    text: `الباقات المتاحة دلوقتي 💳\n${lines.join('\n')}`,
    link: { to: '/packages', label: 'شوف تفاصيل الباقات' },
    awaiting: 'price_query',
  }
}

// Test names in the catalog are English, so common Arabic names map to English keywords.
// Keys are in normalized form (see normalize()); longer keys come first so they win.
const ARABIC_ALIASES = [
  ['فيتامين د', ['vitamin d']],
  ['فيتامين ب12', ['vitamin b12', 'b12']],
  ['ب12', ['vitamin b12', 'b12']],
  ['سكر تراكمي', ['hba1c', 'glycosylated', 'glycated']],
  ['هيموجلوبين سكري', ['hba1c', 'glycosylated', 'glycated']],
  ['سكر', ['glucose']],
  ['جلوكوز', ['glucose']],
  ['صوره دم', ['complete blood picture']],
  ['cbc', ['complete blood picture']],
  ['cbp', ['complete blood picture']],
  ['وظايف كبد', ['sgpt', 'sgot', 'bilirubin']],
  ['وظائف كبد', ['sgpt', 'sgot', 'bilirubin']],
  ['انزيمات كبد', ['sgpt', 'sgot']],
  ['كبد', ['sgpt', 'sgot', 'bilirubin']],
  ['وظايف كلي', ['creatinine', 'urea']],
  ['وظائف كلي', ['creatinine', 'urea']],
  ['كلي', ['creatinine', 'urea']],
  ['كرياتينين', ['creatinine']],
  ['يوريا', ['urea']],
  ['بولينا', ['urea']],
  ['حمض اليوريك', ['uric acid']],
  ['غده درقيه', ['tsh', 't3', 't4']],
  ['درقيه', ['tsh', 't3', 't4']],
  ['كوليسترول', ['cholesterol']],
  ['دهون', ['triglycerides', 'cholesterol']],
  ['حديد', ['iron', 'ferritin']],
  ['فيريتين', ['ferritin']],
  ['حمل', ['hcg', 'pregnancy']],
  ['كالسيوم', ['calcium']],
  ['صوديوم', ['sodium']],
  ['بوتاسيوم', ['potassium']],
  ['بروستاتا', ['psa']],
  ['كورتيزول', ['cortisol']],
  ['تستوستيرون', ['testosterone']],
  ['بروجسترون', ['progesterone']],
  ['برولاكتين', ['prolactin']],
  ['براز', ['stool']],
]

// Words that don't help identify a test ("سعر تحليل الكبد" -> "كبد").
const STOP_WORDS = new Set([
  'سعر', 'اسعار', 'بكام', 'كام', 'تحليل', 'تحاليل', 'عايز', 'عاوز', 'اعرف', 'ايه', 'عن', 'في', 'ده', 'دي',
  'لو', 'سمحت', 'ممكن', 'هو', 'هي', 'price', 'of', 'the', 'test', 'how', 'much', 'is',
])
const PACKAGE_WORDS = new Set(['باقات', 'باقه', 'الباقات', 'الباقه', 'كل', 'العروض'])

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasTerm = (name, term) => new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, 'i').test(name)
const stripAl = (w) => (w.startsWith('ال') && w.length > 3 ? w.slice(2) : w)

const MAX_RESULTS = 8

// Answers "how much is X?" from the packages and the test catalog. Returns null when
// nothing matched and the message looks like a real question (so the assistant can take it).
export async function priceLookup(query) {
  const q = normalize(query)
  const words = q.split(/\s+/).filter(Boolean)
  const keywords = words.filter((w) => !STOP_WORDS.has(w))

  if (keywords.length > 0 && keywords.length <= 3 && keywords.every((w) => PACKAGE_WORDS.has(w))) {
    return packagesFlow()
  }

  const results = []

  // 1) Packages by (Arabic) name
  const packages = await fetchPackages()
  const pkgWords = keywords.map(stripAl).filter((w) => w.length >= 2)
  const pkgMatches = pkgWords.length
    ? packages.filter((p) => {
        const name = normalize(p.name)
        return pkgWords.every((w) => name.includes(w))
      })
    : []
  for (const p of pkgMatches) results.push(`📦 ${p.name} — ${price(p.price)}${p.testCount ? ` (${p.testCount} تحليل)` : ''}`)

  // 2) Tests: Arabic aliases first, else English words typed by the patient
  const aliasTerms = new Set()
  for (const [key, terms] of ARABIC_ALIASES) if (q.includes(key)) terms.forEach((t) => aliasTerms.add(t))

  let tests = []
  if (aliasTerms.size > 0) {
    const found = await searchTests([...aliasTerms], 'any')
    tests = found.filter((t) => [...aliasTerms].some((term) => hasTerm(t.name, term)))
  } else {
    const latin = keywords.filter((w) => /[a-z]/.test(w))
    if (latin.length > 0) tests = await searchTests(latin, 'all')
  }
  // Most-requested tests first, then the simpler (shorter) names.
  tests.sort((a, b) => Number(!!b.popular) - Number(!!a.popular) || a.name.length - b.name.length)
  const shown = tests.slice(0, MAX_RESULTS)
  for (const t of shown) results.push(`🧪 ${t.name} — ${price(t.price)}`)
  const more = tests.length - shown.length

  if (results.length === 0) {
    if (words.length > 4) return null
    return {
      text: `مش لاقي تحليل أو باقة بالاسم ده 🤔\nجرّب اسم تاني (بالعربي أو الإنجليزي)، أو كلّم الخط الساخن ${HOTLINE} وهيقولوك السعر.`,
      link: { to: '/packages', label: 'ابحث في كل التحاليل' },
      awaiting: 'price_query',
    }
  }

  const moreLine = more > 0 ? `\n… و${more} نتيجة تانية، اكتب اسم أدق لو عايز تحليل معين` : ''
  return {
    text: `${results.join('\n')}${moreLine}\n\nتقدر تكتب اسم تحليل تاني، أو تختار من القائمة.`,
    link: { to: '/booking', label: 'احجز الآن' },
    awaiting: 'price_query',
  }
}
