import type { LayerOf, SeaDesc, Shine } from '../model/types'
import { css, outline, type Ctx2D } from './hand'
import { running, twinkling } from './water'

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

/** The place's own ground over the ridge line: the near land's tone, its crest catching the sky as the ridge's does. */
export function paintOutsideLand(ctx: Ctx2D, l: NonNullable<LayerOf<'outside'>['land']>, shine: Shine) {
  ctx.beginPath()
  l.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  for (let i = l.base.length - 1; i >= 0; i--) ctx.lineTo(l.base[i][0], l.base[i][1])
  ctx.closePath()
  ctx.fillStyle = css(l.tone)
  ctx.fill()
  // Snow where its crest stands at or over the snow line, as the ridge under it takes it: from the crest down to the line.
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
