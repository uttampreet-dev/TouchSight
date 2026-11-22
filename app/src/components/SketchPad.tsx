import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

/**
 * A board to draw on: the diagram that exists nowhere but in the teacher's hand. Pen, straight line, box, ellipse,
 * typed labels, undo. What is drawn is handed to the pipeline as an image, exactly like a photograph.
 */
type Tool = 'pen' | 'line' | 'rect' | 'ellipse' | 'text'
type P = [number, number]
type Op =
  | { kind: 'pen'; pts: P[] }
  | { kind: 'line' | 'rect' | 'ellipse'; a: P; b: P }
  | { kind: 'text'; at: P; text: string }

const W = 1200, H = 900, INK = '#101418', STROKE = 6, FONT = 34

function paint(ctx: CanvasRenderingContext2D, ops: Op[]) {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = STROKE; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.font = `600 ${FONT}px Inter, Arial, sans-serif`; ctx.textBaseline = 'middle'
  for (const op of ops) {
    if (op.kind === 'pen') { if (op.pts.length < 2) continue; ctx.beginPath(); ctx.moveTo(...op.pts[0]); for (const p of op.pts.slice(1)) ctx.lineTo(...p); ctx.stroke() }
    else if (op.kind === 'line') { ctx.beginPath(); ctx.moveTo(...op.a); ctx.lineTo(...op.b); ctx.stroke() }
    else if (op.kind === 'rect') { ctx.strokeRect(Math.min(op.a[0], op.b[0]), Math.min(op.a[1], op.b[1]), Math.abs(op.b[0] - op.a[0]), Math.abs(op.b[1] - op.a[1])) }
    else if (op.kind === 'ellipse') { ctx.beginPath(); ctx.ellipse((op.a[0] + op.b[0]) / 2, (op.a[1] + op.b[1]) / 2, Math.abs(op.b[0] - op.a[0]) / 2, Math.abs(op.b[1] - op.a[1]) / 2, 0, 0, Math.PI * 2); ctx.stroke() }
    else if (op.kind === 'text') ctx.fillText(op.text, op.at[0], op.at[1])
  }
}

export interface SketchHandle { toFile: () => Promise<File | null>; count: () => number }

const TOOLS: [Tool, string, string][] = [['pen', 'Pen', 'M4 20c4-9 6-3 9-8s5-6 7-6'], ['line', 'Line', 'M4 20L20 4'], ['rect', 'Box', 'M4 6h16v12H4z'], ['ellipse', 'Round', 'M12 5a8 7 0 1 0 .01 0z'], ['text', 'Label', 'M5 6h14M12 6v13']]

export const SketchPad = forwardRef<SketchHandle, { onChange?: (ops: number) => void }>(function SketchPad({ onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('ellipse')
  const [ops, setOps] = useState<Op[]>([])
  const draft = useRef<Op | null>(null)
  const textAt = useRef<{ at: P; css: P } | null>(null)
  const [typing, setTyping] = useState<{ at: P; css: P; text: string } | null>(null)

  const redraw = (list: Op[], extra?: Op | null) => { const c = canvas.current?.getContext('2d'); if (c) paint(c, extra ? [...list, extra] : list) }
  useEffect(() => { redraw(ops); onChange?.(ops.length) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ops])
  useImperativeHandle(ref, () => ({
    count: () => ops.length,
    toFile: () => new Promise((resolve) => { const c = canvas.current; if (!c || !ops.length) return resolve(null); c.toBlob((b) => resolve(b ? new File([b], 'board-drawing.png', { type: 'image/png' }) : null), 'image/png') }),
  }), [ops])

  const at = (e: React.PointerEvent): P => { const r = canvas.current!.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H] }
  const commitText = () => { if (typing && typing.text.trim()) setOps((o) => [...o, { kind: 'text', at: typing.at, text: typing.text.trim() }]); setTyping(null) }

  function down(e: React.PointerEvent) {
    if (typing) { commitText(); return }
    const p = at(e)
    // the label box opens when the finger lifts: opened on the press, the press itself would take the focus away from it
    if (tool === 'text') { const r = canvas.current!.getBoundingClientRect(); textAt.current = { at: p, css: [e.clientX - r.left, e.clientY - r.top] }; return }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    draft.current = tool === 'pen' ? { kind: 'pen', pts: [p] } : { kind: tool, a: p, b: p }
  }
  function move(e: React.PointerEvent) {
    const d = draft.current
    if (!d) return
    const p = at(e)
    if (d.kind === 'pen') d.pts.push(p); else if (d.kind !== 'text') d.b = p
    redraw(ops, d)
  }
  function up() {
    if (textAt.current) { setTyping({ ...textAt.current, text: '' }); textAt.current = null; return }
    const d = draft.current
    draft.current = null
    if (!d) return
    const big = d.kind === 'pen' ? d.pts.length > 3 : d.kind !== 'text' && Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) > 14
    if (big) setOps((o) => [...o, d]); else redraw(ops)
  }
  /** A worked example, so an empty board is never a dead end: a cell with its nucleus and vacuole, labelled. */
  function example() {
    setOps([
      { kind: 'rect', a: [250, 150], b: [950, 750] },
      { kind: 'ellipse', a: [330, 240], b: [600, 480] },
      { kind: 'ellipse', a: [620, 430], b: [880, 680] },
      { kind: 'text', at: [395, 360], text: 'Nucleus' },
      { kind: 'text', at: [680, 555], text: 'Vacuole' },
      { kind: 'text', at: [500, 105], text: 'Cell wall' },
      { kind: 'line', a: [575, 128], b: [600, 152] },
    ])
  }

  return (
    <div className="sk">
      <div className="sk-tools" role="toolbar" aria-label="drawing tools">
        {TOOLS.map(([t, label, d]) => (
          <button key={t} className={tool === t ? 'on' : ''} onClick={() => { commitText(); setTool(t) }} title={label} aria-pressed={tool === t}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{label}</span>
          </button>
        ))}
        <span className="sk-gap" />
        <button onClick={() => setOps((o) => o.slice(0, -1))} disabled={!ops.length} title="Undo">Undo</button>
        <button onClick={() => setOps([])} disabled={!ops.length} title="Clear the board">Clear</button>
      </div>
      <div className="sk-board">
        <canvas ref={canvas} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ cursor: tool === 'text' ? 'text' : 'crosshair' }} />
        {typing && <input className="sk-type" autoFocus style={{ left: typing.css[0], top: typing.css[1] }} value={typing.text} placeholder="name of the part" onChange={(e) => setTyping({ ...typing, text: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setTyping(null) }} onBlur={commitText} />}
        {!ops.length && !typing && <div className="sk-empty"><b>Draw the diagram here</b><span className="mono">closed shapes become parts · typed labels become names</span><button className="btn" onClick={example}>or start from an example</button></div>}
      </div>
    </div>
  )
})
