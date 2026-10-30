// Static server for dist/ with single-page fallback, for phone testing on the LAN and for the headless harness.
// usage: node scripts/serve.mjs [port]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const ROOT = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const ROOT_PREFIX = `${ROOT}${sep}`
const PORT = +(process.argv[2] || 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.traineddata': 'application/octet-stream', '.map': 'application/json',
}

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  let file = resolve(ROOT, `.${url}`)
  if (file !== ROOT && !file.startsWith(ROOT_PREFIX)) { res.writeHead(403); return res.end() }
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
})

// /relay — one room for the jury table: every message fans out to every other client; the last `hello`
// (the diagram) is replayed to anyone who joins late, so the projector can open after the phone.
const wss = new WebSocketServer({ noServer: true })
let lastHello = null
server.on('upgrade', (req, socket, head) => {
  if ((req.url || '').split('?')[0] !== '/relay') return socket.destroy()
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})
wss.on('connection', (ws) => {
  if (lastHello) ws.send(lastHello)
  ws.on('message', (data) => {
    const text = data.toString()
    if (text.startsWith('{"type":"hello"')) lastHello = text
    for (const c of wss.clients) if (c !== ws && c.readyState === 1) c.send(text)
  })
})
server.listen(PORT, '0.0.0.0', () => console.log(`serving dist on http://0.0.0.0:${PORT} (relay at /relay)`))
