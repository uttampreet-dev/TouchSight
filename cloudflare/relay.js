// The relay on Cloudflare: the same room protocol that app/scripts/serve.mjs runs locally, held in one Durable
// Object so every phone, console and projector meets there, and it never sleeps.
//   stage: every message carries a projector code and reaches only the sockets on that code; the last `hello`
//          (the diagram) on a code is replayed to a projector that joins it late.
//   class: messages with {type:'class', room} belong to a classroom. The object keeps each room's roster, published
//          diagrams and student activity in its storage, replays them to whoever joins, and fans out changes.

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/relay') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('relay: websocket only', { status: 426 })
      return env.HUB.get(env.HUB.idFromName('hub')).fetch(request)
    }
    if (url.pathname === '/health') return new Response('ok', { headers: { 'content-type': 'text/plain', 'access-control-allow-origin': '*' } })
    return new Response('TouchSight relay', { status: 200, headers: { 'content-type': 'text/plain' } })
  },
}

export class Hub {
  constructor(ctx, env) { this.ctx = ctx; this.env = env }

  async fetch(request) {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ room: null, role: null, student: null, stage: null })
    return new Response(null, { status: 101, webSocket: client })
  }

  async room(code) { return (await this.ctx.storage.get(`room:${code}`)) || { roster: [], published: {}, activity: [] } }
  async save(code, r) { await this.ctx.storage.put(`room:${code}`, r) }
  sockets() { return this.ctx.getWebSockets() }
  meta(ws) { try { return ws.deserializeAttachment() || {} } catch { return {} } }
  phones(code, except) { return this.sockets().filter((c) => c !== except && this.meta(c).room === code && this.meta(c).role === 'student').length }
  send(ws, obj) { try { ws.send(JSON.stringify(obj)) } catch { /* closed */ } }
  toRoom(code, obj, except) { for (const c of this.sockets()) if (c !== except && this.meta(c).room === code) this.send(c, obj) }

  async webSocketMessage(ws, data) {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
    if (text.startsWith('{"type":"class"')) {
      let m
      try { m = JSON.parse(text) } catch { return }
      if (!m.room) return
      const r = await this.room(m.room)
      switch (m.op) {
        case 'join': {
          ws.serializeAttachment({ ...this.meta(ws), room: m.room, role: m.role, student: m.student || null })
          this.send(ws, { type: 'class', op: 'state', room: m.room, students: this.sockets().map((c) => this.meta(c)).filter((x) => x.room === m.room && x.role === 'student' && x.student).map((x) => x.student), pointing: r.pointing || null, roster: r.roster, published: Object.values(r.published), activity: r.activity.slice(-500), phones: this.phones(m.room) })
          this.toRoom(m.room, { type: 'class', op: 'presence', room: m.room, phones: this.phones(m.room), student: m.student || null, joined: true }, ws)
          return
        }
        case 'roster': r.roster = Array.isArray(m.names) ? m.names.slice(0, 60) : []; await this.save(m.room, r); this.toRoom(m.room, { type: 'class', op: 'roster', room: m.room, names: r.roster }, ws); return
        case 'publish': if (m.tdm && m.tdm.id) { r.published[m.tdm.id] = m.tdm; await this.save(m.room, r); this.toRoom(m.room, { type: 'class', op: 'published', room: m.room, tdm: m.tdm }, ws) } return
        case 'unpublish': delete r.published[m.id]; await this.save(m.room, r); this.toRoom(m.room, { type: 'class', op: 'unpublished', room: m.room, id: m.id }, ws); return
        case 'activity': { const ev = { ...m.event, student: m.student, at: m.at || Date.now() }; r.activity.push(ev); if (r.activity.length > 2000) r.activity.splice(0, 500); await this.save(m.room, r); this.toRoom(m.room, { type: 'class', op: 'activity', room: m.room, event: ev }, ws); return }
        case 'point': r.pointing = m.id ? { diagramId: m.diagramId, id: m.id, name: m.name || '', at: m.at || Date.now() } : null; await this.save(m.room, r); this.toRoom(m.room, { type: 'class', op: 'point', room: m.room, diagramId: m.diagramId, id: m.id || null, name: m.name || '', at: m.at || Date.now() }, ws); return
        case 'reset': r.activity = []; r.pointing = null; await this.save(m.room, r); this.toRoom(m.room, { type: 'class', op: 'state', room: m.room, roster: r.roster, published: Object.values(r.published), activity: [], phones: 0 }, ws); return
      }
      return
    }
    // stage traffic carries a projector code and reaches only the sockets on that code
    let m
    try { m = JSON.parse(text) } catch { return }
    const code = typeof m.stage === 'string' ? m.stage.toUpperCase().slice(0, 8) : null
    if (!code) return
    if (this.meta(ws).stage !== code) ws.serializeAttachment({ ...this.meta(ws), stage: code })
    if (m.type === 'stage-join') { const h = await this.ctx.storage.get(`hello:${code}`); if (h && m.src !== 'student') ws.send(h); return }
    if (m.type === 'hello') await this.ctx.storage.put(`hello:${code}`, text)
    for (const c of this.sockets()) if (c !== ws && this.meta(c).stage === code) { try { c.send(text) } catch { /* closed */ } }
  }

  async webSocketClose(ws) {
    const m = this.meta(ws)
    if (m.room) this.toRoom(m.room, { type: 'class', op: 'presence', room: m.room, phones: this.phones(m.room, ws), student: m.student, joined: false })
  }

  async webSocketError(ws) { await this.webSocketClose(ws) }
}
