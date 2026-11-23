import type { LayerOf } from '../../../../src/scene/model/types'
import { displace, sample, tube } from '../../../../src/scene/paint/shared/base/core'
import type { ReceiverBrush, ReceiverInk } from '../../../../src/scene/paint/shared/land/receiverBrush'

/*
 * Gullies as folds of the slope: a soft bed, and two banks, the one the light's side hides in shade and the one it meets
 * lit. Wide and faint to narrow and dark, gone before the foot; terraces as thin lips. Pure.
 */

const BLACK: ReceiverInk = [[0, 0, 0]]
/** A bank the sun meets, on the sunlit land only (a cloud's shade has no banks). */
const LIT: ReceiverInk = [[1, 0.95, 0.8], [0.5, 0.5, 0.5]]
/** The bed's passes: width against the gully's, opacity against its own. */
const BED = [[1.7, 0.12], [1, 0.22], [0.45, 0.3]] as const
/** A bank's widths against the gully's, its distance from the bed, its opacity against the gully's in shade and in light. */
const BANK = [3.4, 2.2] as const, APART = 1.5, IN_SHADE = 0.2, IN_LIGHT = 0.15

/** `lampX`: the light across the picture, sky px; `sun`: the sunlight's strength 0–1. */
export function paintGullies(brush: ReceiverBrush, desc: LayerOf<'plane'>, lampX: number, sun: number): void {
  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.4, 0.2, 3, desc.grain.seed + i * 13)
    const n = line.length
    const side = Math.max(-1, Math.min(1, (lampX - line[0][0]) / 60))
    const ribbon = (piece: typeof line, from: number, to: number, aside: number) => {
      const path = brush.path()
      tube(piece.map(([x, y]): [number, number] => [x + aside, y]), from, to, false)
        .forEach(([x, y], j) => j ? path.lineTo(x, y) : path.moveTo(x, y))
      path.closePath()
    }
    for (const [from, to, fade] of [[0, 0.4, 0.8], [0.3, 0.65, 0.6], [0.55, 1, 0.3]] as const) {
      const piece = line.slice(Math.floor(from * (n - 1)), Math.ceil(to * (n - 1)) + 1)
      if (piece.length < 2) continue
      const top = gully.w * (0.35 + from), foot = gully.w * (0.2 + to * 0.5)
      for (const k of BANK) {
        // The bank on the light's own side faces away from it; the far one meets it.
        ribbon(piece, top * k / 2, foot * k / 2, side * APART * gully.w)
        brush.fill(BLACK, gully.alpha * IN_SHADE * fade * sun * Math.abs(side))
        ribbon(piece, top * k / 2, foot * k / 2, -side * APART * gully.w)
        brush.fill(LIT, gully.alpha * IN_LIGHT * fade * sun * Math.abs(side))
      }
      for (const [k, a] of BED) {
        ribbon(piece, top * k / 2, foot * k / 2, 0)
        brush.fill(BLACK, gully.alpha * a * fade)
      }
    }
  })
  if (!desc.terraces.length) return
  const path = brush.path()
  for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? path.lineTo(x, y + 0.45) : path.moveTo(x, y + 0.45)))
  brush.stroke(BLACK, 0.1, 0.5)
}
