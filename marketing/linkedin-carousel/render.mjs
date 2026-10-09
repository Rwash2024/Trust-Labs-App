// Renders carousel.html to slide PNGs (2x) and a combined PDF for LinkedIn upload.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const dir = process.env.CAROUSEL_DIR ?? path.dirname(fileURLToPath(import.meta.url))
const out = path.join(dir, 'out')
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH })
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 2 })
await page.goto('file://' + path.join(dir, 'carousel.html'))
await page.evaluate(() => document.fonts.ready)
const slides = await page.$$('.slide')
for (let i = 0; i < slides.length; i++) {
  await slides[i].screenshot({ path: path.join(out, `slide-${String(i + 1).padStart(2, '0')}.png`) })
}
await browser.close()
console.log(`rendered ${slides.length} slides`)
