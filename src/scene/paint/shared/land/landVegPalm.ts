import type { RGB } from '../../../model/types'
import { frondTravel, plantWindAt, plantWindFade, type PlantWind } from '../../../model/landWind'
import { PALM_FROND_LENGTH } from '../../../model/vegShapes'
import { mix } from '../base/hand'
import { treeBend, treeCrownAnchor } from './landVegPose'
import { mapInk, mixInk, type ReceiverBrush, type ReceiverInk } from './receiverBrush'

export const BLACK: ReceiverInk = [[0, 0, 0]]
export const BLACK_SHADE: RGB = [0.04, 0.06, 0.04]

/** Draws one date palm in landscape scale: curved trunk + arching fronds + crown knot, weighted by distance fade `alpha`. */
export function paintPalm(
  brush: ReceiverBrush, x: number, y: number, r: number, height: number, phase: number, alpha: number, frondRgb: ReceiverInk, trunkRgb: ReceiverInk, sunward: ReceiverInk, wind: PlantWind | undefined, time: number,
): void {
  const anchor = treeCrownAnchor(x, y, r, height, phase, 3, treeBend(3, height, alpha, phase, wind, time))
  const bend = anchor.cx - x, topX = anchor.cx, topY = anchor.cy
  let ctx = brush.path()
  ctx.ellipse(x + r * 0.18, y + 0.25, r * 0.72, Math.max(0.32, r * 0.25), 0, 0, Math.PI * 2)
  brush.fill(BLACK, 0.24 * alpha)

  ctx = brush.path()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + bend * 0.35, (y + topY) * 0.5, topX, topY)
  brush.stroke(trunkRgb, 0.88 * alpha, Math.max(0.45, r * 0.26))

  const frondBend = wind ? frondTravel(r) * plantWindFade(alpha) * plantWindAt(wind, time, phase) : 0
  const count = r >= 1.3 ? 6 : 4
  const shadeRgb = mapInk(frondRgb, (rgb) => mix(rgb, BLACK_SHADE, 0.32))
  const capRgb = mixInk(frondRgb, sunward, (a, b) => mix(a, b, 0.42))
  for (let i = 0; i < count; i++) {
    const side = i < count / 2 ? -1 : 1
    const slot = (i % (count / 2)) / Math.max(1, count / 2 - 1)
    const jitter = 0.86 + 0.28 * Math.sin(phase * 1.7 + i * 2.1)
    const len = r * (PALM_FROND_LENGTH - 0.34 * slot) * jitter
    const rise = r * (0.48 + 0.68 * slot), droop = r * (0.82 - 1.12 * slot)
    ctx = brush.path()
    ctx.moveTo(topX, topY)
    ctx.quadraticCurveTo(topX + side * len * 0.52 + frondBend * 0.35, topY - rise, topX + side * len + frondBend, topY + droop)
    brush.stroke(slot < 0.35 ? shadeRgb : slot > 0.72 ? capRgb : frondRgb, 0.94 * alpha, Math.max(0.55, r * (0.38 - 0.08 * slot)))
  }
  ctx = brush.path()
  ctx.arc(topX, topY + 0.25, Math.max(0.4, r * 0.28), 0, Math.PI * 2)
  brush.fill(shadeRgb, 0.92 * alpha)
}
