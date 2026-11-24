import { plantInk } from '../../model/canopyTones'
import type { LayerOf } from '../../model/types'
import { rng } from '../shared/base/core'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { paintCanopy, type CanopyHand } from '../shared/land/canopy'
import { MODELLED, traceCrownLobes, type Crown } from '../shared/land/landVegCrowns'
import { mapInk, type ReceiverBrush } from '../shared/land/receiverBrush'
import { carve, type P } from './kit/carve'
import { calm, pigment, valued } from './kit/palette'

/* Trees as prints: the model's own crowns in purer inks, a key line round each and a few leaf cuts inside it. */

/** The key's value from the crown's and its strength; its width (px) and by the crown's size, at most. */
const KEY = -0.17, STRONG = 0.85, WIDE = 0.2, BY_SIZE = 0.09, MOST = 0.7
/** The leaf cuts by the crown's size, at most, and their width against the key's. */
const CUTS = 1.2, CUTS_MOST = 9, CUT = 0.6

const held = new WeakMap<Uint8Array, Uint8Array>()

/** A plant's inks (three bytes each) as the hand mixes them. */
function inks(bytes: Uint8Array): Uint8Array {
  let out = held.get(bytes)
  if (!out) {
    held.set(bytes, out = new Uint8Array(bytes.length))
    for (let o = 0; o < bytes.length; o += 3) out.set(calm(plantInk(bytes, o), 0.2).map((c) => Math.round(c * 255)), o)
  }
  return out
}

function dress(brush: ReceiverBrush, { cx, cy, rx, ry, r, phase, lobes, alpha, body }: Crown) {
  if (r < MODELLED) return
  const key = mapInk(body, (rgb) => pigment(valued(rgb, KEY), -0.6, 1)), wide = Math.min(MOST, WIDE + BY_SIZE * r)
  traceCrownLobes(brush.path(), cx, cy, rx, ry, phase, lobes)
  brush.stroke(key, STRONG * alpha, wide)
  const random = rng(Math.round(phase * 1000) + 5), path = brush.path()
  for (let n = Math.min(CUTS_MOST, Math.round(r * CUTS)); n > 0; n--) {
    const a = random() * 2 * Math.PI, out = 0.55 * Math.sqrt(random()), s = 0.16 + 0.1 * random()
    const x = cx + rx * (0.1 + Math.cos(a) * out), y = cy + ry * (0.12 + Math.sin(a) * out)
    carve(path, [-1, -0.5, 0, 0.5, 1].map((u): P => [x + u * rx * s, y - (1 - u * u) * ry * s * 0.8]), wide * CUT, n, 0.9)
  }
  brush.fill(key, STRONG * alpha)
}

const PRINT: CanopyHand = { inks, dress }

export const paintDrawnCanopy = (ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void => paintCanopy(ctx, desc, env, PRINT)
