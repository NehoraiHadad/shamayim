import type { OutsideLandDesc, SeaDesc, Shine } from '../../../model/types'
import { css, outline, type Ctx2D } from '../base/hand'
import { running, twinkling } from '../land/water'

export function paintOutsideSea(ctx: Ctx2D, s: SeaDesc, shine: Shine, t: number) {
  const g = ctx.createLinearGradient(0, s.top, 0, s.bottom)
  for (const [t, c] of s.stops) g.addColorStop(t, css(c))
  outline(ctx, s.points)
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  outline(ctx, s.points)
  ctx.clip()
  // Ripples: light ones catching the low sky, a darker trough under each.
  // C7: each runs a little downwind over the loop, rising and falling as it goes.
  for (const r of running(s.ripples, t, s.drift ?? 0, 0)) {
    ctx.fillStyle = css(s.light, r.alpha * (1 - .5 * shine.night))
    ctx.fillRect(r.x, r.y - .25, r.w, .4)
    ctx.fillStyle = css(s.dark, r.alpha * .8)
    ctx.fillRect(r.x + .3, r.y + .2, r.w * .8, .35)
  }
  if (s.glint) {
    const { x, rgb, alpha } = s.glint
    const core = ctx.createLinearGradient(x - 3, 0, x + 3, 0)
    core.addColorStop(0, css(rgb, 0))
    core.addColorStop(.5, css(rgb, .35 * alpha))
    core.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = core
    ctx.fillRect(x - 3, s.top, 6, s.bottom - s.top)
    for (const sp of twinkling(s.glint.sparks, t)) {
      ctx.fillStyle = css(rgb, sp.alpha)
      ctx.fillRect(sp.x, sp.y - .2, sp.w, .45)
    }
  }
  ctx.restore()
  // The horizon: the far water mirroring the sky at grazing angle, a fine light line, level.
  const hz = s.horizon
  ctx.fillStyle = css(hz.rgb, hz.alpha * (1 - .5 * shine.night))
  ctx.fillRect(hz.x0, hz.y - .25, hz.x1 - hz.x0, .5)
  // The shore: a fine pale line where the land meets the water, broken where the sea's edge turns.
  ctx.strokeStyle = css(s.shore, .7 - .35 * shine.night)
  ctx.lineWidth = .55
  ctx.beginPath()
  s.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

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
