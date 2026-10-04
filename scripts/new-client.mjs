// Scaffold a new white-label client:
//   node scripts/new-client.mjs <slug> "<Name>" --primary #2563EB --logo path/to/logo.png \
//        [--logo-on dark|light] [--hotline 19xxx] [--whatsapp 2010xxxxxxx] [--branches 12] [--year 1990]
// --logo-on: "light" = dark logo on a light/transparent background (default), "dark" = light logo on a dark background.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [slug, name, ...rest] = process.argv.slice(2)
if (!slug || !name) {
  console.error('usage: node scripts/new-client.mjs <slug> "<Name>" --primary #hex --logo file [--logo-on dark|light]')
  process.exit(1)
}
const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d }
const primary = opt('primary', '#2563EB')
const logoPath = opt('logo')
const logoOn = opt('logo-on', 'light')
const dir = path.join('clients', slug)
if (fs.existsSync(dir)) { console.error(`${dir} already exists`); process.exit(1) }

fs.cpSync('clients/_template', dir, { recursive: true })

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const mix = (c, to, a) => '#' + hex(c).map((v, i) => Math.round(v + (to[i] - v) * a).toString(16).padStart(2, '0')).join('')
const colors = {
  primary,
  primaryDark: mix(primary, [0, 0, 0], 0.2),
  primaryDarker: mix(primary, [0, 0, 0], 0.4),
  primaryLight: mix(primary, [255, 255, 255], 0.9),
  primaryBright: mix(primary, [255, 255, 255], 0.2),
  themeColor: primary,
  shadowRgb: hex(primary).map((v) => Math.round(v * 0.6)).join(', '),
}
const brand = {
  name,
  legalName: name,
  appDescription: `${name} — حجز التحاليل الطبية والباقات والفروع`,
  seoDescription: `${name} — احجز تحصيل منزلي أو موعد فرع، وتصفّح الباقات والأسعار وشروط التحضير لكل تحليل.`,
  hotline: opt('hotline', '0000'),
  whatsapp: opt('whatsapp', '20100000000'),
  resultsUrl: opt('results', '#'),
  colors,
  social: {},
  features: { trustCard: false, trackSample: true, vercelAnalytics: false },
}
fs.writeFileSync(path.join(dir, 'brand.json'), JSON.stringify(brand, null, 2) + '\n')

const about = path.join(dir, 'data', 'aboutContent.js')
fs.writeFileSync(about, fs.readFileSync(about, 'utf8')
  .replaceAll('__NAME__', name).replaceAll('__TAGLINE__', `${name} — خدمات تحاليل طبية بمعايير عالية`)
  .replaceAll('__YEAR__', opt('year', '')).replaceAll('__BRANCHES__', opt('branches', '')))

if (logoPath) {
  fs.copyFileSync(logoPath, path.join(dir, 'logo-en.png'))
  // White silhouette for the colored hero: alpha comes from how far each pixel is from the logo's background.
  const { data, info } = await sharp(logoPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const bg = logoOn === 'dark' ? [data[0], data[1], data[2]] : [255, 255, 255]
  const out = Buffer.alloc(data.length)
  const dist = (r, g, b) => Math.hypot(r - bg[0], g - bg[1], b - bg[2]) / 441
  for (let i = 0; i < data.length; i += 4) {
    const a = Math.min(1, dist(data[i], data[i + 1], data[i + 2]) * 2.2) * (data[i + 3] / 255)
    out[i] = out[i + 1] = out[i + 2] = 255
    out[i + 3] = Math.round(a * 255)
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().png().toFile(path.join(dir, 'logo-white-full.png'))
}
console.log(`Created ${dir}. Next: edit data/branches.js, then: VITE_CLIENT=${slug} npm run brand-assets && VITE_CLIENT=${slug} npm run dev`)
