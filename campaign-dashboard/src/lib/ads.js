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

const median = (arr) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Competitor response levels (from their posts, not their ad spend, which we cannot see).
export function computeBenchmarks(competitors) {
  const fb = competitors.filter((c) => c.fb).map((c) => ({ name: c.name, value: c.fb.avgReactions })).sort((a, b) => b.value - a.value)
  const top3 = fb.slice(0, 3)
  return {
    fbTop3Avg: top3.length ? Math.round(top3.reduce((a, x) => a + x.value, 0) / top3.length) : 0,
    fbBest: fb[0] ?? null,
    igLikesMedian: median(competitors.filter((c) => c.ig).map((c) => c.ig.avgLikes)),
    reelPlaysMedian: median(competitors.filter((c) => c.ig).map((c) => c.ig.reelPlays)),
  }
}

const OFFER_WORDS = ['خصم', 'عرض', '%', 'زيارة منزلية', 'مجان', 'باقة', 'احجز']
const DAYS_BY_TYPE = { reel: 5, post: 5, carousel: 3, story: 2 }
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)
const fmt = (n) => Number(n).toLocaleString('en-US')

// Full automatic ad plan for a post. Mohamed can edit any value afterwards.
export function recommendAd(post, { category = 'general', benchmarks } = {}) {
  const b = benchmarks ?? { fbTop3Avg: 150, fbBest: null, igLikesMedian: 0, reelPlaysMedian: 0 }
  const text = `${post.headline} ${post.caption} ${post.panelService}`
  const goal = OFFER_WORDS.some((w) => text.includes(w)) ? 'sales' : 'awareness'
  const audience = suggestAudience(category)
  const days = DAYS_BY_TYPE[post.type] ?? 5
  const regions = REGIONS.filter((r) => (goal === 'sales' ? r.tier <= 2 : r.tier === 1)).map((r) => r.id)
  const reasons = [`الهدف: ${goal === 'sales' ? 'مبيعات (البوست فيه عرض أو دعوة للحجز)' : 'وعي (مفيش عرض واضح)'}.`]

  if (post.type === 'story') {
    reasons.push('الاستوري وصوله المدفوع قليل ومحدود للمتابعين، فمش بنمول (اختياري لو عايز).')
    reasons.push('الأرقام قاعدة إرشادية. راجع تكلفة النتيجة في Ads Manager بعد 48 ساعة.')
    return { ad: { ...emptyAd(), days, regions, ageFrom: audience.ageFrom, ageTo: audience.ageTo, gender: audience.gender }, reasons, budget: null }
  }

  let factor = 1
  if (post.platform === 'facebook') {
    factor = clamp(b.fbTop3Avg / 150, 0.8, 1.3)
    reasons.push(
      `على فيسبوك أقوى 3 منافسين متوسطهم ${fmt(b.fbTop3Avg)} تفاعل للبوست${b.fbBest ? ` (الأعلى ${b.fbBest.name}: ${fmt(b.fbBest.value)})` : ''}. كل ما الاستجابة العضوية عندهم أعلى، محتاجين دفعة مدفوعة أكبر، فوزّنت الميزانية ×${Math.round(factor * 100) / 100}.`,
    )
  } else if (post.type === 'reel') {
    reasons.push(`ريلات المنافسين على انستجرام متوسطها ${fmt(Math.round(b.reelPlaysMedian))} مشاهدة (الوسيط)، والريل هو الأقدر على الوصول، فالميزانية من غير تخفيض.`)
  } else {
    factor = 0.8
    reasons.push(`صور وبوستات انستجرام عند المنافسين متوسطها ${Math.round(b.igLikesMedian)} لايك بس (وسيط)، فاستجابتها ضعيفة وخفّضت الميزانية ×0.8.`)
  }
  reasons.push('حجم تمويل المنافسين الفعلي مش ظاهر لنا (بنشوف استجابة بوستاتهم بس).')

  const budget = suggestBudget({ postType: post.type, goal, days, regions, season: seasonFor(post.date) })
  reasons.push(...budget.basis)
  reasons.push('الأرقام قاعدة إرشادية. راجع تكلفة النتيجة في Ads Manager بعد 48 ساعة.')
  const total = round50(budget.total * factor)
  return {
    ad: { enabled: true, budget: total, days, regions, ageFrom: audience.ageFrom, ageTo: audience.ageTo, gender: audience.gender },
    reasons,
    budget: { ...budget, total },
  }
}

const PLATFORM_AR = { facebook: 'فيسبوك', instagram: 'انستجرام', tiktok: 'تيك توك' }
const TYPE_AR = { post: 'بوست', reel: 'ريل', carousel: 'كاروسيل', story: 'استوري' }
const GENDER_AR = { all: 'الكل', male: 'رجال', female: 'ستات' }

// Plain-text brief to paste next to Meta Ads Manager (the dashboard does not publish ads itself).
export function buildAdBrief(post, ad) {
  const head = `${post.headline} — ${TYPE_AR[post.type] ?? post.type} على ${PLATFORM_AR[post.platform] ?? post.platform} (${post.date} ${post.time})`
  if (!ad?.enabled) return `${head}\nالإعلان: مش ممول.`
  return [
    head,
    `الميزانية الإجمالية: ${ad.budget ?? 'غير محددة'} جنيه لمدة ${ad.days} أيام`,
    `المناطق: ${ad.regions.join('، ')}`,
    `السن: ${ad.ageFrom} إلى ${ad.ageTo}`,
    `الجنس: ${GENDER_AR[ad.gender] ?? ad.gender}`,
    'الرفع: من Meta Ads Manager (أو Business Suite)، اختار نفس المنشور واستهدف بالإعدادات دي.',
  ].join('\n')
}
