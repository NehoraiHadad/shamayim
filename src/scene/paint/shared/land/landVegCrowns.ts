import { plantInk, TREE_TONE_STRIDE } from '../../../model/canopyTones'
import { plantVisible } from '../../../model/plantVisibility'
import type { CanopyVegetation, RGB } from '../../../model/types'
import { frondTravel, plantWindAt, plantWindFade, type PlantWind } from '../../../model/landWind'
import { PALM_FROND_LENGTH } from '../../../model/vegShapes'
import { TONE } from '../../../model/vegSample'
import { mix } from '../base/hand'
import { mapInk, mixInk, type ReceiverBrush, type ReceiverInk } from './receiverBrush'
import { treeBend, treeCrownAnchor } from './landVegPose'

/*
 * Illustrated tree & orchard crown painter (Stage 4: living land, anidoodle enriched hand).
 * Draws back-to-front crowns from `PlaneVegetation.trees` / `treeMeta` (stride-3 meta includes fade alpha):
 * - `0` pine/oak woodland: two-pass clustered dark understory bed + multi-lobe rounded crowns with clear
 *   ambient light side, shade side and grounded contact shadow, visible at 375 px and fading with distance.
 * - `1` olive / `2` citrus / `4` neutral unknown-species orchard: rounded multi-lobe canopy crowns in rows/blocks.
 * - `3` date palm: curved slender trunk + radiating arching fronds + crown knot, fading smoothly with distance.
 * Worker-safe on OffscreenCanvas; pure in `(desc, env)`; zero clock; zero `ctx.filter`.
 */

const BLACK: ReceiverInk = [[0, 0, 0]]
const BLACK_SHADE: RGB = [0.04, 0.06, 0.04]

/** Organic 3-to-4-lobe rounded crown silhouette (never a single stamped circle). */
function traceCrownLobes(ctx: CanvasPath, cx: number, cy: number, rx: number, ry: number, phase: number, lobes: number): void {
  const steps = lobes * 4
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const billow = 1 + 0.16 * Math.sin(t * lobes + phase) + 0.08 * Math.cos(t * (lobes + 2) - phase * 1.3)
    const flatBase = Math.sin(t) > 0 ? 1 - 0.16 * Math.sin(t) : 1
    const px = cx + Math.cos(t) * rx * billow
    const py = cy + Math.sin(t) * ry * billow * flatBase
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** Draws one date palm in landscape scale: curved trunk + arching fronds + crown knot, weighted by distance fade `alpha`. */
function paintPalm(
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

/** Tree and orchard crown form, back-to-front, fading with distance. */
export function paintVegCrowns(brush: ReceiverBrush, veg: CanopyVegetation, wind?: PlantWind, time = 0, ink?: Uint8Array, shadeInk?: Uint8Array): void {
  const { trees, treeMeta, tones } = veg
  const count = trees.length / 6
  if (!count || !tones.length) return
  const tone = (plant: number, slot: number, index: number): ReceiverInk => {
    const offset = plant * TREE_TONE_STRIDE + slot * 3
    return [ink ? plantInk(ink, offset) : tones[index] ?? tones[0], shadeInk && plantInk(shadeInk, offset)]
  }

  // Pass 1: layered dark understory underneath pine and oak groves.
  for (let i = 0; i < count; i++) {
    if (treeMeta[i * 3] !== 0) continue
    const alpha = (treeMeta[i * 3 + 2] ?? 255) / 255
    if (!plantVisible(alpha)) continue
    const o = i * 6, x = trees[o], y = trees[o + 1], r = trees[o + 2]
    let ctx = brush.path()
    const underRgb = tone(i, 1, TONE.PINE_UNDER)
    ctx.ellipse(x + r * 0.04, y + r * 0.04, r * 1.44, Math.max(0.60, r * 0.70), 0, 0, Math.PI * 2)
    brush.fill(underRgb, 0.62 * alpha)
    ctx = brush.path()
    ctx.ellipse(x + r * 0.08, y + r * 0.10, r * 1.04, Math.max(0.42, r * 0.48), 0, 0, Math.PI * 2)
    brush.fill(mapInk(underRgb, (rgb) => mix(rgb, BLACK_SHADE, 0.42)), 0.46 * alpha)
  }

  // Pass 2: individual rounded crowns back-to-front with grounded shadow, varied conifer/oak silhouettes and light/shade sides.
  for (let i = 0; i < count; i++) {
    const alpha = (treeMeta[i * 3 + 2] ?? 255) / 255
    if (!plantVisible(alpha)) continue
    const o = i * 6
    const x = trees[o], y = trees[o + 1], r = trees[o + 2]
    const height = trees[o + 3], phase = trees[o + 4], shade = trees[o + 5]
    const kind = treeMeta[i * 3], toneIdx = treeMeta[i * 3 + 1]
    const baseRgb = tone(i, 0, toneIdx)

    if (kind === 3) {
      paintPalm(brush, x, y, r, height, phase, alpha, baseRgb, tone(i, 1, TONE.TRUNK), tone(i, 2, TONE.GRASS_LIT), wind, time)
      continue
    }
    const bend = treeBend(kind, height, alpha, phase, wind, time)
    const { cx, cy, rx, ry } = treeCrownAnchor(x, y, r, height, phase, kind, bend)
    const lobes = kind === 0 ? (shade > 0.55 ? 5 : 4) : 3

    const ctx = brush.path()
    ctx.ellipse(x + rx * 0.16, y + 0.24, rx * 0.94, Math.max(0.36, ry * 0.36), 0, 0, Math.PI * 2)
    brush.fill(BLACK, 0.30 * alpha)

    const bodyRgb = mapInk(baseRgb, (rgb) => mix(rgb, BLACK_SHADE, 0.03 + shade * 0.18))
    traceCrownLobes(brush.path(), cx, cy, rx, ry, phase, lobes)
    brush.fill(bodyRgb, 0.96 * alpha)

    if (r >= 0.85) {
      const sideShade = mixInk(bodyRgb, tone(i, 1, TONE.PINE_UNDER), (a, b) => mix(a, b, 0.58))
      traceCrownLobes(brush.path(), cx + rx * 0.22, cy + ry * 0.22, rx * 0.78, ry * 0.62, phase + 0.9, lobes)
      brush.fill(sideShade, 0.64 * alpha)

      const litPineRgb = tone(i, 2, TONE.PINE_LIT)
      const sideLit = mixInk(baseRgb, litPineRgb, (a, b) => kind === 0 ? mix(b, a, shade * 0.28) : mix(a, b, 0.56))
      traceCrownLobes(brush.path(), cx - rx * 0.24, cy - ry * 0.24, rx * 0.66, ry * 0.54, phase + 2.1, lobes)
      brush.fill(sideLit, 0.74 * alpha)
    }
  }
}
