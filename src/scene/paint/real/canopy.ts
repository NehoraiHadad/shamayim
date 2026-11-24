import { plantInk } from '../../model/canopyTones'
import type { LayerOf } from '../../model/types'
import { rng } from '../shared/base/core'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { paintCanopy, type CanopyHand } from '../shared/land/canopy'
import { MODELLED, type LeafyCrown } from '../shared/land/landVegCrowns'
import { BLACK } from '../shared/land/landVegPalm'
import type { ReceiverBrush } from '../shared/land/receiverBrush'

/*
 * Trees as the eye sees them from afar: a crown of leaf clumps, dark between and under them, lit on their tops, its edge
 * broken; no outline. The model's own inks a little drier; its own place, lean and gust; the shape is the tree's own.
 */

/** How far a plant's ink is taken toward its own grey. */
const DRY = 0.24
/** Clumps by the crown's size, at most; a clump's size of its crown's, its corners, how far they break its edge. */
const MANY = 1.5, MOST = 9, CLUMP = 0.44, CORNERS = 9, BREAK = 0.24
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

/** One clump's broken edge. */
function clump(path: CanvasPath, x: number, y: number, rx: number, ry: number, r: () => number) {
  const turn = r() * 6.28
  for (let n = 0; n < CORNERS; n++) {
    const a = turn + n / CORNERS * Math.PI * 2, k = 1 + BREAK * (r() * 2 - 1)
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k
    if (n) path.lineTo(px, py)
    else path.moveTo(px, py)
  }
  path.closePath()
}

function leaves(brush: ReceiverBrush, { cx, cy, rx, ry, r, phase, alpha, body, dark, lit }: LeafyCrown) {
  const random = rng(Math.round(phase * 1e4) + 3), y = cy - ry * RISE
  if (r < MODELLED) {
    clump(brush.path(), cx, y, rx * 0.92, ry * 0.92, random)
    brush.fill(body, 0.94 * alpha)
    return
  }
  const many = Math.min(MOST, 3 + Math.round(r * MANY)), seed = Math.round(random() * 1e6)
  // The clumps: one in the middle, the rest round it, the lower ones drawn in to the crown's flat foot.
  const at = Array.from({ length: many }, (_, n) => {
    const a = seed + n * 2.39996, out = n ? 0.5 + 0.16 * random() : 0.1, dy = Math.sin(a) * out
    return { x: cx + Math.cos(a) * out * rx, y: y + (dy > 0 ? dy * 0.72 : dy) * ry, up: -dy, k: CLUMP * (0.82 + 0.36 * random()) }
  })
  const pass = (size: number, rise: number, least: number) => {
    const path = brush.path(), edge = rng(seed)
    for (const c of at) if (c.up >= least) clump(path, c.x, c.y - rise * c.k * ry, c.k * rx * size, c.k * ry * size, edge)
  }
  pass(1.08, -0.1, -1)
  brush.fill(dark, 0.95 * alpha)
  pass(0.82, 0.16, -1)
  brush.fill(body, 0.85 * alpha)
  pass(0.5, 0.42, -0.25)
  brush.fill(lit, 0.6 * alpha)
}

const NATURAL: CanopyHand = { inks, crown: { foot, leaves } }

export const paintRealCanopy = (ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void => paintCanopy(ctx, desc, env, NATURAL)
