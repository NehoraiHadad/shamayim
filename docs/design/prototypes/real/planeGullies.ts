import type { LayerOf } from '../../../../src/scene/model/types'
import { displace, sample, tube } from '../../../../src/scene/paint/shared/base/core'
import type { ReceiverBrush, ReceiverInk } from '../../../../src/scene/paint/shared/land/receiverBrush'

/* Gullies as soft folds: wide and faint to narrow and dark, gone before the foot; terraces as thin lips. Pure. */

const BLACK: ReceiverInk = [[0, 0, 0]]
/** The fold's passes: width against the gully's, opacity against its own. */
const PASSES = [[2.6, 0.1], [1.7, 0.14], [1, 0.22], [0.45, 0.3]] as const

export function paintGullies(brush: ReceiverBrush, desc: LayerOf<'plane'>): void {
  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.4, 0.2, 3, desc.grain.seed + i * 13)
    const n = line.length
    for (const [from, to, fade] of [[0, 0.4, 0.8], [0.3, 0.65, 0.6], [0.55, 1, 0.3]] as const) {
      const piece = line.slice(Math.floor(from * (n - 1)), Math.ceil(to * (n - 1)) + 1)
      if (piece.length < 2) continue
      for (const [k, a] of PASSES) {
        const path = brush.path()
        tube(piece, gully.w * (0.35 + from) * k / 2, gully.w * (0.2 + to * 0.5) * k / 2, false)
          .forEach(([x, y], j) => j ? path.lineTo(x, y) : path.moveTo(x, y))
        path.closePath()
        brush.fill(BLACK, gully.alpha * a * fade)
      }
    }
  })
  if (!desc.terraces.length) return
  const path = brush.path()
  for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? path.lineTo(x, y + 0.45) : path.moveTo(x, y + 0.45)))
  brush.stroke(BLACK, 0.1, 0.5)
}
