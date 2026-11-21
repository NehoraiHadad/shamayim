import type { OutsideLandDesc, Shine } from '../model/types'
import { css, type Ctx2D } from './hand'

/**
 * Paints the place's own ground polygon over the ridge line in the outside view (C5b + Stage 3):
 * quantised local living-land tone gradient, lying snow runs above the snow line, and sky-lit crest rim.
 */
export function paintOutsideLand(ctx: Ctx2D, l: OutsideLandDesc, shine: Shine): void {
  ctx.beginPath()
  l.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  for (let i = l.base.length - 1; i >= 0; i--) ctx.lineTo(l.base[i][0], l.base[i][1])
  ctx.closePath()
  if (l.stops.length > 1) {
    const x0 = l.top[0][0], x1 = l.top.at(-1)![0]
    const g = ctx.createLinearGradient(x0, 0, Math.max(x0 + 1, x1), 0)
    for (const [t, rgb] of l.stops) g.addColorStop(Math.min(1, Math.max(0, t)), css(rgb))
    ctx.fillStyle = g
  } else ctx.fillStyle = css(l.tone)
  ctx.fill()
  for (const [a, b] of l.snow?.runs ?? []) {
    ctx.beginPath()
    ctx.moveTo(l.top[a][0], l.top[a][1])
    for (let i = a + 1; i <= b; i++) ctx.lineTo(l.top[i][0], l.top[i][1])
    for (let i = b; i >= a; i--) ctx.lineTo(l.base[i][0], l.base[i][1])
    ctx.closePath()
    ctx.fillStyle = css(l.snow!.rgb, l.snow!.alpha)
    ctx.fill()
  }
  // The crest: a fine line where it stands over the ridge line, fading where it eases into it.
  for (let i = 1; i < l.top.length; i++) {
    const [x0, y0] = l.top[i - 1], [x1, y1] = l.top[i]
    const rise = Math.min(1, (l.base[i][1] - 2 - y1) / 2)
    if (rise <= 0) continue
    ctx.strokeStyle = css(l.rim, .55 * rise * (1 - .5 * shine.night))
    ctx.lineWidth = .5
    ctx.beginPath()
    ctx.moveTo(x0, y0 + .25)
    ctx.lineTo(x1, y1 + .25)
    ctx.stroke()
  }
}
