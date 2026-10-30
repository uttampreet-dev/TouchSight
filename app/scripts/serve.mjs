// Static server for dist/ with single-page fallback, for phone testing on the LAN and for the headless harness.
// usage: node scripts/serve.mjs [port]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = new URL('../dist/', import.meta.url).pathname
const PORT = +(process.argv[2] || 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.traineddata': 'application/octet-stream', '.map': 'application/json',
}

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  let file = normalize(join(ROOT, url))
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  try {
    const s = await stat(file)
    if (s.isDirectory()) file = join(file, 'index.html')
    await stat(file)
  } catch {
    if (extname(url)) { res.writeHead(404); return res.end('not found') }
    file = join(ROOT, 'index.html')
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
    res.end(body)
  } catch {
    res.writeHead(500); res.end()
  }
}).listen(PORT, '0.0.0.0', () => console.log(`serving dist on http://0.0.0.0:${PORT}`))
