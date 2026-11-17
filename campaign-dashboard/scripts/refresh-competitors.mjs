// Rebuilds the numbers in src/data/competitors.json from raw competitor posts.
//
//   node scripts/refresh-competitors.mjs <rawDir> [YYYY-MM-DD] [--dry] [--out file.json]
//
// <rawDir> holds one JSON file per competitor and platform, named exactly like the competitor:
//   المختبر.ig.json   (Instagram posts)      المختبر.fb.json   (Facebook posts)
// Each file is an array of posts, or an array / object of pages with an "items" or "posts" list (as the provider returns them).
// Only numbers and the pull date change. Notes, insights, handles and data quality are hand-written and stay as they are.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { applyRefresh } from '../src/lib/competitorStats.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataFile = path.join(here, '..', 'src', 'data', 'competitors.json')

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const outIndex = args.indexOf('--out')
const outFile = outIndex !== -1 ? args[outIndex + 1] : dataFile
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out')
const [rawDir, dateArg] = positional
const pulledAt = dateArg ?? new Date().toISOString().slice(0, 10)

if (!rawDir || !/^\d{4}-\d{2}-\d{2}$/.test(pulledAt)) {
  console.error('الاستخدام: node scripts/refresh-competitors.mjs <مجلد البيانات الخام> [YYYY-MM-DD] [--dry] [--out ملف.json]')
  process.exit(1)
}

const itemsOf = (json) => {
  const pages = Array.isArray(json) ? json : [json]
  return pages.flatMap((p) => p?.items ?? p?.posts ?? p?.data?.items ?? p?.data?.posts ?? (p?.id ? [p] : []))
}

const results = { ig: {}, fb: {} }
for (const file of readdirSync(rawDir)) {
  const m = file.match(/^(.+)\.(ig|fb)\.json$/)
  if (!m) continue
  results[m[2]][m[1]] = itemsOf(JSON.parse(readFileSync(path.join(rawDir, file), 'utf8')))
}

const data = JSON.parse(readFileSync(dataFile, 'utf8'))
const known = new Set(data.competitors.map((c) => c.name))
for (const name of new Set([...Object.keys(results.ig), ...Object.keys(results.fb)])) {
  if (!known.has(name)) console.warn(`تنبيه: «${name}» مش في competitors.json، اتجاهلته.`)
}

const next = applyRefresh(data, results, pulledAt)

for (const c of next.competitors) {
  const old = data.competitors.find((x) => x.name === c.name)
  const line = (label, a, b) => (JSON.stringify(a) === JSON.stringify(b) ? null : `  ${label}: ${JSON.stringify(a)} ← ${JSON.stringify(b)}`)
  const diffs = [line('ig', old.ig, c.ig), line('fb', old.fb, c.fb)].filter(Boolean)
  console.log(`${c.name}: ${diffs.length ? '' : 'من غير تغيير (مفيش بيانات جديدة)'}`)
  diffs.forEach((d) => console.log(d))
}

if (flag('--dry')) {
  console.log('\n(--dry) مفيش حاجة اتكتبت.')
} else {
  writeFileSync(outFile, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`\nاتكتب ${outFile} · تاريخ السحب ${pulledAt}`)
  console.log('افتكر: راجع sample.notes و insights بإيدك، لأن فيها أرقام قديمة ممكن تتغيّر.')
}
