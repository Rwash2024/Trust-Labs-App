// Paid-ad settings: regions come from Trust Labs' real branches; budget anchors on Mohamed's own
// per-post boost amounts (2026-11-10 plan). The suggestion is a transparent rule of thumb, not a
// forecast: calibrate with the real cost per result in Ads Manager after the first 48 hours.

// tier 1 = المهندسين + التجمع الخامس (60% of budget), tier 2 = Dokki/Manial/Giza/Heliopolis/Nasr City (25%), tier 3 = the rest (15%)
export const REGIONS = [
  { id: 'المهندسين', governorate: 'الجيزة', tier: 1 },
  { id: 'التجمع الخامس', governorate: 'القاهرة', tier: 1 },
  { id: 'الدقي', governorate: 'الجيزة', tier: 2 },
  { id: 'المنيل', governorate: 'الجيزة', tier: 2 },
  { id: 'الجيزة', governorate: 'الجيزة', tier: 2 },
  { id: 'مصر الجديدة', governorate: 'القاهرة', tier: 2 },
  { id: 'مدينة نصر', governorate: 'القاهرة', tier: 2 },
  { id: 'شبرا', governorate: 'القاهرة', tier: 3 },
  { id: 'حلوان', governorate: 'القاهرة', tier: 3 },
  { id: 'فيصل', governorate: 'الجيزة', tier: 3 },
  { id: 'أكتوبر', governorate: 'الجيزة', tier: 3 },
  { id: 'الشيخ زايد', governorate: 'الجيزة', tier: 3 },
  { id: 'الفيوم', governorate: 'الفيوم', tier: 3 },
  { id: 'بني سويف', governorate: 'بني سويف', tier: 3 },
  { id: 'الغردقة', governorate: 'الغردقة', tier: 3 },
  { id: 'شرم الشيخ', governorate: 'شرم الشيخ', tier: 3 },
]

const TIER_WEIGHT = { 1: 0.6, 2: 0.25, 3: 0.15 }
export const GENDERS = ['all', 'male', 'female']

export function emptyAd() {
  return { enabled: false, budget: null, days: 7, regions: [], ageFrom: 25, ageTo: 55, gender: 'all' }
}

export function validateAd(ad) {
  if (!ad || typeof ad !== 'object') return { ok: false, message: 'بيانات الإعلان مش سليمة.' }
  if (ad.budget !== null && ad.budget !== undefined && !(typeof ad.budget === 'number' && Number.isFinite(ad.budget) && ad.budget >= 0)) {
    return { ok: false, message: 'الميزانية لازم تكون رقم من صفر أو أكتر (أو سيبها فاضية).' }
  }
  if (!Number.isInteger(ad.days) || ad.days < 1 || ad.days > 30) return { ok: false, message: 'مدة الإعلان من 1 لـ 30 يوم.' }
  if (!Number.isInteger(ad.ageFrom) || !Number.isInteger(ad.ageTo) || ad.ageFrom < 18 || ad.ageTo > 65) {
    return { ok: false, message: 'السن بين 18 و65.' }
  }
  if (ad.ageFrom > ad.ageTo) return { ok: false, message: 'السن (من) لازم يكون أصغر من السن (إلى).' }
  if (!GENDERS.includes(ad.gender)) return { ok: false, message: 'اختار الجنس: الكل أو رجال أو ستات.' }
  if (!Array.isArray(ad.regions) || ad.regions.some((r) => !REGIONS.some((x) => x.id === r))) {
    return { ok: false, message: 'فيه منطقة مش من فروعنا.' }
  }
  if (ad.enabled && ad.regions.length === 0) return { ok: false, message: 'اختار منطقة واحدة على الأقل.' }
  return { ok: true }
}

const AUDIENCES = {
  heart: { ageFrom: 40, ageTo: 65, gender: 'all', why: 'مخاطر القلب والضغط بتزيد بعد الأربعين، والقرار غالبًا مشترك.' },
  thyroid: { ageFrom: 25, ageTo: 50, gender: 'female', why: 'اضطرابات الغدة الدرقية أكتر عند الستات في الفئة دي (فرضية نختبرها).' },
  pregnancy: { ageFrom: 22, ageTo: 38, gender: 'female', why: 'الفئة الأكتر احتمالًا للحمل والفحوصات المبكرة.' },
  diabetes: { ageFrom: 35, ageTo: 65, gender: 'all', why: 'الفحص الدوري للسكر يبدأ غالبًا من 35 سنة.' },
  general: { ageFrom: 25, ageTo: 55, gender: 'all', why: 'جمهور عام للفحص الشامل والباقات. جرّب تقسيمه ستات ورجال وقارن.' },
}

export function suggestAudience(category) {
  return { ...(AUDIENCES[category] || AUDIENCES.general) }
}

// per-post boost amounts set by Mohamed: reel 600 / offer post 850 / carousel 450 / Q&A (story) 200
const BASE = {
  sales: { post: 850, reel: 600, carousel: 450, story: 200 },
  awareness: { post: 450, reel: 600, carousel: 450, story: 200 },
}

const round50 = (n) => Math.round(n / 50) * 50

const RULES = [
  'بعد 48 ساعة: قارن تكلفة الرسالة (أو الحجز) لكل منطقة. زوّد ميزانية المناطق الأرخص حوالي 20%، وقلّل الأغلى.',
  'لو نسبة النقر (CTR) أقل من 0.8% بعد 3 أيام: غيّر الصورة أو العنوان قبل ما تزوّد الميزانية.',
  'لو التكرار (Frequency) فوق 3: وسّع الفئة العمرية أو المناطق بدل ما تفضل تضرب نفس الناس.',
  'لو الإعلان ماجابش حجوزات بعد 5 أيام: وقّفه وراجع العرض نفسه مش الميزانية.',
  'الأرقام هنا قواعد إرشادية. الأساس تكلفة النتيجة الفعلية من Ads Manager.',
]

export function suggestBudget({ postType, goal = 'sales', days = 7, regions = [], season = 'normal' }) {
  const base = (BASE[goal] || BASE.sales)[postType] ?? BASE.sales.post
  const seasonMult = season === 'high' ? 1.5 : 1
  const extra = Math.min(Math.max(regions.length - 2, 0), 4)
  const regionMult = 1 + 0.25 * extra
  const dayMult = Math.min(Math.max(days / 7, 0.5), 2)
  const total = round50(base * seasonMult * regionMult * dayMult)

  // split by Mohamed's 60/25/15 tiers, normalised over the tiers actually selected
  const picked = regions.map((id) => REGIONS.find((r) => r.id === id)).filter(Boolean)
  const tiers = [...new Set(picked.map((r) => r.tier))]
  const weightSum = tiers.reduce((a, t) => a + TIER_WEIGHT[t], 0)
  let split = picked.map((r) => {
    const inTier = picked.filter((x) => x.tier === r.tier).length
    return { region: r.id, tier: r.tier, amount: Math.round(((TIER_WEIGHT[r.tier] / weightSum) / inTier) * total) }
  })
  if (split.length) {
    const diff = total - split.reduce((a, x) => a + x.amount, 0)
    split[0] = { ...split[0], amount: split[0].amount + diff }
  }

  const basis = [
    `نقطة البداية: ${base} جنيه (مبلغ ${postType === 'story' ? 'الاستوري' : postType === 'reel' ? 'الريل' : postType === 'carousel' ? 'الكاروسيل' : goal === 'sales' ? 'بوست العروض' : 'البوست'} اللي حددته).`,
    season === 'high'
      ? 'موسم مرتفع (Black Friday / رمضان): ×1.5 لأن المنافسة بتغلّي تكلفة الألف ظهور، وألفا وعز لاب والبرج بيعلنوا عروض على فيسبوك.'
      : 'موسم عادي: من غير زيادة.',
    `عدد المناطق ${regions.length}: ×${regionMult} (كل منطقة زيادة عن اتنين بتضيف 25%، بحد أقصى +100%).`,
    `المدة ${days} أيام: ×${Math.round(dayMult * 100) / 100} (القاعدة لأسبوع، من نص لضعف).`,
  ]
  return { total, perDay: Math.round(total / days), min: round50(total * 0.7), max: round50(total * 1.5), split, basis, rules: RULES }
}

// Black Friday window drives the high-season multiplier (competitors push offers then too).
export function seasonFor(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  if (!m) return 'normal'
  const md = Number(m[2]) * 100 + Number(m[3])
  return md >= 1120 && md <= 1202 ? 'high' : 'normal'
}
