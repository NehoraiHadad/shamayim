import type { PlaneVegetation, RGB } from '../model/types'
import { TONE } from '../model/vegSample'
import { css, mix, type Ctx2D } from './hand'

/*
 * Illustrated tree & orchard crown painter (Stage 4: living land, anidoodle enriched hand).
 * Draws back-to-front crowns from `PlaneVegetation.trees` / `treeMeta`:
 * - `0` pine/woodland: clustered multi-lobe billowing crowns, darker self-shaded underside, grounded contact shade.
 * - `1` olive: airy wider silvery-olive multi-lobe canopy in converging rows.
 * - `2` citrus: dense compact emerald rounded crown in tidy rows.
 * - `3` date palm: slightly curved slender trunk + radiating arching feathery fronds (echoing `glyphs/nature.ts`),
 *   smoothly simplifying at distant radii (`r < 1.5 px`) before sub-pixel aliasing.
 * Worker-safe on OffscreenCanvas; pure in `(desc, env)`; zero clock; zero `ctx.filter`.
 */

const BLACK_SHADE: RGB = [0.05, 0.07, 0.05]

/** Deterministic lightweight hash in `0..1` from index & phase (no allocations). */
function h01(seed: number, i: number, salt: number): number {
  let h = Math.imul((seed ^ (i * 374761393) ^ (salt * 668265263)) | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Organic 3-to-4-lobe rounded crown silhouette (never a single stamped circle). */
function traceCrownLobes(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, phase: number, lobes: number): void {
  const steps = lobes * 4
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    // Irregular billowing lobes along the top/sides, slightly flattened underside for natural canopy weight.
    const billow = 1 + 0.16 * Math.sin(t * lobes + phase) + 0.08 * Math.cos(t * (lobes + 2) - phase * 1.3)
    const flatBase = Math.sin(t) > 0 ? 1 - 0.18 * Math.sin(t) : 1
    const px = cx + Math.cos(t) * rx * billow
    const py = cy + Math.sin(t) * ry * billow * flatBase
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** Draws one date palm in landscape scale: curved trunk + radiating arching fronds + dark crown knot. */
function paintPalm(
  ctx: Ctx2D, x: number, y: number, r: number, height: number, phase: number, frondRgb: RGB, trunkRgb: RGB,
): void {
  const bend = Math.sin(phase) * r * 0.42
  const topX = x + bend, topY = y - height * 0.62
  // Grounded contact shade beneath the stem base.
  ctx.beginPath()
  ctx.ellipse(x + r * 0.18, y + 0.25, r * 0.72, Math.max(0.32, r * 0.25), 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgb(0 0 0 / 0.20)'
  ctx.fill()

  // Slender curved trunk.
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + bend * 0.35, (y + topY) * 0.5, topX, topY)
  ctx.strokeStyle = css(trunkRgb, 0.88)
  ctx.lineWidth = Math.max(0.45, r * 0.26)
  ctx.lineCap = 'round'
  ctx.stroke()

  // Arching fronds radiating from the crown (5–6 fronds when close, 4 simplified fronds when distant).
  const count = r >= 1.3 ? 6 : 4
  const shadeRgb = mix(frondRgb, BLACK_SHADE, 0.30)
  const capRgb = mix(frondRgb, [0.50, 0.58, 0.36], 0.36)
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const side = i < count / 2 ? -1 : 1
    const slot = (i % (count / 2)) / Math.max(1, count / 2 - 1) // 0 low drooping .. 1 high rising
    const jitter = 0.86 + 0.28 * Math.sin(phase * 1.7 + i * 2.1)
    const len = r * (1.55 - 0.34 * slot) * jitter
    const rise = r * (0.48 + 0.68 * slot)
    const droop = r * (0.82 - 1.12 * slot)
    const mx = topX + side * len * 0.52, my = topY - rise
    const ex = topX + side * len, ey = topY + droop
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.quadraticCurveTo(mx, my, ex, ey)
    ctx.strokeStyle = css(slot < 0.35 ? shadeRgb : slot > 0.72 ? capRgb : frondRgb, 0.94)
    ctx.lineWidth = Math.max(0.55, r * (0.38 - 0.08 * slot))
    ctx.stroke()
  }
  // Small dark frond-base knot grounding the crown to the trunk.
  ctx.beginPath()
  ctx.arc(topX, topY + 0.25, Math.max(0.4, r * 0.28), 0, Math.PI * 2)
  ctx.fillStyle = css(shadeRgb, 0.92)
  ctx.fill()
}

/** Paints all tree and orchard crowns back-to-front on the plane's FORM canvas. */
export function paintVegCrowns(ctx: Ctx2D, veg: PlaneVegetation): void {
  const { trees, treeMeta, tones, seed } = veg
  const count = trees.length / 6
  if (!count || !tones.length) return
  const trunkRgb = tones[TONE.TRUNK] ?? [0.27, 0.23, 0.18]

  for (let i = 0; i < count; i++) {
    const o = i * 6
    const x = trees[o], y = trees[o + 1], r = trees[o + 2]
    const height = trees[o + 3], phase = trees[o + 4], shade = trees[o + 5]
    const kind = treeMeta[i * 2], toneIdx = treeMeta[i * 2 + 1]
    const baseRgb = tones[toneIdx] ?? tones[0]

    if (kind === 3) {
      paintPalm(ctx, x, y, r, height, phase, baseRgb, trunkRgb)
      continue
    }

    const rx = kind === 1 ? r * 1.18 : kind === 2 ? r * 0.98 : r * 1.12
    const ry = kind === 1 ? r * 0.78 : kind === 2 ? r * 0.92 : r * 0.88
    const cy = y - ry * 0.55
    const lobes = kind === 0 ? 4 : 3

    // Grounded soft contact shadow under the canopy.
    ctx.beginPath()
    ctx.ellipse(x + rx * 0.14, y + 0.22, rx * 0.92, Math.max(0.35, ry * 0.34), 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgb(0 0 0 / 0.22)'
    ctx.fill()

    // Main multi-lobe canopy silhouette (slightly modulated per tree for natural woodland richness).
    const darkMix = 0.08 + shade * 0.22
    const bodyRgb = mix(baseRgb, BLACK_SHADE, darkMix)
    traceCrownLobes(ctx, x, cy, rx, ry, phase, lobes)
    ctx.fillStyle = css(bodyRgb, 0.93)
    ctx.fill()

    // Self-occluded lower canopy shade + soft upper crown mass (light-free volume, no directional sun baked in).
    if (r >= 1.1) {
      const underRgb = mix(bodyRgb, BLACK_SHADE, 0.32)
      traceCrownLobes(ctx, x + rx * 0.06, cy + ry * 0.24, rx * 0.84, ry * 0.58, phase + 0.9, lobes)
      ctx.fillStyle = css(underRgb, 0.55)
      ctx.fill()

      const topRgb = mix(baseRgb, [0.36, 0.42, 0.30], 0.14 + 0.10 * h01(seed, i, 7))
      traceCrownLobes(ctx, x - rx * 0.06, cy - ry * 0.24, rx * 0.72, ry * 0.52, phase + 2.1, lobes)
      ctx.fillStyle = css(topRgb, 0.48)
      ctx.fill()
    }
  }
}
