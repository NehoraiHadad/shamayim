import type { OutsideItem, RGB, Shine, Tones } from '../../../../src/scene/model/types'
import { css, mix, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'

/*
 * The light on a house: a side in the sun and a side in the sky's shade, a top open to the sky, a foot in its neighbours'
 * shade, a bright edge against the light, and the shade it throws on what stands behind and beside it. The model's own
 * faces, cast and tones; nothing by night.
 */

/** The foot's shade, the top's sky, the sunlit side, the shaded side and the edge, at full. */
const FOOT = 0.26, OPEN = 0.2, SUN = 0.42, SHADE = 0.34, EDGE = 0.8
/** What backlight's air lays over a front that faces away from the sun. */
const AIR = 0.16
/** A cast's opacity, and how far across it may reach (of the house's height, px at most). */
const CAST = 0.5, REACH = 0.75, FARTHEST = 12
const WARM: RGB = [1, 0.965, 0.88]

type Body = Extract<OutsideItem, { kind: 'box' | 'tower' }>
type House = Extract<OutsideItem, { kind: 'box' }>
const bodyOf = (b: Body) => b.kind === 'box'
  ? { x: b.x - b.w / 2, y: b.top, w: b.w, h: b.foot - b.top } : { x: b.x - b.w / 2, y: b.base - b.h, w: b.w, h: b.h }

/** A house's cast, over the ones already standing behind it: the shade between neighbours. */
export function houseCast(ctx: Ctx2D, house: House, t: Tones, s: Shine) {
  const { x, y, w, h } = bodyOf(house), { dx, length, alpha } = s.cast
  const reach = Math.min(FARTHEST, length * h * REACH * Math.min(1, Math.abs(dx) * 1.6))
  if (alpha <= 0.02 || reach < 0.4 || h < 1.5) return
  const dir = Math.sign(dx), from = dir > 0 ? x + w : x, to = from + dir * reach
  const g = ctx.createLinearGradient(from, 0, to, 0)
  g.addColorStop(0, css(t.shade, CAST * alpha))
  g.addColorStop(1, css(t.shade, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(from, y + 0.25 * h)
  ctx.lineTo(to, y + 0.8 * h)
  ctx.lineTo(to, y + h + 0.5)
  ctx.lineTo(from, y + h + 0.5)
  ctx.closePath()
  ctx.fill()
}

export function houseLight(ctx: Ctx2D, item: Body, top: RGB, t: Tones, s: Shine, side: number) {
  const { x, y, w, h } = bodyOf(item), day = 1 - s.night
  if (h < 1.5 || w < 1 || day < 0.02) return
  const beam = day * s.direct
  const down = ctx.createLinearGradient(0, y, 0, y + h)
  down.addColorStop(0, css(top, OPEN * day))
  down.addColorStop(0.4, css(top, 0))
  down.addColorStop(0.45, css(t.deep, 0.06 * FOOT * day))
  down.addColorStop(1, css(t.deep, FOOT * day))
  ctx.fillStyle = down
  ctx.fillRect(x, y, w, h)
  // Against the light a front is seen through the bright air before it.
  const backlit = beam * (1 - Math.min(1, s.faces.front * 2))
  if (backlit > 0.02) {
    ctx.fillStyle = css(t.mist, AIR * backlit)
    ctx.fillRect(x, y, w, h)
  }
  if (beam < 0.02) return
  const lean = Math.abs(side)
  if (lean > 0.05) {
    const across = side > 0 ? ctx.createLinearGradient(x + w, 0, x, 0) : ctx.createLinearGradient(x, 0, x + w, 0)
    const warm = mix(t.stoneLit, WARM, 0.7), cool = mix(t.shade, t.deep, 0.35)
    across.addColorStop(0, css(warm, SUN * beam * lean))
    across.addColorStop(0.42, css(warm, 0.3 * SUN * beam * lean))
    across.addColorStop(0.5, css(warm, 0))
    across.addColorStop(0.5, css(cool, 0))
    across.addColorStop(0.72, css(cool, 0.7 * SHADE * beam * lean))
    across.addColorStop(1, css(cool, SHADE * beam * lean))
    ctx.fillStyle = across
    ctx.fillRect(x, y, w, h)
  }
  const edge = EDGE * day * Math.max(s.faces.rim, 0.5 * s.faces.top * s.direct), thin = Math.min(0.7, 0.12 * h)
  if (edge < 0.03 || w < 2) return
  ctx.fillStyle = css(mix(top, WARM, 0.7), Math.min(0.85, edge))
  ctx.fillRect(x, y, w, thin)
}
