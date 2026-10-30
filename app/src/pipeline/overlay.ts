import type { Understanding } from './understand'

/** What the pipeline read, drawn over the photo. Stages reveal in order so a watcher sees regions, then labels, then strokes, then which label names which region. */
export const PALETTE = ['#0e7c7b', '#ff6f59', '#3d7dd8', '#e9a23b', '#2e9e6a', '#8e44ad', '#c0392b', '#16a085', '#d35400', '#2c3e50']
export type OverlayShow = { regions: boolean; labels: boolean; segments: boolean; links: boolean }
export const SHOW_ALL: OverlayShow = { regions: true, labels: true, segments: true, links: true }

export function drawUnderstanding(ctx: CanvasRenderingContext2D, u: Understanding, show: OverlayShow, progress = 1) {
  const { prepared } = u
  ctx.clearRect(0, 0, prepared.width, prepared.height)
  ctx.drawImage(prepared.canvas, 0, 0)
  const scale = Math.max(1, prepared.width / 900)
  ctx.lineWidth = 2 * scale
  if (show.regions) u.regions.slice(0, Math.ceil(u.regions.length * progress)).forEach((r, i) => {
    ctx.beginPath(); r.polygon.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath()
    ctx.fillStyle = PALETTE[i % PALETTE.length] + '55'; ctx.fill()
    ctx.strokeStyle = PALETTE[i % PALETTE.length]; ctx.stroke()
    ctx.fillStyle = '#000'; ctx.font = `bold ${13 * scale}px JetBrains Mono, monospace`; ctx.fillText(r.id, r.centroid[0], r.centroid[1])
  })
  if (show.segments) { ctx.strokeStyle = '#ff6f59'; ctx.lineWidth = 2 * scale; u.segments.slice(0, Math.ceil(u.segments.length * progress)).forEach((s) => { ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); ctx.stroke() }) }
  if (show.labels) { ctx.strokeStyle = '#17181a'; ctx.lineWidth = 1.5 * scale; u.labels.slice(0, Math.ceil(u.labels.length * progress)).forEach((l) => { ctx.strokeRect(l.bbox.x, l.bbox.y, l.bbox.w, l.bbox.h); ctx.fillStyle = '#17181a'; ctx.font = `${11 * scale}px JetBrains Mono, monospace`; ctx.fillText(`${l.text} ${Math.round(l.confidence * 100)}`, l.bbox.x, l.bbox.y - 3) }) }
  if (show.links) { ctx.strokeStyle = '#2e9e6a'; ctx.setLineDash([4 * scale, 3 * scale]); ctx.lineWidth = 1.5 * scale
    u.associations.slice(0, Math.ceil(u.associations.length * progress)).forEach((a) => { if (!a.regionId) return; const l = u.labels.find((x) => x.id === a.labelId)!; const r = u.regions.find((x) => x.id === a.regionId)!; ctx.beginPath(); ctx.moveTo(l.centre[0], l.centre[1]); ctx.lineTo(r.centroid[0], r.centroid[1]); ctx.stroke() })
    ctx.setLineDash([]) }
}
