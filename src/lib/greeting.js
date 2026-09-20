// Detects a message that is *only* a greeting ("السلام عليكم", "hi", "صباح الخير يا معمل").
// A greeting followed by a real question is not a greeting — that still goes to the assistant.

// Words that make a message a greeting (written in normalized form, see normalize()).
const GREETING_WORDS = new Set([
  'هاي', 'هلا', 'هلو', 'ياهلا', 'مرحبا', 'مرحبتين', 'اهلا', 'اهلين', 'وسهلا',
  'سلام', 'السلام', 'وعليكم', 'صباح', 'مساء', 'ازيك', 'ازيكم', 'كيفك', 'عامل', 'عاملين',
  'hi', 'hello', 'hey', 'hola', 'salam', 'good', 'morning', 'evening', 'afternoon', 'how',
])

// Words allowed to accompany a greeting without turning it into a question.
const FILLER_WORDS = new Set([
  'عليكم', 'ورحمه', 'الله', 'وبركاته', 'الخير', 'النور', 'ايه', 'يا', 'بيك', 'بيكم',
  'حضرتك', 'دكتور', 'دكتوره', 'ترست', 'تراست', 'لاب', 'لابز', 'معمل', 'المعمل', 'والله',
  'جدا', 'كلكم', 'الجميع', 'فريق', 'تمام', 'الحمد', 'لله', 'ليكم', 'لكم', 'you', 'are', 'there', 'trust', 'labs', 'lab',
])

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // harakat + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/(.)\1{2,}/g, '$1') // "هاااي" -> "هاي"
    .replace(/[^ء-يa-z0-9]+/g, ' ') // punctuation / emoji -> space
    .trim()
}

export function isGreeting(text) {
  const words = normalize(text).split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 8) return false
  if (!words.some((w) => GREETING_WORDS.has(w))) return false
  return words.every((w) => GREETING_WORDS.has(w) || FILLER_WORDS.has(w))
}
