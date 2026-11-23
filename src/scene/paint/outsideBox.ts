import { smoothstep } from '../../domain/smoothstep'
import type { OutsideItem, RGB, Shine, SkyForm, Tones } from '../model/types'
import { rng } from './core'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { edgeStrips, facesOf } from './outsideLight'
import { paintFlatRoof, paintTileRoof } from './outsideRoof'
import { paintWindows, recessShare } from './outsideWindows'
import { paintBody, sideTone } from './townBody'
import { detailOf, melted, neighbourhood, risesOf, sidesOf, softEdge } from './townDetail'

/**
 * One built cell: its plaster front (lit by its own share when it faces the light), both side faces by theirs, its window
 * rows, a soft shade at its foot among the others; a house its tile roof or flat roof, a block of the mass its roof edge.
 * Its drawing follows its size (`townDetail`): what the eye cannot resolve melts into the wall's mean.
 */
export function paintBox(ctx: Ctx2D, b: Extract<OutsideItem, { kind: 'box' }>, t: Tones, s: Shine, lamps: Lamp[], f: SkyForm) {
  const r = rng(b.seed)
  const own = r()
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const fl = facesOf(s)
  const detail = detailOf(h / b.storeys), sides = sidesOf(b.w), rises = risesOf(h)
  const near = neighbourhood(b.x, b.foot)
  const tint = near.tint + (own - near.tint) * (.3 + .7 * sides)
  const face = Math.min(1, b.w * .26)
  const footH = Math.min(h * .4, 3), footA = (.16 + .14 * fl.on) * (h > 1.4 ? 1 : 0)

  const wall = mix(t.wall, t.stone, .1 + .45 * tint)
  const litTone = mix(t.lit, t.stoneLit, .3 * tint)
  const front = mix(wall, litTone, .85 * fl.front)
  const tones = melted({
    left: sideTone(front, t, litTone, fl.left, fl.on), front, right: sideTone(front, t, litTone, fl.right, fl.on),
  }, face / b.w, sides, near.flank)
  // The marks too small to be seen one by one, spread over the wall: its windows' dark, its foot's shade.
  const dark = recessShare(b, face, h) * (.5 - .2 * s.night) * (1 - detail) + footA * .5 * (footH / h) * (1 - rises)
  const settle = (c: RGB) => skyMean(mix(c, t.deep, dark), f, b.tier, h, rises)
  const soft = softEdge(detail, b.w)
  paintBody(ctx, x0, b.top, b.w, h, face, soft,
    { left: settle(tones.left), front: settle(tones.front), right: settle(tones.right) })

  const inX = x0 + soft, inW = b.w - 2 * soft
  skyLight(ctx, inX, b.top, inW, h, f, b.tier, rises, sides)
  // The foot among the others: the ground and the neighbours hide part of the sky there (soft, deeper in the sun's contrast).
  if (h > 1.4) {
    const g = ctx.createLinearGradient(0, b.foot - footH, 0, b.foot)
    g.addColorStop(0, css(t.deep, 0))
    g.addColorStop(1, css(t.deep, footA * rises))
    ctx.fillStyle = g
    ctx.fillRect(inX, b.foot - footH, inW, footH)
  }
  paintWindows(ctx, b, { r, face, wall, detail, fl }, t, s, lamps)
  if (b.roof === 'tile') paintTileRoof(ctx, b, t, fl, detail)
  else paintFlatRoof(ctx, b, { tint: own, detail, inX, inW, fl }, t, s, f)
}

/** The sky's light on a wall too low to show it turning, as one tone (`skyLight`'s mean). */
function skyMean(c: RGB, f: SkyForm, tier: number, h: number, rises: number): RGB {
  if (h < 1.2) return c
  const sky = f.tiers[tier], a = f.strength * (1 - rises)
  const up = Math.min(h * .3, 3) / h
  return mix(mix(c, sky.top, a * (.8 * up + .35 * Math.min(.25, 3 / h))), sky.foot, a * .75 * .4)
}

/**
 * The sky's light on a wall (`SkyForm`): lighter toward its top, which sees more of the sky, darker toward its foot among
 * the others; the side turned to the brighter half of the sky a little lighter, the other a little darker.
 */
function skyLight(ctx: Ctx2D, x0: number, top: number, w: number, h: number, f: SkyForm, tier: number, rises: number, sides: number) {
  if (h < 1.2) return
  const c = f.tiers[tier]
  const a = f.strength * rises
  ctx.fillStyle = css(c.top, .8 * a)
  ctx.fillRect(x0, top, w, Math.min(h * .3, 3))
  ctx.fillStyle = css(c.top, .35 * a)
  ctx.fillRect(x0, top + Math.min(h * .3, 3), w, Math.min(h * .25, 3))
  ctx.fillStyle = css(c.foot, .75 * a)
  ctx.fillRect(x0, top + h * .6, w, h * .4)
  if (w < 1.6) return
  const turn = .7 * f.strength * sides * smoothstep(1.6, 2.4, w)
  edgeStrips(ctx, x0, top, w, h, Math.min(1.2, w * .32), c.face, turn * Math.max(0, f.side), turn * Math.max(0, -f.side))
}
