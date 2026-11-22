import type { PlaneVegetation, RGB } from '../model/types'
import { h01 } from './vegInk'
import { css, mix, type Ctx2D } from './hand'

/*
 * Illustrated ground-plane vegetation & strata painters (Stage 4: living land, anidoodle enriched hand).
 * Soft bare-desert geological strata, perspective-aligned cropland patchwork (hand-wobbled gouache edges
 * & aligned furrows), converging orchard/alley stripes, and readable scattered scrub cushions & grass tufts.
 * Worker-safe on OffscreenCanvas; pure in `(desc, env)`; zero clock; zero `ctx.filter`.
 */

const DARK_EARTH: RGB = [0.08, 0.07, 0.05]

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
    const bow = (h01(seed, x0, y0, 3) - 0.5) * 2.4
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
    const state = fieldMeta[i * 2], baseRgb = tones[fieldMeta[i * 2 + 1]] ?? tones[0]
    const b0 = (h01(seed, x0, y0, 11) - 0.5) * 1.4, b1 = (h01(seed, x0, y0, 17) - 0.5) * 1.4
    // Anchor-hashed tonal variation within each NDVI state so adjacent winter/spring fields read as a patchwork.
    const v = h01(seed, x0, y0, 41)
    const k = state === 0 ? (v < 0.5 ? 1 - (0.5 - v) * 0.42 : 1 + (v - 0.5) * 0.36)
      : state === 1 ? (v < 0.5 ? 1 - (0.5 - v) * 0.36 : 1 + (v - 0.5) * 0.28)
        : (v < 0.5 ? 1 - (0.5 - v) * 0.24 : 1 + (v - 0.5) * 0.20)
    const rgb: RGB = [Math.min(1, baseRgb[0] * k), Math.min(1, baseRgb[1] * k), Math.min(1, baseRgb[2] * k)]
    ctx.beginPath()
    ctx.moveTo(x0, y0); wobblyEdge(ctx, x0, y0, x1, y1, b0); wobblyEdge(ctx, x1, y1, x2, y2, b1)
    wobblyEdge(ctx, x2, y2, x3, y3, -b0); wobblyEdge(ctx, x3, y3, x0, y0, -b1); ctx.closePath()
    ctx.fillStyle = css(rgb, alpha); ctx.fill()
    const furrowAlpha = state === 1 ? alpha * 0.58 : state === 2 ? alpha * 0.40 : alpha * 0.34
    const furrowRgb = state === 2 ? mix(rgb, [0.92, 0.85, 0.62], 0.25) : mix(rgb, DARK_EARTH, 0.42)
    const rows = state === 1 ? 5 : 4
    ctx.beginPath()
    for (let r = 1; r < rows; r++) {
      const f = r / rows
      ctx.moveTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); ctx.lineTo(x3 + (x2 - x3) * f, y3 + (y2 - y3) * f)
    }
    ctx.strokeStyle = css(furrowRgb, furrowAlpha); ctx.lineWidth = 0.55; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x3, y3); wobblyEdge(ctx, x3, y3, x2, y2, -b0)
    ctx.moveTo(x1, y1); wobblyEdge(ctx, x1, y1, x2, y2, b1)
    ctx.strokeStyle = css(mix(rgb, DARK_EARTH, 0.46), alpha * 0.48); ctx.lineWidth = 0.65; ctx.stroke()
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
