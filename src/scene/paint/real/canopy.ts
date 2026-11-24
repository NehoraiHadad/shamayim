import { plantInk } from '../../model/canopyTones'
import type { LayerOf } from '../../model/types'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { paintCanopy, type CanopyHand } from '../shared/land/canopy'
import { MODELLED, type LeafyCrown } from '../shared/land/landVegCrowns'
import { BLACK } from '../shared/land/landVegPalm'
import type { ReceiverBrush } from '../shared/land/receiverBrush'
import { BODY, foliage, TOPS, UNDER, WHOLE } from './foliage'

/*
 * The land's plants in natural light: crowns of leaf clumps (`foliage`) over a soft shade of their own. The model's inks a
 * little drier; its own place, lean and gust; palms and tufts as everywhere.
 */

/** How far a plant's ink is taken toward its own grey. */
const DRY = 0.24
/** How far the crown stands up from the model's anchor, of its half height: its foot is on the ground. */
const RISE = 0.16
/** The foot's shade: its half width by the crown's, its strength. */
const FOOT = [[1.35, 0.1], [1, 0.13], [0.62, 0.14]] as const

const held = new WeakMap<Uint8Array, Uint8Array>()

function inks(bytes: Uint8Array): Uint8Array {
  let out = held.get(bytes)
  if (!out) {
    held.set(bytes, out = new Uint8Array(bytes.length))
    for (let o = 0; o < bytes.length; o += 3) {
      const rgb = plantInk(bytes, o), grey = 0.3 * rgb[0] + 0.55 * rgb[1] + 0.15 * rgb[2]
      out.set(mix(rgb, [grey, grey, grey], DRY).map((c) => Math.round(c * 255)), o)
    }
  }
  return out
}

function foot(brush: ReceiverBrush, x: number, y: number, r: number, alpha: number) {
  for (const [wide, strong] of FOOT) {
    brush.path().ellipse(x, y + 0.15, r * wide, Math.max(0.3, r * wide * 0.3), 0, 0, Math.PI * 2)
    brush.fill(BLACK, strong * alpha)
  }
}

function leaves(brush: ReceiverBrush, { cx, cy, rx, ry, r, phase, alpha, body, dark, lit }: LeafyCrown) {
  const layer = foliage(brush, { x: cx, y: cy - ry * RISE, rx, ry }, Math.round(phase * 1e4) + 3)
  if (r < MODELLED) return layer(body, 0.94 * alpha, WHOLE)
  layer(dark, 0.95 * alpha, UNDER)
  layer(body, 0.85 * alpha, BODY)
  layer(lit, 0.6 * alpha, TOPS)
}

const NATURAL: CanopyHand = { inks, crown: { foot, leaves } }

export const paintRealCanopy = (ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void => paintCanopy(ctx, desc, env, NATURAL)
