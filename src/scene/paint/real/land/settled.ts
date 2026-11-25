import type { LayerOf } from '../../../model/types'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import { bodiesOf, livedOn, townMarks, type Lane } from '../../shared/land/townGround'

/*
 * The town's ground on the real plane's texels: how much of each is lived on, and its lanes, yards, gardens and small trees,
 * each as a share of the texel it covers (its edge antialiased at the texel), so they take the ground's own grain and light.
 */

export interface Settled {
  /** Lived-on ground, lane, trodden yard, garden, a small tree's crown (0 … 1 each); the tree's height (px). */
  lived: Float32Array; lane: Float32Array; yard: Float32Array; garden: Float32Array; tree: Float32Array; lift: Float32Array
}

/** How much a lane wears away along its length, and over what (px). */
const WORN = 0.45, WORN_PX = 5

export function settledOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>): Settled | null {
  const town = desc.town, bodies = town ? bodiesOf(town) : []
  if (!town || !bodies.length) return null
  const { wPx: cols, hPx: rows, bounds, texel } = t, cells = cols * rows, seed = desc.grain.seed
  const grid = { x: bounds.x + texel / 2, y: bounds.y + texel / 2, cols, rows, cell: texel }
  const out: Settled = { lived: livedOn(bodies, grid, seed), lane: new Float32Array(cells), yard: new Float32Array(cells),
    garden: new Float32Array(cells), tree: new Float32Array(cells), lift: new Float32Array(cells) }
  const { lanes, patches, shrubs } = townMarks(town)
  // Each mark over the texels of its box: `at` gives a texel's share of it from its middle (px).
  const over = (x0: number, x1: number, y0: number, y1: number, at: (x: number, y: number, n: number) => void) => {
    const i0 = Math.max(0, Math.floor((x0 - bounds.x) / texel)), i1 = Math.min(cols - 1, Math.ceil((x1 - bounds.x) / texel))
    const j0 = Math.max(0, Math.floor((y0 - bounds.y) / texel)), j1 = Math.min(rows - 1, Math.ceil((y1 - bounds.y) / texel))
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) at(bounds.x + (i + 0.5) * texel, bounds.y + (j + 0.5) * texel, j * cols + i)
  }
  for (const lane of lanes) line(lane, texel, seed, over, out.lane)
  for (const p of patches) {
    const into = p.garden ? out.garden : out.yard
    over(p.x - p.rx - texel, p.x + p.rx + texel, p.y - p.ry - texel, p.y + p.ry + texel, (x, y, n) => {
      // Its edge wanders, so a yard is a worn patch, not an oval.
      const dx = (x - p.x) / (p.rx + texel / 2), dy = (y - p.y) / (p.ry + texel / 2)
      const d = Math.sqrt(dx * dx + dy * dy) + wobble(p.seed, dx, dy)
      into[n] = Math.max(into[n], smooth(1, 0.6, d))
    })
  }
  for (const s of shrubs) {
    const cy = s.base - 0.5 * s.h, rx = s.w / 2 + texel / 2, ry = s.h / 2 + texel / 2
    over(s.x - rx, s.x + rx, cy - ry, cy + ry, (x, y, n) => {
      const dx = (x - s.x) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy + wobble(s.seed, dx, dy)
      const crown = smooth(1, 0.55, d)
      if (crown <= out.tree[n]) return
      out.tree[n] = crown
      out.lift[n] = Math.max(out.lift[n], 0.9 * s.h * Math.sqrt(Math.max(0, 1 - d)))
    })
  }
  return out
}

type Over = (x0: number, x1: number, y0: number, y1: number, at: (x: number, y: number, n: number) => void) => void

/** A lane's share of each texel: its width antialiased at the texel, worn here and there along it. */
function line({ pts, wide }: Lane, texel: number, seed: number, over: Over, into: Float32Array) {
  const half = wide / 2
  let gone = 0
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], dx = bx - ax, dy = by - ay, long = Math.max(1e-6, dx * dx + dy * dy), from = gone
    gone += Math.sqrt(long)
    over(Math.min(ax, bx) - half - texel, Math.max(ax, bx) + half + texel, Math.min(ay, by) - half - texel, Math.max(ay, by) + half + texel, (x, y, n) => {
      const u = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / long)), d = Math.hypot(x - ax - u * dx, y - ay - u * dy)
      const share = Math.min(1, Math.max(0, (half + texel / 2 - d) / texel)) * Math.min(1, (half * 2 + 0.2) / texel)
      const along = (from + u * Math.sqrt(long)) / WORN_PX, worn = 1 - WORN * smooth(0.5, 0.9, Math.sin(along + seed) * Math.sin(0.61 * along + 2 * seed))
      into[n] = Math.max(into[n], share * worn)
    })
  }
}

/** A small turn of an edge round its middle, by the angle: two slow waves, a mark's own. */
function wobble(seed: number, dx: number, dy: number): number {
  const a = Math.atan2(dy, dx), p = (seed % 997) / 997 * 2 * Math.PI
  return 0.1 * Math.sin(3 * a + p) + 0.07 * Math.sin(5 * a + 2.3 * p)
}

function smooth(lo: number, hi: number, v: number): number {
  const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}
