import type { Tones } from '../../model/types'
import { css, mix, outline, type Ctx2D } from '../hand'
import type { Block } from './townBlocks'
import type { Planes, TownLight } from './townLight'

/* The drawn town's roofs (v1b's): a hipped tile roof of two clear planes, or a flat one seen as a light plane. Pure. */

/** A tile roof's height against its width, at most (px); its eave past the wall; its ridge against the width. */
const HIP = 0.42, HIP_MAX = 2.8, EAVE = 0.4, RIDGE = 0.34
/** A flat roof's plane: against the width and the height, at most (px). */
const FLAT = 0.18, FLAT_SHARE = 0.2, FLAT_MAX = 1.3
/** The parapet's shade on the wall under it (px) and its strength. */
const PARAPET = 0.5, PARAPET_DARK = 0.35

export function tileRoof(ctx: Ctx2D, b: Block, t: Tones, l: TownLight) {
  const x0 = b.x - b.w / 2 - EAVE, x1 = b.x + b.w / 2 + EAVE
  const top = b.top - Math.min(HIP_MAX, HIP * b.w + 0.2), eave = b.top + 0.2
  const ridge = (b.w * RIDGE) / 2
  const plane = (k: number) => css(mix(mix(t.roof, t.shade, 0.35 * (1 - k)), t.roofLit, Math.min(1, 0.35 * l.top + 0.8 * k)))
  // The two halves meet at the hip: each its own plane of the light.
  ctx.fillStyle = plane(l.left)
  outline(ctx, [[x0, eave], [b.x - ridge, top], [b.x + ridge * 0.2, top], [b.x + ridge * 0.2, eave]])
  ctx.fill()
  ctx.fillStyle = plane(l.right)
  outline(ctx, [[x1, eave], [b.x + ridge, top], [b.x + ridge * 0.2, top], [b.x + ridge * 0.2, eave]])
  ctx.fill()
  ctx.fillStyle = css(mix(t.roofLit, t.rim, 0.4), 0.35 + 0.5 * l.rim)
  ctx.fillRect(b.x - ridge, top - 0.1, 2 * ridge, 0.35)
  ctx.fillStyle = css(t.deep, 0.3)
  ctx.fillRect(x0 + EAVE, eave, b.w, 0.5)
}

export function flatRoof(ctx: Ctx2D, b: Block, t: Tones, planes: Planes, l: TownLight) {
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const deep = Math.max(0.45, Math.min(FLAT_MAX, FLAT * b.w, FLAT_SHARE * h))
  ctx.fillStyle = css(planes.roof)
  ctx.fillRect(x0, b.top, b.w, deep)
  ctx.fillStyle = css(mix(planes.roof, t.rim, 0.6), 0.5 + 0.4 * l.rim)
  ctx.fillRect(x0, b.top, b.w, 0.3)
  if (h > 2.4) {
    ctx.fillStyle = css(t.deep, PARAPET_DARK)
    ctx.fillRect(x0, b.top + deep, b.w, Math.min(PARAPET, 0.2 * h))
  }
  if (b.heater && b.w > 2.6) heater(ctx, b, t, planes)
}

/** A solar heater: its drum and its panel. */
function heater(ctx: Ctx2D, b: Block, t: Tones, planes: Planes) {
  const x = b.x + b.w * (((b.seed >>> 3) % 9) / 9 - 0.5) * 0.5
  ctx.fillStyle = css(planes.roof)
  ctx.fillRect(x, b.top - 0.8, 1.2, 0.6)
  ctx.fillStyle = css(t.panel)
  outline(ctx, [[x - 1.2, b.top + 0.2], [x - 0.1, b.top - 0.8], [x - 0.1, b.top + 0.2]])
  ctx.fill()
}
