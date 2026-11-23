import type { OutsideItem, Shine, SkyForm, Tones } from '../model/types'
import { css, mix, type Ctx2D } from './hand'
import type { facesOf } from './outsideLight'

type Box = Extract<OutsideItem, { kind: 'box' }>
type Faces = ReturnType<typeof facesOf>

/** A hipped tile roof: each plane by its own share of the light, its eave's soft shade under it. */
export function paintTileRoof(ctx: Ctx2D, b: Box, t: Tones, fl: Faces, detail: number) {
  const x0 = b.x - b.w / 2, x1 = x0 + b.w
  const rh = Math.min(2.2, .45 * b.w + .3)
  ctx.fillStyle = css(t.roof)
  ctx.beginPath()
  ctx.moveTo(x0 - .35, b.top + .15); ctx.lineTo(x0 + b.w * .35, b.top - rh); ctx.lineTo(x0 + b.w * .65, b.top - rh); ctx.lineTo(x1 + .35, b.top + .15)
  ctx.closePath()
  ctx.fill()
  const planes = [[fl.left, 1], [fl.right, -1]] as const
  for (const [k, dir] of planes) {
    const a = Math.min(1, .6 * k + .55 * fl.top)
    ctx.fillStyle = css(t.roofLit, a)
    ctx.beginPath()
    if (dir > 0) { ctx.moveTo(x0 - .35, b.top + .15); ctx.lineTo(x0 + b.w * .35, b.top - rh); ctx.lineTo(x0 + b.w * .5, b.top - rh); ctx.lineTo(x0 + b.w * .3, b.top + .15) }
    else { ctx.moveTo(x1 + .35, b.top + .15); ctx.lineTo(x0 + b.w * .65, b.top - rh); ctx.lineTo(x0 + b.w * .5, b.top - rh); ctx.lineTo(x0 + b.w * .7, b.top + .15) }
    ctx.closePath()
    ctx.fill()
  }
  // A back-lit roof: its ridge line catches the light beyond.
  ctx.fillStyle = css(t.rim, .7 * fl.rim * detail)
  ctx.fillRect(x0 + b.w * .35, b.top - rh, b.w * .3, .3)
  const eave = .4 + .6 * detail
  ctx.fillStyle = css(t.shade, .5 * eave)
  ctx.fillRect(x0, b.top + .15, b.w, .35)
  ctx.fillStyle = css(t.shade, (.18 + .17 * fl.on) * eave)
  ctx.fillRect(x0, b.top + .5, b.w, .45)
}

/** Heights of a flat roof's edge, its parapet's dark line and the shade under it, px. */
const EDGE = .45, LINE = .3, UNDER = .4

interface Roof { tint: number; detail: number; inX: number; inW: number; fl: Faces }

/**
 * A flat roof: its edge catches the sky, the light from above, or the light beyond it; a parapet's dark line under it; a
 * solar heater on some houses. Where the lines are not resolved, their light and dark lie together on the wall's top.
 */
export function paintFlatRoof(ctx: Ctx2D, b: Box, { tint, detail, inX, inW, fl }: Roof, t: Tones, s: Shine, f: SkyForm) {
  const x0 = b.x - b.w / 2
  const sky = mix(t.rim, f.tiers[b.tier].top, f.strength)
  const up = Math.min(1, fl.top + .3 * Math.max(fl.left, fl.right) + .5 * fl.rim)
  const edge = mix(sky, mix(t.rim, t.lit, .3), up)
  const bright = (.55 + .3 * tint) * (1 - .45 * s.night), under = .1 + .1 * fl.on
  const light = bright * EDGE, dark = .35 * LINE + under * UNDER
  const spread = Math.max(EDGE + LINE + UNDER, (b.foot - b.top) * .4)
  ctx.fillStyle = css(mix(t.deep, edge, light / (light + dark)), (light + dark) / spread * (1 - detail))
  ctx.fillRect(inX, b.top, inW, Math.min(spread, b.foot - b.top))
  ctx.fillStyle = css(edge, bright * detail)
  ctx.fillRect(x0, b.top, b.w, EDGE)
  ctx.fillStyle = css(t.deep, .35 * detail)
  ctx.fillRect(x0, b.top + EDGE, b.w, LINE)
  ctx.fillStyle = css(t.deep, under * detail)
  ctx.fillRect(x0, b.top + EDGE + LINE, b.w, UNDER)
  if (b.heater && b.w > 2.6) {
    const hx = x0 + b.w * (.3 + .4 * tint), shown = .3 + .7 * detail
    ctx.fillStyle = css(mix(t.stoneLit, t.lit, .3), shown)
    ctx.fillRect(hx, b.top - .9, 1.1, .5)
    ctx.fillStyle = css(t.panel, shown)
    ctx.beginPath()
    ctx.moveTo(hx - 1.2, b.top); ctx.lineTo(hx - .15, b.top - .8); ctx.lineTo(hx - .15, b.top)
    ctx.closePath()
    ctx.fill()
  }
}
