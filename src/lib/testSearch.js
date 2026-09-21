import { normalize } from './greeting'

// Test names in the catalog are English, so common Arabic names map to English keywords.
// Keys are in normalized form (see normalize()); longer keys come first so they win.
export const ARABIC_ALIASES = [
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


const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const hasTerm = (name, term) => new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, 'i').test(name)

// English catalog terms that an Arabic (or English-abbreviation) query stands for.
export function aliasTermsFor(query) {
  const q = normalize(query)
  const terms = new Set()
  for (const [key, list] of ARABIC_ALIASES) if (q.includes(key)) list.forEach((t) => terms.add(t))
  return [...terms]
}

// Shared test search for the app: plain name match, plus Arabic names / abbreviations
// (e.g. "فيتامين د", "سكر", "CBC") mapped to the catalog's English names.
export function filterTests(allTests, query, limit) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const byName = allTests.filter((t) => t.name.toLowerCase().includes(q))
  const terms = aliasTermsFor(query)
  if (terms.length === 0) return byName.slice(0, limit)
  const byAlias = allTests.filter((t) => terms.some((term) => hasTerm(t.name, term)))
  const seen = new Set()
  return [...byName, ...byAlias].filter((t) => !seen.has(t.code) && seen.add(t.code)).slice(0, limit)
}
