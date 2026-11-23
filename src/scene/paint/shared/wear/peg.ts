import type { WearItem } from '../../../model/types'
import { css, mix, type Ctx2D } from '../base/hand'
import { path, stroke } from './path'

/** The peg: a spring clothespin pushed down over the line (rope at y = 0), its levers above and its jaws on the cloth. */
const PEG = 'M-1.15 -4.8H1.15L0.95 -2.2 1.25 -1.5 0.85 2.9Q0 3.6-0.85 2.9L-1.25 -1.5-0.95 -2.2Z'

export function peg(ctx: Ctx2D, x: number, tilt: number, t: WearItem['tones'], px: number) {
  ctx.fillStyle = css(t.deep, 0.55)
  ctx.beginPath()
  ctx.ellipse(x, 2.4, 2.6, 0.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(x, 0)
  ctx.rotate(tilt)
  const body = path(PEG)
  const g = ctx.createLinearGradient(-1.25, 0, 1.25, 0)
  g.addColorStop(0, css(t.pegLight))
  g.addColorStop(0.45, css(t.peg))
  g.addColorStop(1, css(mix(t.peg, t.pegEdge, 0.35)))
  ctx.fillStyle = g
  ctx.fill(body)
  stroke(ctx, body, t.pegEdge, 0.9 * px, 1)
  stroke(ctx, path('M0 -4.6V3'), t.pegEdge, 0.6 * px, 0.8)
  ctx.fillStyle = css(t.spring)
  ctx.beginPath()
  ctx.roundRect(-1.6, -2.5, 3.2, 1.1, 0.45)
  ctx.fill()
  stroke(ctx, path('M-1.1 -2.5v1.1M-0.35 -2.5v1.1M0.4 -2.5v1.1M1.15 -2.5v1.1'), mix(t.spring, t.tag, 0.55), 0.5 * px, 0.9)
  ctx.restore()
}
