import type { Box, PlanePalette, Pt } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'

/*
 * Living-land plane surface painter (Stage 3, anidoodle enriched hand):
 * Draws the quantised light-free albedo palette across a plane's bounds onto a low-resolution scratch
 * canvas (`TEXEL` scene px per texel, "draw small and draw back up", no `ctx.filter`, no clock) and
 * stretches it back smoothly inside the plane outline.
 *
 * Craft notes:
 * - Bands follow the terrain's ridge contour (`crestY` at each x), never horizontal ruler stripes.
 * - Gentle two-octave seeded value noise warps the patch seams organically so quantised tones read as
 *   hand-painted gouache washes with soft wet-on-damp edges rather than a per-pixel satellite mosaic.
 * - Low-frequency mottle and subtle paper grain integrate directly into the same pass on the near plane.
 */

const TEXEL = 3
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const smooth = (lo: number, hi: number, t: number) => {
  const x = clamp((t - lo) / (hi - lo), 0, 1)
  return x * x * (3 - 2 * x)
}

/** A seeded hash of a lattice point, 0..1. */
function hash(seed: number, x: number, y: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise (seeded lattice, eased between points), 0..1. */
function valueNoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1)
  return a + (b - a) * sx + (c - a + (d - c - b + a) * sx) * sy
}

/** Extracts the upper ridge polyline from a plane's closed outline and samples its crest y per texel column. */
function ridgeYPerCol(outline: readonly Pt[], bounds: Box, cols: number): Float32Array {
  const ys = new Float32Array(cols).fill(bounds.y)
  if (outline.length < 2) return ys
  // The plane outline runs left -> right along the ridge, then closes along the bottom back to left.
  let ridgeEnd = outline.length - 1
  for (let i = 1; i < outline.length; i++) {
    if (outline[i][0] < outline[i - 1][0] - 1e-3) { ridgeEnd = i - 1; break }
  }
  const n = Math.max(2, ridgeEnd + 1)
  let seg = 0
  for (let i = 0; i < cols; i++) {
    const x = bounds.x + (i + 0.5) * TEXEL
    while (seg < n - 2 && outline[seg + 1][0] < x) seg++
    const [ax, ay] = outline[seg], [bx, by] = outline[Math.min(n - 1, seg + 1)]
    const t = clamp((x - ax) / Math.max(1e-6, bx - ax), 0, 1)
    ys[i] = ay + (by - ay) * t
  }
  return ys
}

/** Legacy monochrome mottle/grain fallback when a synthetic plane descriptor omits `surfaceTone`. */
export function paintMottleOnly(ctx: Ctx2D, bounds: Box, amount: number, seed: number, env: PaintEnv) {
  if (amount <= 0) return
  const cols = Math.max(1, Math.ceil(bounds.w / TEXEL)), rows = Math.max(1, Math.ceil(bounds.h / TEXEL))
  const scratch = env.canvas(cols, rows)
  const image = scratch.ctx.createImageData(cols, rows), data = image.data
  const gx0 = Math.round(bounds.x / TEXEL), gy0 = Math.round(bounds.y / TEXEL)
  for (let j = 0; j < rows; j++) {
    const y = bounds.y + j * TEXEL
    for (let i = 0; i < cols; i++) {
      const x = bounds.x + i * TEXEL
      const v = valueNoise(seed, x * 0.06, y * 0.1) * 0.67 + valueNoise(seed + 7, x * 0.12, y * 0.2) * 0.33 - 0.5
        + (hash(seed + 3, i + gx0, j + gy0) - 0.5) * 0.14
      const o = (j * cols + i) * 4
      if (v < -0.035) data[o + 3] = Math.round(255 * Math.min(0.12, (-v - 0.02) * 0.34 * amount))
      else if (v > 0.07) { data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = Math.round(255 * Math.min(0.04, (v - 0.07) * 0.12 * amount)) }
    }
  }
  scratch.ctx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
  ctx.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, cols * TEXEL, rows * TEXEL)
}

/** Paints quantised living-land washes + seeded organic patches + integrated near mottle/grain inside a clipped plane. */
export function paintLandSurface(
  ctx: Ctx2D, outline: readonly Pt[], bounds: Box, surface: PlanePalette, grainAmount: number, seed: number, env: PaintEnv,
) {
  const { palette, cols: pCols, rows: pRows, cells } = surface
  if (!palette.length || !cells.length) { paintMottleOnly(ctx, bounds, grainAmount, seed, env); return }
  const wPx = Math.max(1, Math.ceil(bounds.w / TEXEL)), hPx = Math.max(1, Math.ceil(bounds.h / TEXEL))
  const scratch = env.canvas(wPx, hPx)
  const image = scratch.ctx.createImageData(wPx, hPx), data = image.data
  const crestY = ridgeYPerCol(outline, bounds, wPx)
  const footY = bounds.y + bounds.h
  const gx0 = Math.round(bounds.x / TEXEL), gy0 = Math.round(bounds.y / TEXEL)
  const invW = 1 / Math.max(1, bounds.w), maxC = pCols - 1, maxR = pRows - 1

  for (let j = 0; j < hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < wPx; i++) {
      const x = bounds.x + (i + 0.5) * TEXEL
      const u = clamp((x - bounds.x) * invW, 0, 1)
      const v = clamp((y - crestY[i]) / Math.max(10, footY - crestY[i]), 0, 1)

      // Gentle seeded organic patches: broad hillside washes + soft undulating transitions between distance bands.
      const n1 = valueNoise(seed + 17, x * 0.032, y * 0.055)
      const n2 = valueNoise(seed + 31, x * 0.075, y * 0.12)
      const gx = clamp(u * maxC + ((n1 * 0.68 + n2 * 0.32) - 0.5) * 1.4, 0, maxC)
      const gy = maxR > 0 ? clamp(v * maxR + ((n2 - 0.5) * 0.55 + (n1 - 0.5) * 0.35), 0, maxR) : 0

      const c0 = Math.floor(gx), c1 = Math.min(maxC, c0 + 1)
      const r0 = Math.floor(gy), r1 = Math.min(maxR, r0 + 1)
      // Calm gouache interior within each quantised patch, soft wet-on-damp seam across transitions.
      const fx = smooth(0.16, 0.84, gx - c0), fy = smooth(0.16, 0.84, gy - r0)
      const k00 = palette[cells[r0 * pCols + c0]] ?? palette[0]
      const k10 = palette[cells[r0 * pCols + c1]] ?? palette[0]
      const k01 = palette[cells[r1 * pCols + c0]] ?? palette[0]
      const k11 = palette[cells[r1 * pCols + c1]] ?? palette[0]
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy
      let r = k00[0] * w00 + k10[0] * w10 + k01[0] * w01 + k11[0] * w11
      let g = k00[1] * w00 + k10[1] * w10 + k01[1] * w01 + k11[1] * w11
      let b = k00[2] * w00 + k10[2] * w10 + k01[2] * w01 + k11[2] * w11

      if (grainAmount > 0) {
        const m = valueNoise(seed, x * 0.06, y * 0.1) * 0.67 + valueNoise(seed + 7, x * 0.12, y * 0.2) * 0.33 - 0.5
          + (hash(seed + 3, i + gx0, j + gy0) - 0.5) * 0.14
        const delta = m < -0.035 ? -Math.min(0.085, (-m - 0.02) * 0.24 * grainAmount)
          : m > 0.07 ? Math.min(0.03, (m - 0.07) * 0.09 * grainAmount) : 0
        r = clamp(r + delta, 0, 1); g = clamp(g + delta, 0, 1); b = clamp(b + delta, 0, 1)
      }
      const o = (j * wPx + i) * 4
      data[o] = Math.round(r * 255); data[o + 1] = Math.round(g * 255); data[o + 2] = Math.round(b * 255); data[o + 3] = 255
    }
  }
  scratch.ctx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
  ctx.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, wPx * TEXEL, hPx * TEXEL)
}
