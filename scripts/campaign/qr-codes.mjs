// In-branch campaign: one QR code per branch × spot (19 × 5 = 95), as SVG (print)
// and PNG, plus an index CSV. URLs come from src/data/branchSlugs.js — printed
// codes depend on those slugs, so never rename one after printing.
//
// Usage: node scripts/campaign/qr-codes.mjs   → scripts/campaign/out/qr/
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { BRANCH_SLUGS, QR_PLACEMENTS } from '../../src/data/branchSlugs.js'

export const APP_ORIGIN = 'https://app.trustlabseg.com'
export const qrUrl = (slug, spot) => `${APP_ORIGIN}${QR_PLACEMENTS[spot].path}?b=${slug}&p=${spot}`
export const QR_OPTIONS = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#17221C', light: '#FFFFFF' } }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'qr')
  fs.rmSync(out, { recursive: true, force: true })
  const rows = [['الفرع', 'المكان', 'الملف', 'الرابط']]
  for (const [slug, name] of Object.entries(BRANCH_SLUGS)) {
    fs.mkdirSync(path.join(out, slug), { recursive: true })
    for (const [spot, pl] of Object.entries(QR_PLACEMENTS)) {
      const url = qrUrl(slug, spot)
      fs.writeFileSync(path.join(out, slug, `${slug}_${spot}.svg`), await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' }))
      await QRCode.toFile(path.join(out, slug, `${slug}_${spot}.png`), url, { ...QR_OPTIONS, width: 1200 })
      rows.push([name, pl.label, `${slug}/${slug}_${spot}.svg`, url])
    }
  }
  fs.writeFileSync(path.join(out, 'فهرس-الأكواد.csv'), '\ufeff' + rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'))
  console.log(`${rows.length - 1} codes → ${out}`)
}
