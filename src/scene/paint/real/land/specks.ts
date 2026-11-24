import { TEXEL } from '../../../model/planeBands'
import { fieldSample, samplePlaneField } from '../../../model/planeField'
import type { LayerOf } from '../../../model/types'
import { rng } from '../../shared/base/core'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverBrush, ReceiverInk } from '../../shared/land/receiverBrush'

/* The smallest scrub and stones, finer than the ground's texels: smaller toward the crest, fainter in the air. */

/** A speck: its place and its half width (px). */
export type Speck = readonly [x: number, y: number, r: number]

/** The px² of ground a place is tried in; the share taken where no scrub stands; a speck's half width at the crest and at the foot. */
const EVERY = 32, BARE = 0.05, SIZE = [0.3, 0.85] as const
const INK: ReceiverInk = [[0.06, 0.08, 0.03]]
/** A speck's opacity in clear air; the steps of air it is inked in. */
const ALPHA = 0.26, STEPS = 4

/** The specks of a plane, by its scrub (0–1 a texel). */
export function specksOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>, scrub: Float32Array): Speck[] {
  const { bounds, vegetation } = desc, r = rng(t.seed + 97), out: Speck[] = []
  for (let n = Math.round(bounds.w * bounds.h / EVERY * t.grainAmount); n > 0; n--) {
    const x = r() * bounds.w, y = r() * bounds.h, take = r(), size = r(), i = Math.min(t.wPx - 1, Math.floor(x / TEXEL))
    const v = (bounds.y + y - t.crestY[i]) / Math.max(1, t.footY[i] - t.crestY[i])
    if (v < 0.02 || v > 1 || take > BARE + scrub[Math.min(t.hPx - 1, Math.floor(y / TEXEL)) * t.wPx + i]) continue
    if (inField(vegetation.fields, bounds.x + x, bounds.y + y)) continue
    out.push([bounds.x + x, bounds.y + y, (SIZE[0] + (SIZE[1] - SIZE[0]) * v) * (0.6 + 0.9 * size * size)])
  }
  return out
}

function inField(fields: Float32Array, x: number, y: number): boolean {
  for (let o = 0; o + 9 <= fields.length; o += 9) {
    const xs = [fields[o], fields[o + 2], fields[o + 4], fields[o + 6]], ys = [fields[o + 1], fields[o + 3], fields[o + 5], fields[o + 7]]
    if (x > Math.min(...xs) && x < Math.max(...xs) && y > Math.min(...ys) && y < Math.max(...ys)) return true
  }
  return false
}

/** Inks the specks, one fill a step of air; none on lying snow. */
export function paintSpecks(brush: ReceiverBrush, t: PlaneTexelCtx, specks: readonly Speck[]): void {
  const steps: Speck[][] = Array.from({ length: STEPS }, () => []), at = fieldSample()
  for (const speck of specks) {
    const [x, y] = speck, i = Math.min(t.wPx - 1, Math.floor((x - t.bounds.x) / TEXEL))
    if (t.snowY && t.snowCover > 0.3 && y < t.snowY[i] + 3) continue
    samplePlaneField(t.litField, (x - t.bounds.x) / t.bounds.w, Math.min(1, (y - t.crestY[i]) / Math.max(1, t.footY[i] - t.crestY[i])), at)
    const step = Math.round((1 - at.haze) * STEPS)
    if (step) steps[step - 1].push(speck)
  }
  steps.forEach((held, k) => {
    if (!held.length) return
    const path = brush.path()
    for (const [x, y, r] of held) {
      path.moveTo(x + r, y)
      path.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2)
    }
    brush.fill(INK, ALPHA * (k + 1) / STEPS)
  })
}
