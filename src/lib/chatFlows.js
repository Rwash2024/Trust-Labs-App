import { fetchPackages, fetchFeaturedTests, fetchBranchGroups, fetchSampleStatusByPhone } from './data'

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
  { id: 'packages', label: '💳 الأسعار والباقات' },
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

  packages: async () => {
    const packages = await fetchPackages()
    const lines = packages.map((p) => `• ${p.name} — ${price(p.price)}${p.testCount ? ` (${p.testCount} تحليل)` : ''}`)
    return {
      text: `الباقات المتاحة دلوقتي 💳\n${lines.join('\n')}`,
      link: { to: '/packages', label: 'شوف تفاصيل الباقات' },
    }
  },

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
    const count = (n) => (n === 1 ? 'فرع واحد' : n === 2 ? 'فرعين' : n <= 10 ? `${n} فروع` : `${n} فرع`)
    const lines = groups.map((g) => `• ${g.governorate}: ${count(g.list.length)}`)
    return {
      text: `فروعنا 📍\n${lines.join('\n')}\n\nتفاصيل كل فرع (العنوان والمواعيد والموقع) في صفحة الفروع.`,
      link: { to: '/branches', label: 'شوف كل الفروع' },
    }
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
