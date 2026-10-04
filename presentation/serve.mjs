// Tiny static server for the decks: node presentation/serve.mjs [port]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.argv[2]) || 5180
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8' }

http
  .createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'almaamal.html'
    const file = path.join(root, name)
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, () => console.log(`Decks on http://localhost:${port}/almaamal.html and /labmed.html`))
