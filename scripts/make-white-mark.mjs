import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '../src/assets/logo-en.png')
const out = path.join(__dirname, '../src/assets/mark-white.png')

const img = sharp(src)
const meta = await img.metadata()

// Crop to just the microscope glyph (top band, excludes the "ESTABLISHED 1989" pill and wordmark below)
const bandBuffer = await sharp(src)
  .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * 0.42) })
  .png()
  .toBuffer()

await sharp(bandBuffer).toFile(path.join(__dirname, '../src/assets/_debug-band.png'))

const trimmed = await sharp(bandBuffer).trim({ threshold: 10 }).toBuffer()
await sharp(trimmed).toFile(path.join(__dirname, '../src/assets/_debug-trimmed.png'))

const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  data[i] = 255
  data[i + 1] = 255
  data[i + 2] = 255
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .resize({ height: 240 })
  .toFile(out)

console.log('done', info.width, info.height)
