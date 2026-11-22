import { ALBEDO_CHROMA_BOOST, albedoLinear, shadeLinearRgb, SNOW_ALBEDO_LIN } from '../model/landRadiance'
import { toSrgb } from '../model/tone'
import type { Box, PlaneLitField, PlanePalette, Pt } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'
import { outlineBandY, TEXEL } from './landSurface'

/**
 * Shared exact single-pass linear-light plane texel evaluator (Stage 7 round 2).
 * Used identically by `paintPlaneLight` and `paintCloudShadow`: evaluates raw BOA albedo -> material mottle ->
 * lying snow reflectance -> exact `ρ · E(n, cloudVis, terrainVis)` -> single `^0.6` compression -> per-sample
 * linear Koschmieder haze -> sRGB encode. Finishing paper grain is applied only after lighting and haze.
 */
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const smooth = (lo: number, hi: number, t: number) => {
  const x = clamp((t - lo) / (hi - lo), 0, 1)
  return x * x * (3 - 2 * x)
}

function hash(seed: number, x: number, y: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1)
  return a + (b - a) * sx + (c - a + (d - c - b + a) * sx) * sy
}

function sampleEdgeY(pts: readonly Pt[], bounds: Box, cols: number): Float32Array {
  const ys = new Float32Array(cols).fill(-1e6)
  if (pts.length < 2) return ys
  let seg = 0
  for (let i = 0; i < cols; i++) {
    const x = bounds.x + (i + 0.5) * TEXEL
    while (seg < pts.length - 2 && pts[seg + 1][0] < x) seg++
    const [ax, ay] = pts[seg], [bx, by] = pts[seg + 1]
    ys[i] = ay + (by - ay) * clamp((x - ax) / Math.max(1e-6, bx - ax), 0, 1)
  }
  return ys
}

export interface PlaneTexelCtx {
  wPx: number; hPx: number; bounds: Box; surface: PlanePalette; litField: PlaneLitField
  paletteLin: [number, number, number][]; crestY: Float32Array; footY: Float32Array
  snowY: Float32Array | null; snowCover: number; seed: number; grainAmount: number; gx0: number; gy0: number
}

export function preparePlaneTexels(
  outline: readonly Pt[], bounds: Box, surface: PlanePalette, litField: PlaneLitField, seed: number, grainAmount: number,
): PlaneTexelCtx {
  const wPx = Math.max(1, Math.ceil(bounds.w / TEXEL)), hPx = Math.max(1, Math.ceil(bounds.h / TEXEL))
  const { crestY, footY } = outlineBandY(outline, bounds, wPx)
  const paletteLin = surface.palette.map((albedo) => albedoLinear(albedo, ALBEDO_CHROMA_BOOST))
  const snowY = litField.snow ? sampleEdgeY(litField.snow.edge, bounds, wPx) : null
  return {
    wPx, hPx, bounds, surface, litField, paletteLin, crestY, footY,
    snowY, snowCover: litField.snow?.cover ?? 0, seed, grainAmount,
    gx0: Math.round(bounds.x / TEXEL), gy0: Math.round(bounds.y / TEXEL),
  }
}

export interface TexelSample { rho: [number, number, number]; sVis: number; mVis: number; vSky: number; haze: number }

/** Samples raw linear reflectance (with gouache warp, material mottle & snow reflectance) plus field irradiance terms. */
export function samplePlaneTexel(t: PlaneTexelCtx, i: number, x: number, y: number): TexelSample {
  const { surface, litField, paletteLin, bounds, crestY, footY, snowY, snowCover, seed, grainAmount } = t
  const pCols = surface.cols, pRows = surface.rows, cells = surface.cells
  const u = clamp((x - bounds.x) / Math.max(1, bounds.w), 0, 1)
  const v = clamp((y - crestY[i]) / Math.max(1, footY[i] - crestY[i]), 0, 1)

  const n1 = valueNoise(seed + 17, x * 0.032, y * 0.055), n2 = valueNoise(seed + 31, x * 0.075, y * 0.12)
  const maxC = pCols - 1, maxR = pRows - 1
  const gx = clamp(u * maxC + (n1 * 0.68 + n2 * 0.32 - 0.5) * 1.4, 0, maxC)
  const gy = maxR > 0 ? clamp(v * maxR + (n2 - 0.5) * 0.55 + (n1 - 0.5) * 0.35, 0, maxR) : 0
  const c0 = Math.floor(gx), c1 = Math.min(maxC, c0 + 1), r0 = Math.floor(gy), r1 = Math.min(maxR, r0 + 1)
  const fx = smooth(0.16, 0.84, gx - c0), fy = smooth(0.16, 0.84, gy - r0)
  const k00 = paletteLin[cells[r0 * pCols + c0]] ?? paletteLin[0]
  const k10 = paletteLin[cells[r0 * pCols + c1]] ?? paletteLin[0]
  const k01 = paletteLin[cells[r1 * pCols + c0]] ?? paletteLin[0]
  const k11 = paletteLin[cells[r1 * pCols + c1]] ?? paletteLin[0]
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy
  let rr = k00[0] * w00 + k10[0] * w10 + k01[0] * w01 + k11[0] * w11
  let rg = k00[1] * w00 + k10[1] * w10 + k01[1] * w01 + k11[1] * w11
  let rb = k00[2] * w00 + k10[2] * w10 + k01[2] * w01 + k11[2] * w11

  // Material mottle: linear reflectance variation BEFORE lighting so texture stays crisp in sunlit relief.
  if (grainAmount > 0) {
    const m = valueNoise(seed, x * 0.055, y * 0.095) * 0.67 + valueNoise(seed + 7, x * 0.12, y * 0.20) * 0.33 - 0.5
    const f = clamp(1 + m * 0.54 * grainAmount, 0.66, 1.34)
    rr = clamp(rr * f, 0, 1); rg = clamp(rg * f, 0, 1); rb = clamp(rb * f, 0, 1)
  }
  // Lying snow enters receiver reflectance BEFORE lighting and haze (Finding 7).
  if (snowY && y <= snowY[i] + 3) {
    const s = (1 - smooth(snowY[i] - 3, snowY[i] + 3, y)) * snowCover
    rr += (SNOW_ALBEDO_LIN[0] - rr) * s; rg += (SNOW_ALBEDO_LIN[1] - rg) * s; rb += (SNOW_ALBEDO_LIN[2] - rb) * s
  }

  const fCols = litField.cols, fRows = litField.rows, g = litField.grid
  const fxG = u * (fCols - 1), fyG = fRows > 1 ? v * (fRows - 1) : 0
  const fc0 = Math.floor(fxG), fc1 = Math.min(fCols - 1, fc0 + 1), fr0 = Math.floor(fyG), fr1 = Math.min(fRows - 1, fr0 + 1)
  const tx = fxG - fc0, ty = fyG - fr0
  const gw00 = (1 - tx) * (1 - ty), gw10 = tx * (1 - ty), gw01 = (1 - tx) * ty, gw11 = tx * ty
  const o00 = (fr0 * fCols + fc0) * 4, o10 = (fr0 * fCols + fc1) * 4, o01 = (fr1 * fCols + fc0) * 4, o11 = (fr1 * fCols + fc1) * 4
  const interp = (ch: number) => (g[o00 + ch] * gw00 + g[o10 + ch] * gw10 + g[o01 + ch] * gw01 + g[o11 + ch] * gw11) / 255
  return { rho: [rr, rg, rb], sVis: interp(0), mVis: interp(1), vSky: interp(2), haze: interp(3) }
}

/** Evaluates one texel to sRGB `[0..1]` using the exact shared `shadeLinearRgb` equation. */
export function shadeTexelSrgb(t: PlaneTexelCtx, s: TexelSample, cloudVis = 1): [number, number, number] {
  const f = t.litField
  const [cr, cg, cb] = shadeLinearRgb(s.rho, f.eSun, f.eMoon, f.eSky, s.sVis * cloudVis, s.mVis, s.vSky, f.yHorizon, s.haze, f.hazeLin)
  return [toSrgb(cr), toSrgb(cg), toSrgb(cb)]
}

/** Paints the exact single-pass lit terrain surface + small finishing paper grain (after lighting & haze). */
export function paintLitSurface(
  ctx: Ctx2D, outline: readonly Pt[], bounds: Box, surface: PlanePalette, litField: PlaneLitField,
  grainAmount: number, seed: number, env: PaintEnv,
): void {
  if (!surface.palette.length || !surface.cells.length) return
  const t = preparePlaneTexels(outline, bounds, surface, litField, seed, grainAmount)
  const scratch = env.canvas(t.wPx, t.hPx)
  const image = scratch.ctx.createImageData(t.wPx, t.hPx), data = image.data
  for (let j = 0; j < t.hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < t.wPx; i++) {
      const x = bounds.x + (i + 0.5) * TEXEL
      const [sr, sg, sb] = shadeTexelSrgb(t, samplePlaneTexel(t, i, x, y), 1)
      // Paper grain at its own small finishing amplitude (post-lighting, post-haze).
      const g = grainAmount > 0 ? (hash(seed + 3, i + t.gx0, j + t.gy0) - 0.5) * 0.026 * grainAmount : 0
      const o = (j * t.wPx + i) * 4
      data[o] = Math.round(clamp(sr + g, 0, 1) * 255)
      data[o + 1] = Math.round(clamp(sg + g, 0, 1) * 255)
      data[o + 2] = Math.round(clamp(sb + g, 0, 1) * 255)
      data[o + 3] = 255
    }
  }
  scratch.ctx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
  ctx.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, t.wPx * TEXEL, t.hPx * TEXEL)
}
