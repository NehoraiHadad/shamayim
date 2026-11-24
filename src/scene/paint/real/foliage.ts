import { rng } from '../shared/base/core'
import type { ReceiverBrush, ReceiverInk } from '../shared/land/receiverBrush'

/*
 * A crown as the eye sees it from afar: a mass of leaf clumps, dark between and under them, lit on their tops, its edge
 * broken; no outline. Laid in layers, each the same clumps smaller and farther up. Pure: a place and a seed.
 */

export interface CrownAt { x: number; y: number; rx: number; ry: number }
/** A layer: its clumps' size, how far they are moved up and across (of a clump), and how high a clump must stand to be in it (−1 all). */
export interface Layer { size: number; up: number; across?: number; least: number }

/** A crown too small for clumps; the dark between them; the leaves; their tops. */
export const WHOLE: Layer = { size: 1, up: 0, least: -1 }
export const UNDER: Layer = { size: 1.08, up: -0.1, least: -1 }
export const BODY: Layer = { size: 0.82, up: 0.16, least: -1 }
export const TOPS: Layer = { size: 0.5, up: 0.42, least: -0.25 }

/** Clumps by the crown's size (px), at most; a clump's size of its crown's, how far its corners break the edge. */
const MANY = 1.5, MOST = 9, CLUMP = 0.44, BREAK = 0.24
/** From which size (px) a crown is large; a clump's corners in a small crown and in a large one. */
export const LARGE = 2.2
const CORNERS = [6, 9] as const

/** One crown's clumps, ready to be laid a layer at a time. */
export function foliage(brush: ReceiverBrush, { x, y, rx, ry }: CrownAt, seed: number): (ink: ReceiverInk, alpha: number, layer: Layer) => void {
  const random = rng(seed), many = Math.min(MOST, 3 + Math.round(rx * MANY)), turn = random() * 6.28, own = Math.round(random() * 1e6)
  // One clump in the middle, the rest round it, the lower ones drawn in to the crown's flat foot.
  const clumps = Array.from({ length: many }, (_, n) => {
    const a = turn + n * 2.39996, out = n ? 0.5 + 0.16 * random() : 0.1, dy = Math.sin(a) * out
    return { x: x + Math.cos(a) * out * rx, y: y + (dy > 0 ? dy * 0.72 : dy) * ry, high: -dy, k: CLUMP * (0.82 + 0.36 * random()) }
  })
  const corners = CORNERS[rx < LARGE ? 0 : 1]
  return (ink, alpha, { size, up, across = 0, least }) => {
    const path = brush.path(), edge = rng(own)
    for (const c of clumps) {
      const at = edge() * 6.28
      if (c.high < least) continue
      const w = c.k * rx, h = c.k * ry
      for (let n = 0; n < corners; n++) {
        const a = at + n / corners * Math.PI * 2, k = size * (1 + BREAK * (edge() * 2 - 1))
        const px = c.x + across * w + Math.cos(a) * w * k, py = c.y - up * h + Math.sin(a) * h * k
        if (n) path.lineTo(px, py)
        else path.moveTo(px, py)
      }
      path.closePath()
    }
    brush.fill(ink, alpha)
  }
}
