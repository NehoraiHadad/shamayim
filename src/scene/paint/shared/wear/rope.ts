import type { LayerOf, RGB } from '../../../model/types'
import { rng } from '../base/core'
import { css, mix, type Ctx2D, type PaintEnv } from '../base/hand'

/** The rope (or a hook's stretch of it): the cord, the lay of its twist, the snow on it, the beads of rain, the ties. */
export function paintWearRope(ctx: Ctx2D, desc: LayerOf<'wearRope'>, env: PaintEnv) {
  const pts = desc.points
  if (pts.length < 2) return
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const trace = () => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  }
  for (const end of desc.ends) {
    ctx.fillStyle = css(end.rgb)
    ctx.beginPath()
    ctx.roundRect(end.x - end.w / 2, end.y - 1, end.w, end.w * 0.85, 1)
    ctx.fill()
  }
  trace()
  ctx.strokeStyle = css(desc.rgb)
  ctx.lineWidth = desc.width
  ctx.stroke()
  // The lay of a twisted cord: short pale strokes slanted across the line, following its bends.
  const step = 2.4 * (desc.width / 1.5)
  ctx.beginPath()
  let walked = 0
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    if (len <= 0) continue
    const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx
    for (let s = (step - walked) % step; s < len; s += step) {
      const x = ax + tx * s, y = ay + ty * s
      const dx = (0.55 * tx + 0.7 * nx) * (desc.width / 1.5), dy = (0.55 * ty + 0.7 * ny) * (desc.width / 1.5)
      ctx.moveTo(x - dx, y - dy)
      ctx.lineTo(x + dx, y + dy)
    }
    walked = (walked + len) % step
  }
  ctx.strokeStyle = css(desc.lay)
  ctx.lineWidth = Math.max(0.5 / env.scale, desc.width * 0.3)
  ctx.stroke()
  for (const end of desc.ends) {
    // The line wrapped twice round each tab (drawn for the left tab, mirrored for the right).
    const m = -end.side, k = end.w / 6
    ctx.beginPath()
    ctx.moveTo(end.x - 2.2 * k * m, end.y - 1.8 * k); ctx.lineTo(end.x + 0.4 * k * m, end.y + 2.6 * k)
    ctx.moveTo(end.x, end.y - 2 * k); ctx.lineTo(end.x + 2.6 * k * m, end.y + 2.4 * k)
    ctx.strokeStyle = css(desc.rgb)
    ctx.lineWidth = desc.width * 0.75
    ctx.stroke()
  }
  if (desc.snow > 0.05) {
    // Snow lying along the top of the line, in seeded lumps: its shaded edge, then the white.
    const r = rng(desc.seed + 3)
    const lumps: [number, number, number][] = []
    for (let i = 1; i < pts.length; i++) {
      if (r() < 0.3 * (1 - desc.snow)) continue
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
      lumps.push([(ax + bx) / 2, (ay + by) / 2 - desc.width * 0.8, desc.width * (0.7 + 0.5 * r()) * Math.min(1, desc.snow + 0.4)])
    }
    for (const [fill, grow] of [[desc.lay, 0.45], [[0.97, 0.98, 1] as RGB, 0]] as const) {
      ctx.fillStyle = css(fill, 0.95)
      ctx.beginPath()
      for (const [x, y, rr] of lumps) { ctx.moveTo(x + rr * 2.2 + grow, y); ctx.ellipse(x, y, rr * 2.2 + grow, rr * 0.8 + grow, 0, 0, Math.PI * 2) }
      ctx.fill()
    }
  }
  for (const b of desc.beads) {
    ctx.fillStyle = css(mix(desc.lay, [0.75, 0.85, 0.95], 0.35), 0.85)
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.85, b.r, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = css([1, 1, 1], 0.75)
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2); ctx.fill()
  }
}
