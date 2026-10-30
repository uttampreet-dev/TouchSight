// Mesh sanity for a binary STL file: every edge used exactly twice per shell, shell count, triangle count, bbox in mm.
// usage: node scripts/check-stl.mjs file.stl [more.stl …]   (exit 1 if any shell is open)
import { readFileSync } from 'node:fs'

function checkStl(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const n = dv.getUint32(80, true)
  const key = (o) => `${dv.getFloat32(o, true).toFixed(4)},${dv.getFloat32(o + 4, true).toFixed(4)},${dv.getFloat32(o + 8, true).toFixed(4)}`
  const ids = new Map()
  const vid = (k) => { let i = ids.get(k); if (i == null) { i = ids.size; ids.set(k, i) } return i }
  const edges = new Map()
  const parent = []
  const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])))
  const union = (a, b) => { parent[find(a)] = find(b) }
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let t = 0; t < n; t++) {
    const o = 84 + t * 50 + 12
    const v = [0, 1, 2].map((i) => {
      const x = dv.getFloat32(o + i * 12, true), y = dv.getFloat32(o + i * 12 + 4, true), z = dv.getFloat32(o + i * 12 + 8, true)
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
      const id = vid(key(o + i * 12)); if (parent[id] == null) parent[id] = id; return id
    })
    union(v[0], v[1]); union(v[1], v[2])
    for (let i = 0; i < 3; i++) { const a = v[i], b = v[(i + 1) % 3]; const k = a < b ? `${a}-${b}` : `${b}-${a}`; edges.set(k, (edges.get(k) ?? 0) + 1) }
  }
  let open = 0, over = 0
  for (const c of edges.values()) { if (c === 1) open++; else if (c > 2) over++ }
  const roots = new Set()
  for (let i = 0; i < parent.length; i++) roots.add(find(i))
  return { triangles: n, shells: roots.size, openEdges: open, overusedEdges: over, closed: open === 0 && over === 0, bbox: { x: +minX.toFixed(1), y: +minY.toFixed(1), z: +minZ.toFixed(1), w: +(maxX - minX).toFixed(1), h: +(maxY - minY).toFixed(1), d: +(maxZ - minZ).toFixed(2) } }
}

let bad = 0
for (const f of process.argv.slice(2)) {
  const r = checkStl(readFileSync(f))
  if (!r.closed) bad++
  console.log(`${f}: ${r.triangles} triangles · ${r.shells} shells · ${r.closed ? 'all closed' : `${r.openEdges} open edges, ${r.overusedEdges} overused`} · ${r.bbox.w}×${r.bbox.h}×${r.bbox.d} mm at (${r.bbox.x}, ${r.bbox.y}, ${r.bbox.z})`)
}
process.exit(bad ? 1 : 0)
