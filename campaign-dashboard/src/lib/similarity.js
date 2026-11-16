export function normalizeArabic(s) {
  return String(s)
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim()
}

const tokens = (s) => new Set(normalizeArabic(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean))

export function similarity(a, b) {
  const A = tokens(a)
  const B = tokens(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

export function findSimilarIdeas(idea, existing, threshold = 0.6) {
  return existing.filter((e) => similarity(idea, e) >= threshold)
}
