import { normalizeArabic } from './similarity.js'

// A transparent checklist (not a prediction of engagement): 7 rules worth 100 points.
const PROMISE_WORDS = ['نضمن', 'مضمون', 'هيشفيك', 'هتشفى', 'علاج نهائي', '100%', 'مفيش خطر']
const CTA_WORDS = ['اسأل', 'اسألي', 'احجز', 'احجزي', 'اتصل', 'اتصلي', 'افحص', 'افحصي', 'اطمّن', 'اطمّني', 'اطمن', 'اطمني']

const filled = (s) => String(s || '').trim().length > 0

export function checkPost(post) {
  const headlineWords = post.headline.trim().split(/\s+/).filter(Boolean).length
  const caption = post.caption.trim()
  const textAll = `${post.headline} ${post.caption} ${post.panelService}`
  const rules = [
    { id: 'headline', pts: 15, ok: headlineWords >= 1 && headlineWords <= 3, tip: 'العنوان لازم يكون من كلمة لـ 3 كلمات.' },
    { id: 'caption', pts: 15, ok: caption.length >= 30 && caption.length <= 220, tip: 'الكابشن يبقى من 30 لـ 220 حرف.' },
    { id: 'cta', pts: 15, ok: CTA_WORDS.some((w) => normalizeArabic(caption).includes(normalizeArabic(w))), tip: 'ضيف دعوة واضحة في الكابشن (اسأل، احجز، اتصل، اطمّن).' },
    { id: 'bullets', pts: 15, ok: post.panelBullets.length === 4 && post.panelBullets.every(filled), tip: 'نص اللوح محتاج 4 نقاط كاملة.' },
    { id: 'tags', pts: 10, ok: post.hashtags.length >= 4 && post.hashtags.length <= 8, tip: 'الهاشتاجات من 4 لـ 8.' },
    { id: 'safe', pts: 15, ok: !PROMISE_WORDS.some((w) => textAll.includes(w)), tip: 'فيه وعد بنتيجة في النص، شيله واستخدم «اطمّن / افحص بدري».' },
    { id: 'concept', pts: 15, ok: post.image.concept.trim().length >= 20, tip: 'فكرة الصورة (concept) قصيرة أو فاضية، اكتب مشهد واضح.' },
  ]
  const score = Math.max(0, Math.min(100, rules.filter((r) => r.ok).reduce((a, r) => a + r.pts, 0)))
  return {
    score,
    checks: rules.map(({ id, ok }) => ({ id, ok })),
    tips: rules.filter((r) => !r.ok).map((r) => r.tip),
  }
}
