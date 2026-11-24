import { plantInk, TREE_TONE_STRIDE } from '../../../model/canopyTones'
import { plantVisible } from '../../../model/plantVisibility'
import type { CanopyVegetation } from '../../../model/types'
import type { PlantWind } from '../../../model/landWind'
import { TONE } from '../../../model/vegSample'
import { mix } from '../base/hand'
import { mapInk, mixInk, type ReceiverBrush, type ReceiverInk } from './receiverBrush'
import { BLACK, BLACK_SHADE, paintPalm } from './landVegPalm'
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

/** Organic 3-to-4-lobe rounded crown silhouette (never a single stamped circle). */
export function traceCrownLobes(ctx: CanvasPath, cx: number, cy: number, rx: number, ry: number, phase: number, lobes: number): void {
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

/** The crown (px) that shows a lit and a shaded side. */
export const MODELLED = 0.85

/** A crown as it stands, its body's inks and its fade, for what a style lays over it. */
export interface Crown { cx: number; cy: number; rx: number; ry: number; r: number; phase: number; lobes: number; alpha: number; body: ReceiverInk }

/** A crown for a style that paints its leaves itself: its inks under and in the light too (the body's where it is too small for them). */
export interface LeafyCrown extends Crown { dark: ReceiverInk; lit: ReceiverInk }

/** A style's own part in the round crowns: laid over each (`dress`), or painted instead (`crown`, every foot's shade before any leaf). */
export interface CrownHand {
  dress?(brush: ReceiverBrush, crown: Crown): void
  crown?: { foot(brush: ReceiverBrush, x: number, y: number, r: number, alpha: number): void; leaves(brush: ReceiverBrush, crown: LeafyCrown): void }
}

/** Tree and orchard crown form, back-to-front, fading with distance. */
export function paintVegCrowns(brush: ReceiverBrush, veg: CanopyVegetation, wind?: PlantWind, time = 0, ink?: Uint8Array, shadeInk?: Uint8Array,
  hand?: CrownHand): void {
  const { trees, treeMeta, tones } = veg
  const count = trees.length / 6
  if (!count || !tones.length) return
  const tone = (plant: number, slot: number, index: number): ReceiverInk => {
    const offset = plant * TREE_TONE_STRIDE + slot * 3
    return [ink ? plantInk(ink, offset) : tones[index] ?? tones[0], shadeInk && plantInk(shadeInk, offset)]
  }

  // Pass 1: layered dark understory underneath pine and oak groves.
  for (let i = 0; i < count; i++) {
    const kind = treeMeta[i * 3]
    if (hand?.crown ? kind === 3 : kind !== 0) continue
    const alpha = (treeMeta[i * 3 + 2] ?? 255) / 255
    if (!plantVisible(alpha)) continue
    const o = i * 6, x = trees[o], y = trees[o + 1], r = trees[o + 2]
    if (hand?.crown) {
      hand.crown.foot(brush, x, y, r, alpha)
      continue
    }
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

    const bodyRgb = mapInk(baseRgb, (rgb) => mix(rgb, BLACK_SHADE, 0.03 + shade * 0.18))
    // What the body takes of the shade and of the light.
    const sideShade = () => mixInk(bodyRgb, tone(i, 1, TONE.PINE_UNDER), (a, b) => mix(a, b, 0.58))
    const sideLit = () => mixInk(baseRgb, tone(i, 2, TONE.PINE_LIT), (a, b) => kind === 0 ? mix(b, a, shade * 0.28) : mix(a, b, 0.56))
    const crown: Crown = { cx, cy, rx, ry, r, phase, lobes, alpha, body: bodyRgb }
    if (hand?.crown) {
      const sided = r >= MODELLED
      hand.crown.leaves(brush, { ...crown, dark: sided ? sideShade() : bodyRgb, lit: sided ? sideLit() : bodyRgb })
      continue
    }

    const ctx = brush.path()
    ctx.ellipse(x + rx * 0.16, y + 0.24, rx * 0.94, Math.max(0.36, ry * 0.36), 0, 0, Math.PI * 2)
    brush.fill(BLACK, 0.30 * alpha)

    traceCrownLobes(brush.path(), cx, cy, rx, ry, phase, lobes)
    brush.fill(bodyRgb, 0.96 * alpha)

    if (r >= MODELLED) {
      traceCrownLobes(brush.path(), cx + rx * 0.22, cy + ry * 0.22, rx * 0.78, ry * 0.62, phase + 0.9, lobes)
      brush.fill(sideShade(), 0.64 * alpha)

      traceCrownLobes(brush.path(), cx - rx * 0.24, cy - ry * 0.24, rx * 0.66, ry * 0.54, phase + 2.1, lobes)
      brush.fill(sideLit(), 0.74 * alpha)
    }
    hand?.dress?.(brush, crown)
  }
}
