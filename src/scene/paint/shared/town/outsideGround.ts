import type { OutsideLandDesc, SeaDesc, Shine } from '../../../model/types'
import { css, outline, type Ctx2D } from '../base/hand'
import { running, twinkling } from '../land/water'

/** The sea's body: the model's tones down the band. */
export function laySea(ctx: Ctx2D, s: SeaDesc): void {
  const g = ctx.createLinearGradient(0, s.top, 0, s.bottom)
  for (const [t, c] of s.stops) g.addColorStop(t, css(c))
  outline(ctx, s.points)
  ctx.fillStyle = g
  ctx.fill()
}

export function paintOutsideSea(ctx: Ctx2D, s: SeaDesc, shine: Shine, t: number) {
  laySea(ctx, s)
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
 * The place's own ground over the ridge line is printed by the near plane now, in its own inks and light (its outline
 * raised to the ground's top, `townGround.raisedOutline`): a fill of its own here would lie flat over the plane's shade,
 * marks and gullies. Kept, empty, for the outside painters that still call it.
 */
export function paintOutsideLand(_ctx: Ctx2D, _l: OutsideLandDesc, _shine: Shine): void {}
