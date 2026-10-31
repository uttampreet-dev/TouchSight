import { createRequire } from 'node:module'
import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { fillBrailleFields, toBraille } from '../braille/braille.mjs'
import { assertTdm } from '../tdm-runtime/tdm.mjs'

const require = createRequire(import.meta.url)
const ClipperLib = require('clipper-lib')
const SCALE = 1_000
const PLATE = 2
const MAX_FEATURES = 30_000
const MAX_TRIANGLES = 250_000
const MAX_STL_BYTES = 50_000_000
const MATERIAL = new THREE.MeshBasicMaterial()

function pathOf(points) {
  return points.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }))
}

function mmPath(points) {
  return points.map(({ X, Y }) => [X / SCALE, Y / SCALE])
}

function signedArea(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0) / 2
}

function offsetPolygon(points, delta) {
  const offset = new ClipperLib.ClipperOffset(2, 0.25 * SCALE)
  offset.AddPath(pathOf(points), ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon)
  const solution = new ClipperLib.Paths()
  offset.Execute(solution, delta * SCALE)
  if (solution.length !== 1) return null
  const result = mmPath(solution[0])
  return result.length >= 3 && Math.abs(signedArea(result)) > 0.01 ? result : null
}

function intersection(subject, clip) {
  const engine = new ClipperLib.Clipper()
  engine.AddPath(pathOf(subject), ClipperLib.PolyType.ptSubject, true)
  engine.AddPath(pathOf(clip), ClipperLib.PolyType.ptClip, true)
  const solution = new ClipperLib.Paths()
  engine.Execute(ClipperLib.ClipType.ctIntersection, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
  return solution.map(mmPath).filter((poly) => poly.length >= 3 && Math.abs(signedArea(poly)) > 0.01)
}

function shapeFor(points) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y)
  shape.closePath()
  return shape
}

function extrudedGeometry(outer, holes, z, depth) {
  const shape = shapeFor(outer)
  for (const hole of holes) {
    const path = new THREE.Path()
    path.moveTo(hole[0][0], hole[0][1])
    for (const [x, y] of hole.slice(1)) path.lineTo(x, y)
    path.closePath()
    shape.holes.push(path)
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 })
  geometry.translate(0, 0, z)
  return geometry
}

function pointIn(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

function strip(a, b, width) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
  if (length < 0.01) return null
  const nx = -dy / length * width / 2, ny = dx / length * width / 2
  return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]
}

function domeGeometry(radius, height) {
  const slices = 12, rings = 5, positions = []
  const addTriangle = (a, b, c) => positions.push(...a, ...b, ...c)
  const ringPoint = (ring, slice) => {
    const t = ring / rings
    const r = radius * Math.sqrt(Math.max(0, 1 - t ** 2))
    const angle = slice * Math.PI * 2 / slices
    return [r * Math.cos(angle), r * Math.sin(angle), height * t]
  }
  for (let ring = 0; ring < rings - 1; ring++) for (let slice = 0; slice < slices; slice++) {
    const next = (slice + 1) % slices
    const a = ringPoint(ring, slice), b = ringPoint(ring, next), c = ringPoint(ring + 1, next), d = ringPoint(ring + 1, slice)
    addTriangle(a, b, c); addTriangle(a, c, d)
  }
  const apex = [0, 0, height], baseCenter = [0, 0, 0]
  for (let slice = 0; slice < slices; slice++) {
    addTriangle(ringPoint(rings - 1, slice), ringPoint(rings - 1, (slice + 1) % slices), apex)
    addTriangle(baseCenter, ringPoint(0, (slice + 1) % slices), ringPoint(0, slice))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function addKey(scene, tdm, addGeometry, addDome) {
  const elements = new Map([...tdm.regions, ...tdm.lines].map((element) => [element.id, element]))
  const keyTop = Math.max(0, ...tdm.regions.flatMap((region) => region.polygon.map((p) => p[1])), ...tdm.lines.flatMap((line) => line.path.map((p) => p[1]))) + 10
  const language = tdm.languages.primary
  for (const [row, entry] of tdm.key.entries()) {
    const element = elements.get(entry.regionId)
    const source = entry.text[language] ?? element.name[language] ?? element.name.en
    const leader = toBraille(entry.ref, language)
    const label = entry.braille[language] || toBraille(source, language)
    entry.braille[language] = label
    const dots = [...leader].map((char) => char === ' ' ? '⠀' : char).join('') + '⠀' + [...label].join('')
    if (dots.length > 26) throw new Error(`Braille key row ${entry.ref} exceeds printable A4 width`)
    for (const [cell, char] of [...dots].entries()) {
      if (char === ' ' || char === '\u2800') continue
      const code = char.codePointAt(0)
      if (code < 0x2800 || code > 0x28ff) throw new Error(`Unsupported braille key character in ${entry.ref}`)
      const mask = code - 0x2800
      for (let bit = 0; bit < 6; bit++) if (mask & (1 << bit)) {
        const col = bit < 3 ? 0 : 1, dotRow = bit % 3
        addDome(15 + cell * 7.5 + col * 2.5, keyTop + row * 10 + dotRow * 2.5, 0.75, 0.5)
      }
    }
  }
}

export function exportStl(inputTdm) {
  const tdm = fillBrailleFields(structuredClone(assertTdm(inputTdm)))
  const scene = new THREE.Scene()
  let features = 0
  let triangles = 0
  const addGeometry = (geometry) => {
    if (++features > MAX_FEATURES) throw new Error(`Relief exceeds ${MAX_FEATURES} geometry features`)
    triangles += geometry.getAttribute('position').count / 3
    if (triangles > MAX_TRIANGLES) throw new Error(`Relief exceeds ${MAX_TRIANGLES} triangles`)
    scene.add(new THREE.Mesh(geometry, MATERIAL))
  }
  const addSolid = (polygon, z, height, holes = []) => {
    if (!polygon || polygon.length < 3) return
    if (polygon.some(([x, y]) => x < 0 || y < 0 || x > tdm.sheet.w || y > tdm.sheet.h)) throw new Error('Relief geometry extends beyond the TDM sheet')
    addGeometry(extrudedGeometry(polygon, holes, z, height))
  }
  const addDome = (x, y, radius, height) => {
    if (x - radius < 0 || y - radius < 0 || x + radius > tdm.sheet.w || y + radius > tdm.sheet.h) throw new Error('Braille dome extends beyond the TDM sheet')
    if (++features > MAX_FEATURES) throw new Error(`Relief exceeds ${MAX_FEATURES} geometry features`)
    const geometry = domeGeometry(radius, height)
    triangles += geometry.getAttribute('position').count / 3
    if (triangles > MAX_TRIANGLES) throw new Error(`Relief exceeds ${MAX_TRIANGLES} triangles`)
    geometry.translate(x, y, PLATE)
    scene.add(new THREE.Mesh(geometry, MATERIAL))
  }

  addSolid([[0, 0], [tdm.sheet.w, 0], [tdm.sheet.w, tdm.sheet.h], [0, tdm.sheet.h]], 0, PLATE)
  for (const region of tdm.regions) {
    const outer = offsetPolygon(region.polygon, 0.6)
    const inner = offsetPolygon(region.polygon, -0.6)
    if (!outer) throw new Error(`Region ${region.id} has unsupported outline geometry`)
    addSolid(outer, PLATE, 1, inner ? [inner] : [])
    const field = offsetPolygon(region.polygon, -2.2)
    if (!field || region.texture === 'empty') continue
    if (region.texture === 'solid') { addSolid(field, PLATE, 0.6); continue }
    const xs = field.map((p) => p[0]), ys = field.map((p) => p[1])
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    if (region.texture === 'dots') {
      for (let y = y0 + 1.1; y < y1; y += 2.2) for (let x = x0 + 1.1; x < x1; x += 2.2) {
        if (pointIn([x, y], field)) addDome(x, y, 0.65, 0.6)
      }
      continue
    }
    const radius = Math.hypot(x1 - x0, y1 - y0) + 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const makeRidges = (angle, width) => {
      const ridges = []
      const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux
      for (let offset = -radius; offset <= radius; offset += 2.2) {
        const center = [cx + nx * offset, cy + ny * offset]
        const polygon = strip([center[0] - ux * radius, center[1] - uy * radius], [center[0] + ux * radius, center[1] + uy * radius], width)
        if (!polygon) continue
        ridges.push(...intersection(polygon, field))
      }
      return ridges
    }
    if (region.texture === 'grid') {
      const horizontal = makeRidges(0, 0.8)
      const vertical = []
      const horizontalCenters = []
      for (let offset = -radius; offset <= radius; offset += 2.2) horizontalCenters.push(cy + offset)
      for (let offset = -radius; offset <= radius; offset += 2.2) {
        const x = cx - offset
        let startY = y0
        for (const centerY of horizontalCenters) {
          const endY = centerY - 0.45
          if (endY - startY > 0.5) {
            const polygon = strip([x, startY], [x, Math.min(endY, y1)], 0.8)
            if (polygon) vertical.push(...intersection(polygon, field))
          }
          startY = Math.max(startY, centerY + 0.45)
          if (startY >= y1) break
        }
        if (y1 - startY > 0.5) {
          const polygon = strip([x, startY], [x, y1], 0.8)
          if (polygon) vertical.push(...intersection(polygon, field))
        }
      }
      for (const ridge of [...horizontal, ...vertical]) addSolid(ridge, PLATE, 0.8)
    } else {
      const angle = region.texture === 'horizontal-lines' ? 0 : Math.PI / 4
      for (const ridge of makeRidges(angle, 0.8)) addSolid(ridge, PLATE, 0.8)
    }
  }

  for (const line of tdm.lines) for (let index = 0; index < line.path.length - 1; index++) {
    const a = line.path[index], b = line.path[index + 1], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
    if (line.style === 'dashed') {
      for (let start = 0; start < length; start += 5) {
        const end = Math.min(length, start + 3)
        const polygon = strip([a[0] + dx * start / length, a[1] + dy * start / length], [a[0] + dx * end / length, a[1] + dy * end / length], line.width)
        if (polygon) addSolid(polygon, PLATE, 0.8)
      }
    } else if (line.style === 'double') {
      const nx = -dy / length * line.width, ny = dx / length * line.width
      for (const side of [-1, 1]) {
        const polygon = strip([a[0] + nx * side, a[1] + ny * side], [b[0] + nx * side, b[1] + ny * side], line.width)
        if (polygon) addSolid(polygon, PLATE, 0.8)
      }
    } else {
      const polygon = strip(a, b, line.width)
      if (polygon) addSolid(polygon, PLATE, 0.8)
    }
  }
  addKey(scene, tdm, addGeometry, addDome)

  const output = new STLExporter().parse(scene, { binary: true })
  const bytes = output.byteLength
  if (bytes > MAX_STL_BYTES) throw new Error(`Generated STL exceeds ${MAX_STL_BYTES} bytes`)
  return { stl: output, features, bytes }
}