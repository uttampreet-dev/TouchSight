// Static server for dist/ with single-page fallback, for phone testing on the LAN and for the headless harness.
// usage: node scripts/serve.mjs [port]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { WebSocketServer } from 'ws'

const ROOT = new URL('../dist/', import.meta.url).pathname
const PORT = +(process.argv[2] || 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.traineddata': 'application/octet-stream', '.map': 'application/json',
}

const server = createServer(async (req, res) => {
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
})

// /relay — two kinds of traffic on one socket.
//   stage: every message without a room fans out to every other client; the last `hello` (the diagram) is replayed
//          to late joiners so the projector can open after the phone.
//   class: messages with {type:'class', room} belong to a classroom. The server keeps each room's roster, published
//          diagrams and student activity in memory, replays them to whoever joins, and fans out changes.
const wss = new WebSocketServer({ noServer: true })
let lastHello = null
const rooms = new Map() // code -> { roster: string[], published: Map<id, json>, activity: [] }
const room = (code) => { if (!rooms.has(code)) rooms.set(code, { roster: [], published: new Map(), activity: [] }); return rooms.get(code) }
const send = (c, obj) => c.readyState === 1 && c.send(JSON.stringify(obj))
const toRoom = (code, obj, except) => { for (const c of wss.clients) if (c !== except && c.room === code) send(c, obj) }
const stamp = () => new Date().toISOString().slice(11, 19)
server.on('upgrade', (req, socket, head) => {
  console.log(`${stamp()} upgrade ${req.url} from ${req.headers['cf-connecting-ip'] || req.socket.remoteAddress} host=${req.headers.host} ua=${(req.headers['user-agent'] || '').slice(0, 40)}`)
  if ((req.url || '').split('?')[0] !== '/relay') return socket.destroy()
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})
wss.on('connection', (ws) => {
  if (lastHello) ws.send(lastHello)
  ws.on('message', (data) => {
    const text = data.toString()
    if (text.startsWith('{"type":"class"')) {
      let m; try { m = JSON.parse(text) } catch { return }
      if (!m.room) return
      const r = room(m.room)
      switch (m.op) {
        case 'join': {
          console.log(`${stamp()} join room=${m.room} role=${m.role} student=${m.student || '-'}`)
          ws.room = m.room; ws.role = m.role; ws.student = m.student || null
          send(ws, { type: 'class', op: 'state', room: m.room, roster: r.roster, published: [...r.published.values()], activity: r.activity.slice(-500), phones: [...wss.clients].filter((c) => c.room === m.room && c.role === 'student').length })
          toRoom(m.room, { type: 'class', op: 'presence', room: m.room, phones: [...wss.clients].filter((c) => c.room === m.room && c.role === 'student').length, student: m.student || null, joined: true }, ws)
          return
        }
        case 'roster': r.roster = Array.isArray(m.names) ? m.names.slice(0, 60) : []; toRoom(m.room, { type: 'class', op: 'roster', room: m.room, names: r.roster }, ws); return
        case 'publish': if (m.tdm && m.tdm.id) { r.published.set(m.tdm.id, m.tdm); toRoom(m.room, { type: 'class', op: 'published', room: m.room, tdm: m.tdm }, ws) } return
        case 'unpublish': r.published.delete(m.id); toRoom(m.room, { type: 'class', op: 'unpublished', room: m.room, id: m.id }, ws); return
        case 'activity': { const ev = { ...m.event, student: m.student, at: m.at || Date.now() }; r.activity.push(ev); if (r.activity.length > 5000) r.activity.splice(0, 1000); toRoom(m.room, { type: 'class', op: 'activity', room: m.room, event: ev }, ws); return }
        case 'reset': r.activity = []; toRoom(m.room, { type: 'class', op: 'state', room: m.room, roster: r.roster, published: [...r.published.values()], activity: [], phones: 0 }, ws); return
      }
      return
    }
    if (text.startsWith('{"type":"hello"')) lastHello = text
    for (const c of wss.clients) if (c !== ws && c.readyState === 1 && !c.room) c.send(text)
    // a phone in a room still mirrors to a projector that has not joined any room
  })
  ws.on('close', () => { console.log(`${stamp()} close room=${ws.room || '-'} role=${ws.role || '-'}`) if (ws.room) toRoom(ws.room, { type: 'class', op: 'presence', room: ws.room, phones: [...wss.clients].filter((c) => c !== ws && c.room === ws.room && c.role === 'student').length, student: ws.student, joined: false }) })
})
server.listen(PORT, '0.0.0.0', () => console.log(`serving dist on http://0.0.0.0:${PORT} (relay at /relay)`))
