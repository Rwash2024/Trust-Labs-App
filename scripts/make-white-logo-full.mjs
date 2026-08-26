import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '../src/assets/logo-en.png')
const out = path.join(__dirname, '../src/assets/logo-white-full.png')

const trimmed = await sharp(src).trim({ threshold: 10 }).png().toBuffer()
const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  data[i] = 255
  data[i + 1] = 255
  data[i + 2] = 255
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .resize({ height: 480 })
  .toFile(out)

console.log('done', info.width, info.height)
