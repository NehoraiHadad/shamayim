import type { LayerOf } from '../../model/types'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { paintCanopy, type CanopyHand } from '../shared/land/canopy'
import { MODELLED, type LeafyCrown } from '../shared/land/landVegCrowns'
import { BLACK } from '../shared/land/landVegPalm'
import type { ReceiverBrush } from '../shared/land/receiverBrush'
import { BODY, foliage, TOPS, UNDER, WHOLE } from './foliage'

/*
 * The land's plants in natural light: crowns of leaf clumps (`foliage`) over a soft shade of their own. The model's
 * own inks, place, lean and gust; palms and tufts as everywhere.
 */

/** How far the crown stands up from the model's anchor, of its half height: its foot is on the ground. */
const RISE = 0.16
/** The foot's shade: its half width by the crown's, its strength. */
const FOOT = [[1.35, 0.24], [1, 0.3], [0.62, 0.27]] as const

function foot(brush: ReceiverBrush, x: number, y: number, r: number, alpha: number) {
  for (const [wide, strong] of FOOT) {
    brush.path().ellipse(x, y + 0.15, r * wide, Math.max(0.3, r * wide * 0.3), 0, 0, Math.PI * 2)
    brush.fill(BLACK, strong * alpha)
  }
}

function leaves(brush: ReceiverBrush, { cx, cy, rx, ry, r, phase, alpha, body, dark, lit }: LeafyCrown) {
  const layer = foliage(brush, { x: cx, y: cy - ry * RISE, rx, ry }, Math.round(phase * 1e4) + 3)
  if (r < MODELLED) return layer(body, 0.96 * alpha, WHOLE)
  layer(dark, 0.95 * alpha, UNDER)
  layer(body, 0.96 * alpha, BODY)
  layer(lit, 0.74 * alpha, TOPS)
}

/** How far a plant's inks are drawn toward their own grey and the dry ground's warmth, so it sits in the land. */
const DULL = 0.42, WARMTH = [1.04, 1, 0.9] as const

const dulled = new WeakMap<Uint8Array, Uint8Array>()

/** The plants' inks, their green quieted toward the land's olive: kept for each set of inks the model gives. */
function inks(bytes: Uint8Array): Uint8Array {
  let held = dulled.get(bytes)
  if (held) return held
  held = new Uint8Array(bytes.length)
  for (let o = 0; o + 2 < bytes.length; o += 3) {
    const r = bytes[o], g = bytes[o + 1], b = bytes[o + 2], y = 0.3 * r + 0.55 * g + 0.15 * b
    held[o] = Math.min(255, Math.round((r + (y - r) * DULL) * WARMTH[0]))
    held[o + 1] = Math.min(255, Math.round((g + (y - g) * DULL) * WARMTH[1]))
    held[o + 2] = Math.min(255, Math.round((b + (y - b) * DULL) * WARMTH[2]))
  }
  dulled.set(bytes, held)
  return held
}

const NATURAL: CanopyHand = { inks, crown: { foot, leaves } }

export const paintRealCanopy = (ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void => paintCanopy(ctx, desc, env, NATURAL)
