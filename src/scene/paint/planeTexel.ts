import { ALBEDO_CHROMA_BOOST, albedoLinear, shadeLinearRgb, SNOW_ALBEDO_LIN } from '../model/landRadiance'
import { toSrgb } from '../model/tone'
import type { Box, PlaneLitField, PlanePalette, Pt, RGB } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'
import { outlineBandY, TEXEL } from './landSurface'
import { materialAt, planeMaterial } from './planeMaterial'

/** Stationary receiver reflectance, light, snow and haze sampled by the terrain painter. */
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const smooth = (lo: number, hi: number, t: number) => {
  const x = clamp((t - lo) / (hi - lo), 0, 1)
  return x * x * (3 - 2 * x)
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
  snowY: Float32Array | null; snowCover: number; seed: number; grainAmount: number
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
  }
}

export interface TexelSample { rho: [number, number, number]; sVis: number; mVis: number; vSky: number; haze: number }

/** Samples raw linear reflectance (with gouache warp, material mottle & snow reflectance) plus field irradiance terms. */
export function samplePlaneTexel(t: PlaneTexelCtx, i: number, x: number, y: number, material?: RGB): TexelSample {
  const { litField, bounds, crestY, footY, snowY, snowCover } = t
  const u = clamp((x - bounds.x) / Math.max(1, bounds.w), 0, 1)
  const v = clamp((y - crestY[i]) / Math.max(1, footY[i] - crestY[i]), 0, 1)
  let [rr, rg, rb] = material ?? materialAt(t, x, y, u, v)
  let snow = 0
  if (snowY && y <= snowY[i] + 3) {
    const s = snow = (1 - smooth(snowY[i] - 3, snowY[i] + 3, y)) * snowCover
    rr += (SNOW_ALBEDO_LIN[0] - rr) * s; rg += (SNOW_ALBEDO_LIN[1] - rg) * s; rb += (SNOW_ALBEDO_LIN[2] - rb) * s
  }

  const field = samplePlaneField(litField, u, v)
  // A narrow illustration of reduced sky view where a uniform snow sheet meets the overlapping ridge.
  const edge = 1 - smooth(0, 5, y - crestY[i])
  field.vSky *= 1 - 0.28 * snow * (litField.snowSeam ?? 0) * edge
  return { rho: [rr, rg, rb], ...field }
}

export function samplePlaneField(litField: PlaneLitField, u: number, v: number): Omit<TexelSample, 'rho'> {
  const fCols = litField.cols, fRows = litField.rows, g = litField.grid
  const fxG = u * (fCols - 1), fyG = fRows > 1 ? v * (fRows - 1) : 0
  const fc0 = Math.floor(fxG), fc1 = Math.min(fCols - 1, fc0 + 1), fr0 = Math.floor(fyG), fr1 = Math.min(fRows - 1, fr0 + 1)
  const tx = fxG - fc0, ty = fyG - fr0
  const gw00 = (1 - tx) * (1 - ty), gw10 = tx * (1 - ty), gw01 = (1 - tx) * ty, gw11 = tx * ty
  const o00 = (fr0 * fCols + fc0) * 4, o10 = (fr0 * fCols + fc1) * 4, o01 = (fr1 * fCols + fc0) * 4, o11 = (fr1 * fCols + fc1) * 4
  const interp = (ch: number) => (g[o00 + ch] * gw00 + g[o10 + ch] * gw10 + g[o01 + ch] * gw01 + g[o11 + ch] * gw11) / 255
  return { sVis: interp(0), mVis: interp(1), vSky: interp(2), haze: interp(3) }
}

// Raster output is byte-encoded. This table avoids three film-transfer powers per
// texel and differs from rounded IEC sRGB by at most one byte.
const ENCODE_STEPS = 16384
const SRGB_BYTE = Uint8Array.from({ length: ENCODE_STEPS + 1 }, (_, i) => Math.round(toSrgb(i / ENCODE_STEPS) * 255))
const encodedByte = (linear: number) => SRGB_BYTE[Math.round(clamp(linear, 0, 1) * ENCODE_STEPS)]

function shadeTexel(t: PlaneTexelCtx, s: TexelSample, cloudVis: number) {
  const f = t.litField
  return shadeLinearRgb(s.rho, f.eSun, f.eMoon, f.eSky, s.sVis * cloudVis, s.mVis, s.vSky, f.yHorizon, s.haze, f.hazeLin)
}

/** Evaluates one texel to sRGB `[0..1]` using the exact shared `shadeLinearRgb` equation. */
export function shadeTexelSrgb(t: PlaneTexelCtx, s: TexelSample, cloudVis = 1): [number, number, number] {
  const [cr, cg, cb] = shadeTexel(t, s, cloudVis)
  return [toSrgb(cr), toSrgb(cg), toSrgb(cb)]
}

/** Paints the exact single-pass lit terrain surface + small finishing paper grain (after lighting & haze). */
export function paintLitSurface(
  ctx: Ctx2D, outline: readonly Pt[], bounds: Box, surface: PlanePalette, litField: PlaneLitField,
  form: string, grainAmount: number, seed: number, env: PaintEnv, pass?: (x: number, y: number) => number,
): void {
  if (!surface.palette.length || !surface.cells.length) return
  const t = preparePlaneTexels(outline, bounds, surface, litField, seed, grainAmount)
  const material = planeMaterial(t, form)
  const scratch = env.canvas(t.wPx, t.hPx)
  const image = scratch.ctx.createImageData(t.wPx, t.hPx), data = image.data
  for (let j = 0; j < t.hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < t.wPx; i++) {
      const x = bounds.x + (i + 0.5) * TEXEL
      const m = (j * t.wPx + i) * 3
      const s = samplePlaneTexel(t, i, x, y, [material[m], material[m + 1], material[m + 2]])
      const [sr, sg, sb] = shadeTexel(t, s, pass?.(x, y) ?? 1)
      const o = (j * t.wPx + i) * 4
      data[o] = encodedByte(sr)
      data[o + 1] = encodedByte(sg)
      data[o + 2] = encodedByte(sb)
      data[o + 3] = 255
    }
  }
  scratch.ctx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
  ctx.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, t.wPx * TEXEL, t.hPx * TEXEL)
  paintCrestSamples(ctx, t, pass)
}

/** Resolve narrow sun-facing crest colour that the body grid's texture raster would average down. */
function paintCrestSamples(ctx: Ctx2D, t: PlaneTexelCtx, pass?: (x: number, y: number) => number) {
  if (t.litField.eSun[1] < 0.015) return
  for (let i = 0; i < t.wPx; i++) {
    const left = t.bounds.x + i * TEXEL, x = left + TEXEL / 2, y = t.crestY[i]
    const rim = samplePlaneTexel(t, i, x, y + 0.65)
    const face = samplePlaneTexel(t, i, x, y + 9)
    const transmission = pass?.(x, y + 0.65) ?? 1
    if (rim.sVis * transmission - face.sVis * (pass?.(x, y + 9) ?? 1) < 0.025) continue
    ctx.fillStyle = css(shadeTexelSrgb(t, rim, transmission))
    ctx.fillRect(left, y - 0.75, TEXEL, 2.2)
  }
}
