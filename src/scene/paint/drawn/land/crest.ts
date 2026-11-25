import { shadowBeam } from '../../../model/planeField'
import { TEXEL } from '../../../model/planeBands'
import type { LayerOf, RGB } from '../../../model/types'
import { css, type Ctx2D } from '../../shared/base/hand'
import { samplePlaneTexel, shadeTexelSrgb, type PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverBrush, ReceiverInk } from '../../shared/land/receiverBrush'
import { fractal } from '../../shared/base/core'
import { carve, type P } from '../kit/carve'
import { LINE, KEY_STEP } from '../kit/lines'
import { pigment } from '../kit/palette'
import { stepped, type GroundInk } from './groundInk'

/*
 * A plane's top and foot: the keyblock's crest line with the sun's rim under it; the bokashi, the block wiped darker to the
 * near plane's foot, and on a far or back plane darkest at its crest, wiped out downhill with a wavering edge.
 */

/** How strongly the key line is printed. */
const SEED = 5501, KEY_ALPHA = 0.8
/** The near plane's bokashi to its foot: where it starts (share of the plane's depth), and its strength there. */
export const FOOT = { from: 0.5, alpha: 0.2 } as const
/** The crest's bokashi on far and back planes: how far down it reaches (share of the plane's depth, most px), its wipes, how dark it starts. */
const CREST = { reach: 0.55, most: 46, wipes: 7, dark: -0.08, alpha: 0.09 } as const
/** The sun's rim: its line (px), the least it must gain on the face below and the least sun, the least columns in a row. */
const RIM = { wide: 1.5, gain: 0.025, sun: 0.015, run: 3 } as const

/** `base` is the plane's base block, in its most held pot. */
export function groundKey(targets: readonly Ctx2D[], brush: ReceiverBrush, desc: LayerOf<'plane'>, t: PlaneTexelCtx, base: GroundInk): void {
  const { bounds } = desc, tier = desc.plane
  if (tier === 'near') {
    const key = stepped(base, KEY_STEP.near)
    targets.forEach((ctx, k) => {
      const ink = key[k] ?? key[0], wipe = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h)
      wipe.addColorStop(FOOT.from, css(ink, 0))
      wipe.addColorStop(1, css(ink, FOOT.alpha))
      ctx.fillStyle = wipe
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
    })
  } else crestWipe(brush, t, stepped(base, CREST.dark), desc.grain.seed)
  rim(brush, t)
  carve(brush.path(), Array.from({ length: Math.ceil(t.wPx / 2) + 1 }, (_, n): P => {
    const i = Math.min(t.wPx - 1, n * 2)
    return [bounds.x + (i + 0.5) * TEXEL, t.crestY[i] + 0.35]
  }), LINE[tier], SEED, 0)
  // The far keys are as thin in a thick air as the blocks they are cut round: the key's value is the block's, its strength the air's.
  brush.fill(stepped(base, KEY_STEP[tier]), KEY_ALPHA * (tier === 'near' ? 1 : 0.5 + 0.5 * base.air))
}

/** The far block wiped from its crest: a few wipes laid one in another, each to a wavering depth, so the ink thins downhill. */
function crestWipe(brush: ReceiverBrush, t: PlaneTexelCtx, ink: ReceiverInk, seed: number) {
  const { bounds, crestY, footY, wPx } = t, step = Math.max(1, Math.round(4 / TEXEL))
  const columns = Array.from({ length: Math.ceil(wPx / step) + 1 }, (_, n) => Math.min(wPx - 1, n * step))
  for (let w = 1; w <= CREST.wipes; w++) {
    const path = brush.path(), share = w / CREST.wipes
    columns.forEach((i, n) => {
      const x = bounds.x + (i + 0.5) * TEXEL
      if (n) path.lineTo(x, crestY[i] - 1)
      else path.moveTo(x, crestY[i] - 1)
    })
    for (let n = columns.length - 1; n >= 0; n--) {
      const i = columns[n], x = bounds.x + (i + 0.5) * TEXEL, deep = Math.min(CREST.most, CREST.reach * (footY[i] - crestY[i]))
      const waver = 0.75 + 0.5 * fractal(seed + w * 17, x, w, 0.03, 0.5, 2)
      path.lineTo(x, crestY[i] + Math.min(footY[i] - crestY[i], deep * share * waver))
    }
    path.closePath()
    brush.fill(ink, CREST.alpha)
  }
}

/** Where the crest turns to the sun, a line of its own lit ink. */
function rim(brush: ReceiverBrush, t: PlaneTexelCtx) {
  if (t.litField.eSun[1] < RIM.sun) return
  const samples = Array.from({ length: t.wPx }, (_, i) => {
    const x = t.bounds.x + (i + 0.5) * TEXEL, at = samplePlaneTexel(t, i, x, t.crestY[i] + 0.65)
    return at.sVis - samplePlaneTexel(t, i, x, t.crestY[i] + 9).sVis >= RIM.gain ? at : null
  })
  for (let i = 0, from = 0; i <= t.wPx; i++) {
    if (samples[i]) continue
    const run = samples.slice(from, i).flatMap((at) => at ?? [])
    if (run.length >= RIM.run) {
      const ink = (beam: RGB) => pigment([0, 1, 2].map((m) => run.reduce((sum, at) => sum + shadeTexelSrgb(t, at, 1, beam)[m], 0) / run.length) as unknown as RGB, 0.4)
      carve(brush.path(), run.map((_, k): P => [t.bounds.x + (from + k + 0.5) * TEXEL, t.crestY[from + k] + 1]), RIM.wide, SEED + i, 1)
      brush.fill([ink(t.litField.eSun), ink(shadowBeam(t.litField))] satisfies ReceiverInk, 1)
    }
    from = i + 1
  }
}
