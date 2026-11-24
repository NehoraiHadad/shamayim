import { shadowBeam } from '../../../model/planeField'
import { TEXEL } from '../../../model/planeBands'
import type { LayerOf, RGB } from '../../../model/types'
import { css, type Ctx2D } from '../../shared/base/hand'
import { samplePlaneTexel, shadeTexelSrgb, type PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverBrush, ReceiverInk } from '../../shared/land/receiverBrush'
import { carve, type P } from '../kit/carve'
import { pigment } from '../kit/palette'
import { stepped, type InkAt } from './groundInk'

/* A plane's top and foot: the crest's key line with the sun's rim under it, and the ink wiped deeper to the near plane's foot. */

/** The crest's key line (px) and its value from the ground's; the near foot's wipe. */
const KEYS = { near: 0.9, far: 0.65, back: 0.45 } as const
const KEY = -0.16, SEED = 5501, FOOT = { from: 0.5, alpha: 0.26 } as const
/** The sun's rim: its line (px), the least it must gain on the face below and the least sun, the least columns in a row. */
const RIM = { wide: 1.5, gain: 0.025, sun: 0.015, run: 3 } as const

export function groundKey(targets: readonly Ctx2D[], brush: ReceiverBrush, desc: LayerOf<'plane'>, t: PlaneTexelCtx, inkAt: InkAt): void {
  const { bounds } = desc, key = stepped(inkAt(bounds.x + bounds.w / 2, bounds.y + bounds.h * 0.6), KEY, -0.8)
  if (desc.plane === 'near') targets.forEach((ctx, k) => {
    const ink = key[k] ?? key[0], wipe = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h)
    wipe.addColorStop(FOOT.from, css(ink, 0))
    wipe.addColorStop(1, css(ink, FOOT.alpha))
    ctx.fillStyle = wipe
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
  })
  rim(brush, t)
  carve(brush.path(), Array.from({ length: Math.ceil(t.wPx / 2) + 1 }, (_, n): P => {
    const i = Math.min(t.wPx - 1, n * 2)
    return [bounds.x + (i + 0.5) * TEXEL, t.crestY[i] + 0.35]
  }), KEYS[desc.plane], SEED, 0)
  brush.fill(key, 0.75)
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
