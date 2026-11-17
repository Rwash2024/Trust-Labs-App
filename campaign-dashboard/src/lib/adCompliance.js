import { normalizeArabic } from './similarity.js'

// Rule-of-thumb check of ad wording against Meta's health & wellness rules and the agreed discount range.
// Heuristic only: a clean result is not an approval from Meta or from management.

const CLAIM_WORDS = ['بيشفيك', 'هيشفيك', 'هتشفى', 'شفاء', 'علاج', 'بيعالج', 'يعالج', 'تشخيص نهائي']
const PERSONAL_MARKERS = ['عندك', 'بتعاني', 'تعاني', 'مصاب', 'انت مريض']
const CONDITION_WORDS = ['سكر', 'ضغط', 'سرطان', 'قلب', 'اكتئاب', 'عقم', 'كوليسترول', 'كبد', 'سمنه', 'غدة']
const FEAR_WORDS = ['تموت', 'خطر على حياتك', 'مرض خطير', 'قاتل']
const BEFORE_AFTER = ['قبل وبعد', 'قبل و بعد']
const SELF_IMAGE = ['وزنك', 'كرشك', 'تخين', 'شكلك تعبان', 'شكلك وحش', 'جسمك وحش', 'انت فاشل']
export const MAX_AGREED_DISCOUNT = 15

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toLatinDigits = (s) => s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))

const has = (text, words) => words.some((w) => text.includes(normalizeArabic(w)))

function discounts(text) {
  const found = []
  const re = /خصم\s*(?:حتي|لحد|يصل الي)?\s*(\d{1,3})\s*%|(\d{1,3})\s*%\s*خصم/g
  for (const m of text.matchAll(re)) found.push(Number(m[1] ?? m[2]))
  return found
}

export function checkAdCopy(post) {
  const raw = [post.headline, post.caption, post.panelService, ...(post.panelBullets ?? [])].filter(Boolean).join(' ')
  const text = toLatinDigits(normalizeArabic(raw))
  const issues = []

  if (has(text, CLAIM_WORDS)) {
    issues.push({ id: 'claim', message: 'فيه وعد بعلاج أو شفاء أو تشخيص نهائي. ميتا بترفض ده في الإعلانات الصحية، استخدم «اطمّن» و«افحص بدري».' })
  }
  if (has(text, PERSONAL_MARKERS) && has(text, CONDITION_WORDS)) {
    issues.push({ id: 'personal', message: 'الكلام موجّه للقارئ كأنه عنده مرض معين (مثلًا «عندك سكر؟»). ميتا بتمنع ده، اكتبه بصيغة عامة.' })
  }
  if (has(text, FEAR_WORDS)) {
    issues.push({ id: 'fear', message: 'فيه تخويف من المرض أو الموت. خفّف الصياغة وخليها طمأنة.' })
  }
  if (has(text, SELF_IMAGE)) {
    issues.push({ id: 'selfimage', message: 'الكلام بيخاطب القارئ عن وزنه أو شكله. ميتا بتمنع اللي بيحسّس الناس بصورة سلبية عن نفسهم، اكتبه بصيغة عامة (مثلًا «الوزن والطاقة»).' })
  }
  if (has(text, BEFORE_AFTER)) {
    issues.push({ id: 'beforeafter', message: '«قبل وبعد» في الإعلانات الصحية ممنوعة عند ميتا.' })
  }
  const over = discounts(text).filter((d) => d > MAX_AGREED_DISCOUNT)
  if (over.length) {
    issues.push({ id: 'discount', message: `الخصم ${Math.max(...over)}% أعلى من المتفق عليه (${MAX_AGREED_DISCOUNT}%). محتاج موافقة جديدة من الإدارة.` })
  }
  return { issues }
}
