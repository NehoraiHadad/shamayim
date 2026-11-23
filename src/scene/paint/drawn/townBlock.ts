import type { Tones } from '../../model/types'
import { rng } from '../shared/base/core'
import type { Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import type { SkyForm } from './light/skyForm'
import type { Block } from './townBlocks'
import { planesOf, plasterOf, sidesOf, type Planes, type TownLight } from './townLight'
import { flatRoof, tileRoof } from './townRoof'
import { townWindows } from './townWindows'

/*
 * A house or a block of the drawn town (v1b's stone boxes): its front, one wide lit plane on the light's side and a shade
 * plane on the other, its roof catching the sky, a few windows, its foot in the ground's shade. Pure: the block's seed.
 */

/** The dark it lays on what stands behind it: how far round it (px) and how strong. */
const GAP = 0.5, GAP_DARK = 0.3
/** The foot's shade: its share of the height, at most (px), its strength. */
const FOOT = 0.34, FOOT_MAX = 3.4, FOOT_DARK = 0.3
/** The sky's light down a tall body (`SkyForm`): its top's share of the height and the strengths of top and foot. */
const SKY_TOP = 0.3, SKY = 0.4, SKY_FOOT = 0.5

export function paintBlock(ctx: Ctx2D, b: Block, t: Tones, l: TownLight, form: SkyForm, lamps: Lamp[], windows: number) {
  const r = rng(b.seed ^ 0x3c1), stone = r()
  const x0 = b.x - b.w / 2, h = b.foot - b.top, plaster = plasterOf(t, stone)
  const planes = planesOf(t, l, plaster, stone), sides = sidesOf(l, b.w)
  ctx.fillStyle = css(t.deep, GAP_DARK)
  ctx.fillRect(x0 - GAP, b.top - GAP * 0.6, b.w + 2 * GAP, h + GAP * 0.9)
  bodyPlanes(ctx, x0, b.top, b.w, h, sides, planes)
  if (h > 2) {
    const sky = form.tiers[b.tier]
    ctx.fillStyle = css(sky.top, SKY * form.strength)
    ctx.fillRect(x0, b.top, b.w, h * SKY_TOP)
    ctx.fillStyle = css(sky.foot, SKY_FOOT * form.strength)
    ctx.fillRect(x0, b.foot - h * SKY_TOP, b.w, h * SKY_TOP)
  }
  townWindows(ctx, b, t, l, { x0: x0 + sides[0], x1: x0 + b.w - sides[1] }, plaster, r, lamps, windows)
  footShade(ctx, x0, b.w, b.foot, h, t, FOOT_DARK * (0.6 + 0.4 * l.on))
  if (b.roof === 'tile') tileRoof(ctx, b, t, l)
  else flatRoof(ctx, b, t, planes, l)
}

/** The three planes of a standing body, the front between its sides. */
export function bodyPlanes(ctx: Ctx2D, x: number, top: number, w: number, h: number, [left, right]: readonly [number, number], p: Planes) {
  ctx.fillStyle = css(p.front)
  ctx.fillRect(x, top, w, h)
  ctx.fillStyle = css(p.left)
  ctx.fillRect(x, top, left, h)
  ctx.fillStyle = css(p.right)
  ctx.fillRect(x + w - right, top, right, h)
}

/** The ground's shade at a body's foot, fading up it, and its contact line. */
export function footShade(ctx: Ctx2D, x: number, w: number, foot: number, h: number, t: Tones, dark: number) {
  const deep = Math.min(FOOT_MAX, FOOT * h)
  for (let n = 0; n < 3; n++) {
    const part = (deep * (3 - n)) / 3
    ctx.fillStyle = css(t.deep, dark * 0.4)
    ctx.fillRect(x, foot - part, w, part)
  }
  ctx.fillStyle = css(mix(t.deep, t.shade, 0.2), dark)
  ctx.fillRect(x - 0.4, foot - 0.25, w + 0.8, 0.5)
}
