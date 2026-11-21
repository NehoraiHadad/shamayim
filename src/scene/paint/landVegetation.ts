import type { PlaneVegetation, RGB } from '../model/types'
import { TONE } from '../model/vegSample'
import { css, mix, type Ctx2D } from './hand'

/*
 * Illustrated ground-plane vegetation & strata painters (Stage 4: living land, anidoodle enriched hand).
 * Soft bare-desert geological strata, perspective-aligned cropland patchwork (hand-wobbled gouache edges
 * & aligned furrows), converging orchard/alley stripes, and readable scattered scrub cushions & grass tufts.
 * Worker-safe on OffscreenCanvas; pure in `(desc, env)`; zero clock; zero `ctx.filter`.
 */

const DARK_EARTH: RGB = [0.08, 0.07, 0.05]

function h01(seed: number, i: number, salt: number): number {
  let h = Math.imul((seed ^ (i * 374761393) ^ (salt * 668265263)) | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Gently bowed edge so field and strata boundaries read as hand-painted rather than ruler-straight. */
function wobblyEdge(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, bow: number): void {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1
  ctx.quadraticCurveTo((ax + bx) * 0.5 - (dy / len) * bow, (ay + by) * 0.5 + (dx / len) * bow, bx, by)
}

/** Soft tonal geological strata bands on bare/sparse (WorldCover 60) and desert slopes — zero vegetation. */
export function paintVegStrata(ctx: Ctx2D, veg: PlaneVegetation): void {
  const { strata, strataMeta, tones, seed } = veg
  const count = strata.length / 6
  if (!count || !tones.length) return
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const o = i * 6, x0 = strata[o], y0 = strata[o + 1], x1 = strata[o + 2], y1 = strata[o + 3]
    const thick = strata[o + 4], alpha = strata[o + 5], rgb = tones[strataMeta[i]] ?? tones[0]
    const bow = (h01(seed, i, 3) - 0.5) * 2.4
    for (const [wScale, aScale] of [[1.9, 0.40], [0.9, 0.85]] as const) {
      ctx.beginPath(); ctx.moveTo(x0, y0); wobblyEdge(ctx, x0, y0, x1, y1, bow)
      ctx.strokeStyle = css(rgb, alpha * aScale); ctx.lineWidth = thick * wScale; ctx.stroke()
    }
  }
}

/** Cropland field patchwork aligned to the ground plane: growing green, ploughed brown or dry golden straw. */
export function paintVegFields(ctx: Ctx2D, veg: PlaneVegetation): void {
  const { fields, fieldMeta, tones, seed } = veg
  const count = fields.length / 9
  if (!count || !tones.length) return
  for (let i = 0; i < count; i++) {
    const o = i * 9
    const x0 = fields[o], y0 = fields[o + 1], x1 = fields[o + 2], y1 = fields[o + 3]
    const x2 = fields[o + 4], y2 = fields[o + 5], x3 = fields[o + 6], y3 = fields[o + 7], alpha = fields[o + 8]
    const state = fieldMeta[i * 2], rgb = tones[fieldMeta[i * 2 + 1]] ?? tones[0]
    const b0 = (h01(seed, i, 11) - 0.5) * 1.4, b1 = (h01(seed, i, 17) - 0.5) * 1.4

    ctx.beginPath()
    ctx.moveTo(x0, y0); wobblyEdge(ctx, x0, y0, x1, y1, b0); wobblyEdge(ctx, x1, y1, x2, y2, b1)
    wobblyEdge(ctx, x2, y2, x3, y3, -b0); wobblyEdge(ctx, x3, y3, x0, y0, -b1); ctx.closePath()
    ctx.fillStyle = css(rgb, alpha); ctx.fill()

    // Perspective-converging furrows (clearer on ploughed soil and harvested straw stubble).
    const furrowAlpha = state === 1 ? alpha * 0.55 : state === 2 ? alpha * 0.36 : alpha * 0.24
    const furrowRgb = state === 2 ? mix(rgb, [0.60, 0.52, 0.32], 0.35) : mix(rgb, DARK_EARTH, 0.38)
    const rows = state === 1 ? 5 : 4
    ctx.beginPath()
    for (let r = 1; r < rows; r++) {
      const f = r / rows
      ctx.moveTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f)
      ctx.lineTo(x3 + (x2 - x3) * f, y3 + (y2 - y3) * f)
    }
    ctx.strokeStyle = css(furrowRgb, furrowAlpha); ctx.lineWidth = 0.55; ctx.stroke()

    ctx.beginPath(); ctx.moveTo(x3, y3); wobblyEdge(ctx, x3, y3, x2, y2, -b0)
    ctx.strokeStyle = css(mix(rgb, DARK_EARTH, 0.44), alpha * 0.42); ctx.lineWidth = 0.65; ctx.stroke()
  }
}

/** Subtle converging shaded row or management-alley stripes underneath orchard/plantation blocks. */
export function paintVegRows(ctx: Ctx2D, veg: PlaneVegetation): void {
  const { rows, rowMeta, tones } = veg
  const count = rows.length / 6
  if (!count || !tones.length) return
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const o = i * 6, rgb = mix(tones[rowMeta[i]] ?? tones[0], DARK_EARTH, 0.42)
    ctx.beginPath(); ctx.moveTo(rows[o], rows[o + 1]); ctx.lineTo(rows[o + 2], rows[o + 3])
    ctx.strokeStyle = css(rgb, rows[o + 5]); ctx.lineWidth = rows[o + 4]; ctx.stroke()
  }
}

/** Scattered scrub cushions (WorldCover 20) and grass tufts (WorldCover 30), clearly readable at 375 px. */
export function paintVegTufts(ctx: Ctx2D, veg: PlaneVegetation): void {
  const { tufts, tuftMeta, tones, seed } = veg
  const count = tufts.length / 4
  if (!count || !tones.length) return
  const shrubLit = tones[TONE.SHRUB_LIT] ?? [0.28, 0.38, 0.20]
  const grassLit = tones[TONE.GRASS_LIT] ?? [0.36, 0.48, 0.22]

  for (let i = 0; i < count; i++) {
    const o = i * 4, x = tufts[o], y = tufts[o + 1], r = tufts[o + 2], alpha = tufts[o + 3]
    if (alpha <= 0.02) continue
    const kind = tuftMeta[i * 2], rgb = tones[tuftMeta[i * 2 + 1]] ?? tones[0]

    // Grounded soft shadow under each tuft, proportional to tuft visibility so faded tufts disappear cleanly.
    ctx.beginPath()
    ctx.ellipse(x + r * 0.14, y + r * 0.24, r * 1.05, Math.max(0.30, r * 0.28), 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(0 0 0 / ${(0.26 * alpha).toFixed(3)})`
    ctx.fill()

    if (kind === 1) {
      // Grass / steppe tuft: low organic tussock mound + soft short curved blades (illustrated hand, never stiff sticks).
      const lean = (h01(seed, i, 23) - 0.5) * r * 0.55
      const dx = (h01(seed, i, 31) - 0.5) * r * 0.75
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.06, r * 1.05, Math.max(0.42, r * 0.48), 0, 0, Math.PI * 2)
      ctx.moveTo(x + dx + r * 0.72, y - r * 0.18)
      ctx.ellipse(x + dx, y - r * 0.18, r * 0.72, Math.max(0.36, r * 0.40), 0, 0, Math.PI * 2)
      ctx.fillStyle = css(rgb, alpha * 0.88); ctx.fill()

      ctx.beginPath()
      ctx.ellipse(x - r * 0.22, y - r * 0.26, r * 0.56, Math.max(0.28, r * 0.30), 0, 0, Math.PI * 2)
      ctx.fillStyle = css(grassLit, alpha * 0.58); ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x - r * 0.35, y - r * 0.1); ctx.quadraticCurveTo(x - r * 0.65, y - r * 0.55, x - r * 0.82 + lean, y - r * 0.72)
      ctx.moveTo(x + r * 0.05, y - r * 0.12); ctx.quadraticCurveTo(x + lean * 0.5, y - r * 0.58, x + lean * 0.9, y - r * 0.84)
      ctx.moveTo(x + r * 0.40, y - r * 0.08); ctx.quadraticCurveTo(x + r * 0.68, y - r * 0.48, x + r * 0.80 + lean, y - r * 0.64)
      ctx.strokeStyle = css(grassLit, alpha * 0.72); ctx.lineWidth = Math.max(0.45, r * 0.26); ctx.lineCap = 'round'; ctx.stroke()
    } else {
      // Scrub cushion: 2-lobe organic garrigue bush + lighter upper-left crown dab.
      const dx = (h01(seed, i, 29) - 0.5) * r * 0.78
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.12, r * 1.16, r * 0.68, 0, 0, Math.PI * 2)
      ctx.moveTo(x + dx + r * 0.78, y - r * 0.34)
      ctx.ellipse(x + dx, y - r * 0.34, r * 0.78, r * 0.54, 0, 0, Math.PI * 2)
      ctx.fillStyle = css(rgb, alpha * 0.94); ctx.fill()

      ctx.beginPath()
      ctx.ellipse(x - r * 0.26, y - r * 0.38, r * 0.58, r * 0.36, 0, 0, Math.PI * 2)
      ctx.fillStyle = css(shrubLit, alpha * 0.62); ctx.fill()
    }
  }
}
