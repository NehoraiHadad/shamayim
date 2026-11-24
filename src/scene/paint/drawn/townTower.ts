import { DRAWN_PODIUM_OVERHANG, towerMastHeight } from '../../../world/portraitMargins'
import type { OutsideItem, Shine, Tones } from '../../model/types'
import { rng } from '../shared/base/core'
import { aviationLamp, type Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import type { SkyForm } from './outsideOwn'
import { bodyPlanes, footShade } from './townBlock'
import { planesOf, plasterOf, sidesOf, type TownLight } from './townLight'
import { townWindows } from './townWindows'

/*
 * A tower of the drawn town (v1b's Carmel tower): a shaft with one lit side and one in shade, its floors as a calm grid, a
 * podium, its own crown. A glass one mirrors the sky up its height. Pure: the tower's seed.
 */

/** The crown: a setback's share of the height and at most (px), its width; a mast's height. */
const SETBACK = 0.14, SETBACK_MAX = 4, SETBACK_W = 0.62
/** A full tower's podium past its sides, its share of the height and at most (px). */
const PODIUM_SHARE = 0.12, PODIUM_MAX = 3
/** A glass shaft's share of glass, and how far its top mirrors the sky. */
const GLASS = 0.55, MIRROR = 0.5
/** The floors' lines: their least spacing (px) and strength. */
const FLOOR = 2.6, FLOOR_DARK = 0.2
/** The outline's dark on what stands behind. */
const GAP = 0.5, GAP_DARK = 0.28

export function paintDrawnTower(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, l: TownLight, form: SkyForm,
  s: Shine, lamps: Lamp[]) {
  const r = rng(tw.seed * 7 + 1), stone = r(), day = 1 - s.night
  const x0 = tw.x - tw.w / 2, top = tw.base - tw.h, sides = sidesOf(l, tw.w)
  const setback = tw.crown === 1 ? Math.min(tw.h * SETBACK, SETBACK_MAX) : 0, shaft = top + setback
  const plaster = tw.full ? mix(plasterOf(t, 0.4 * stone), t.glass, GLASS * day) : plasterOf(t, 0.3 + 0.5 * stone)
  const planes = planesOf(t, l, plaster, stone), sky = form.tiers[tw.tier]
  ctx.fillStyle = css(t.deep, GAP_DARK)
  ctx.fillRect(x0 - GAP, shaft - GAP * 0.6, tw.w + 2 * GAP, tw.base - shaft)
  bodyPlanes(ctx, x0, shaft, tw.w, tw.base - shaft, sides, planes)
  // The sky's light down the shaft: a glass one mirrors it, its foot in the town's shade.
  const g = ctx.createLinearGradient(0, shaft, 0, tw.base)
  g.addColorStop(0, css(mix(sky.top, t.glassLit, tw.full ? 0.5 : 0), tw.full ? MIRROR * day : 0.4 * form.strength))
  g.addColorStop(0.55, css(sky.top, 0))
  g.addColorStop(0.75, css(sky.foot, 0))
  g.addColorStop(1, css(sky.foot, 0.5 * form.strength))
  ctx.fillStyle = g
  ctx.fillRect(x0, shaft, tw.w, tw.base - shaft)
  const every = Math.max(FLOOR, (tw.base - shaft) / tw.storeys * 2)
  ctx.fillStyle = css(t.deep, FLOOR_DARK * (0.4 + 0.6 * day))
  for (let y = shaft + every; y < tw.base - every * 0.6; y += every) ctx.fillRect(x0 + 0.3, y, tw.w - 0.6, 0.35)
  if (!tw.full) footShade(ctx, x0, tw.w, tw.base, tw.h * 0.6, t, 0.25)
  townWindows(ctx, { top: shaft + 0.6, foot: tw.base - 1, storeys: tw.storeys }, t, l, { x0: x0 + sides[0], x1: x0 + tw.w - sides[1] },
    plaster, r, lamps, s.windows * 0.8)
  if (setback) {
    const cw = tw.w * SETBACK_W
    bodyPlanes(ctx, tw.x - cw / 2, top, cw, setback, sidesOf(l, cw), planes)
    roofEdge(tw.x - cw / 2, top, cw)
  }
  roofEdge(x0, shaft, tw.w)
  let tip = top
  if (tw.crown === 2) {
    tip = top - towerMastHeight(tw.h)
    ctx.fillStyle = css(mix(planes.front, t.rim, 0.3))
    ctx.fillRect(tw.x - 0.3, tip, 0.6, top - tip)
  }
  if (tw.full) {
    const ph = Math.min(PODIUM_MAX, tw.h * PODIUM_SHARE), pw = tw.w + 2 * DRAWN_PODIUM_OVERHANG
    bodyPlanes(ctx, tw.x - pw / 2, tw.base - ph, pw, ph, sidesOf(l, pw), planesOf(t, l, plasterOf(t, stone), stone))
    roofEdge(tw.x - pw / 2, tw.base - ph, pw)
    footShade(ctx, tw.x - pw / 2, pw, tw.base, ph, t, 0.3)
  }
  if (tw.full || tw.storeys >= 30) lamps.push(aviationLamp(tw.x, tip - 0.4, s))

  function roofEdge(x: number, y: number, w: number) {
    ctx.fillStyle = css(planes.roof)
    ctx.fillRect(x, y, w, 0.6)
  }
}
