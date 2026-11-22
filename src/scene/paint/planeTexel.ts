import { ALBEDO_CHROMA_BOOST, albedoLinear, shadeLinearRgb, SNOW_ALBEDO_LIN } from '../model/landRadiance'
import { samplePlaneField, type FieldSample } from '../model/planeField'
import { encodedByte } from '../model/displayByte'
import { toSrgb } from '../model/tone'
import type { Box, PlaneLitField, PlanePalette, Pt, RGB } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'
import { outlineBandY, TEXEL } from '../model/planeBands'
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

export interface TexelSample extends FieldSample { rho: [number, number, number] }
const texelSample = (): TexelSample => ({ rho: [0, 0, 0], sVis: 0, mVis: 0, vSky: 0, haze: 0 })

/** Samples raw linear reflectance (with gouache warp, material mottle & snow reflectance) plus field irradiance terms. */
export function samplePlaneTexel(t: PlaneTexelCtx, i: number, x: number, y: number, material?: RGB, out = texelSample()): TexelSample {
  const { litField, bounds, crestY, footY, snowY, snowCover } = t
  const u = clamp((x - bounds.x) / Math.max(1, bounds.w), 0, 1)
  const v = clamp((y - crestY[i]) / Math.max(1, footY[i] - crestY[i]), 0, 1)
  let [rr, rg, rb] = material ?? materialAt(t, x, y, u, v)
  let snow = 0
  if (snowY && y <= snowY[i] + 3) {
    const s = snow = (1 - smooth(snowY[i] - 3, snowY[i] + 3, y)) * snowCover
    rr += (SNOW_ALBEDO_LIN[0] - rr) * s; rg += (SNOW_ALBEDO_LIN[1] - rg) * s; rb += (SNOW_ALBEDO_LIN[2] - rb) * s
  }

  samplePlaneField(litField, u, v, out)
  // A narrow illustration of reduced sky view where a uniform snow sheet meets the overlapping ridge.
  const edge = 1 - smooth(0, 5, y - crestY[i])
  out.vSky *= 1 - 0.28 * snow * (litField.snowSeam ?? 0) * edge
  out.rho[0] = rr; out.rho[1] = rg; out.rho[2] = rb
  return out
}

function shadeTexel(t: PlaneTexelCtx, s: TexelSample, cloudVis: number, out?: [number, number, number]) {
  const f = t.litField
  return shadeLinearRgb(s.rho, f.eSun, f.eMoon, f.eSky, s.sVis * cloudVis, s.mVis, s.vSky, f.yHorizon, s.haze, f.hazeLin, out)
}

/** Evaluates one texel to sRGB `[0..1]` using the exact shared `shadeLinearRgb` equation. */
export function shadeTexelSrgb(t: PlaneTexelCtx, s: TexelSample, cloudVis = 1): [number, number, number] {
  const [cr, cg, cb] = shadeTexel(t, s, cloudVis)
  return [toSrgb(cr), toSrgb(cg), toSrgb(cb)]
}

/** Paints the exact single-pass lit terrain surface + small finishing paper grain (after lighting & haze). */
export function paintLitSurface(
  ctx: Ctx2D, outline: readonly Pt[], bounds: Box, surface: PlanePalette, litField: PlaneLitField,
  form: string, grainAmount: number, seed: number, env: PaintEnv, beam = 1,
): void {
  if (!surface.palette.length || !surface.cells.length) return
  const t = preparePlaneTexels(outline, bounds, surface, litField, seed, grainAmount)
  const material = planeMaterial(t, form)
  const scratch = env.canvas(t.wPx, t.hPx)
  const image = scratch.ctx.createImageData(t.wPx, t.hPx), data = image.data
  const sample = texelSample(), rho: [number, number, number] = [0, 0, 0], rgb: typeof rho = [0, 0, 0]
  for (let j = 0; j < t.hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < t.wPx; i++) {
      const x = bounds.x + (i + 0.5) * TEXEL
      const m = (j * t.wPx + i) * 3
      rho[0] = material[m]; rho[1] = material[m + 1]; rho[2] = material[m + 2]
      samplePlaneTexel(t, i, x, y, rho, sample)
      const [sr, sg, sb] = shadeTexel(t, sample, beam, rgb)
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
  paintCrestSamples(ctx, t, beam)
}

/** Resolve narrow sun-facing crest colour that the body grid's texture raster would average down. */
function paintCrestSamples(ctx: Ctx2D, t: PlaneTexelCtx, beam: number) {
  if (!beam || t.litField.eSun[1] < 0.015) return
  for (let i = 0; i < t.wPx; i++) {
    const left = t.bounds.x + i * TEXEL, x = left + TEXEL / 2, y = t.crestY[i]
    const rim = samplePlaneTexel(t, i, x, y + 0.65)
    const face = samplePlaneTexel(t, i, x, y + 9)
    if (rim.sVis - face.sVis < 0.025) continue
    ctx.fillStyle = css(shadeTexelSrgb(t, rim))
    ctx.fillRect(left, y - 0.75, TEXEL, 2.2)
  }
}
