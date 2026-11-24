import { ALBEDO_CHROMA_BOOST, albedoLinear, shadeLinearRgb, SNOW_ALBEDO_LIN } from '../../../model/landRadiance'
import { samplePlaneField, shadowBeam, type FieldSample } from '../../../model/planeField'
import { encodedByte } from '../../../model/displayByte'
import { toSrgb } from '../../../model/tone'
import type { Box, PlaneLitField, PlanePalette, Pt, RGB } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { outlineBandY, TEXEL } from '../../../model/planeBands'
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

interface TexelSample extends FieldSample { rho: [number, number, number] }
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

function shadeTexel(t: PlaneTexelCtx, s: TexelSample, beam: RGB, cloudVis: number, out?: [number, number, number]) {
  const f = t.litField
  return shadeLinearRgb(s.rho, beam, f.eMoon, f.eSky, s.sVis * cloudVis, s.mVis, s.vSky, f.yHorizon, s.haze, f.hazeLin, out)
}

/** Evaluates one texel to sRGB `[0..1]` using the exact shared `shadeLinearRgb` equation. */
export function shadeTexelSrgb(t: PlaneTexelCtx, s: TexelSample, cloudVis = 1, beam = t.litField.eSun): [number, number, number] {
  const [cr, cg, cb] = shadeTexel(t, s, beam, cloudVis)
  return [toSrgb(cr), toSrgb(cg), toSrgb(cb)]
}

/** A hand's own ground: a texel's reflectance, and the light on it turned by its small form. */
export interface OwnGround {
  rho(n: number, out: [number, number, number]): void
  /** Turns the moon's and the sky's light on texel `n` of column `i` in place; gives the factor of the sun's. */
  turn(n: number, i: number, light: FieldSample): number
}

/** Paints the exact single-pass lit terrain surface + small finishing paper grain (after lighting & haze). */
export function paintLitSurface(
  ctx: Ctx2D, outline: readonly Pt[], bounds: Box, surface: PlanePalette, litField: PlaneLitField,
  form: string, grainAmount: number, seed: number, env: PaintEnv, ownOf?: (t: PlaneTexelCtx) => OwnGround,
): void {
  if (!surface.palette.length || !surface.cells.length) return
  const t = preparePlaneTexels(outline, bounds, surface, litField, seed, grainAmount)
  const own = ownOf?.(t), material = own ? undefined : planeMaterial(t, form)
  const scratch = env.canvas(t.wPx, t.hPx)
  const image = scratch.ctx.createImageData(t.wPx, t.hPx), data = image.data
  const shade = env.shade && scratch.ctx.createImageData(t.wPx, t.hPx)
  const diffuse = shadowBeam(litField)
  const sample = texelSample(), rho: [number, number, number] = [0, 0, 0], rgb: typeof rho = [0, 0, 0]
  for (let j = 0; j < t.hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < t.wPx; i++) {
      const x = bounds.x + (i + 0.5) * TEXEL, n = j * t.wPx + i, m = n * 3, o = n * 4
      if (material) { rho[0] = material[m]; rho[1] = material[m + 1]; rho[2] = material[m + 2] } else own!.rho(n, rho)
      samplePlaneTexel(t, i, x, y, rho, sample)
      const turned = own?.turn(n, i, sample) ?? 1
      shadeTexel(t, sample, litField.eSun, turned, rgb)
      encodeTexel(data, o, rgb)
      if (shade) {
        if (sample.sVis) shadeTexel(t, sample, diffuse, Math.min(1, turned), rgb)
        encodeTexel(shade.data, o, rgb)
      }
    }
  }
  const stamp = (target: Ctx2D, pixels: ImageData) => {
    scratch.ctx.putImageData(pixels, 0, 0)
    target.imageSmoothingEnabled = true
    target.imageSmoothingQuality = 'low'
    target.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, t.wPx * TEXEL, t.hPx * TEXEL)
  }
  stamp(ctx, image)
  if (env.shade && shade) stamp(env.shade, shade)
  paintCrestSamples(ctx, t, env.shade, own)
}

function encodeTexel(data: Uint8ClampedArray, o: number, rgb: RGB) {
  data[o] = encodedByte(rgb[0]); data[o + 1] = encodedByte(rgb[1]); data[o + 2] = encodedByte(rgb[2]); data[o + 3] = 255
}

/** Resolve narrow sun-facing crest colour that the body grid's texture raster would average down. */
function paintCrestSamples(ctx: Ctx2D, t: PlaneTexelCtx, shade?: Ctx2D, own?: OwnGround) {
  if (t.litField.eSun[1] < 0.015) return
  for (let i = 0; i < t.wPx; i++) {
    const left = t.bounds.x + i * TEXEL, x = left + TEXEL / 2, y = t.crestY[i], rho: [number, number, number] = [0, 0, 0]
    const n = clamp(Math.floor((y + 0.65 - t.bounds.y) / TEXEL), 0, t.hPx - 1) * t.wPx + i
    own?.rho(n, rho)
    const rim = samplePlaneTexel(t, i, x, y + 0.65, own && rho), face = samplePlaneTexel(t, i, x, y + 9, own && rho)
    if (rim.sVis - face.sVis < 0.025) continue
    const turned = own?.turn(n, i, rim) ?? 1
    ctx.fillStyle = css(shadeTexelSrgb(t, rim, turned))
    ctx.fillRect(left, y - 0.75, TEXEL, 2.2)
    if (shade) {
      shade.fillStyle = css(shadeTexelSrgb(t, rim, Math.min(1, turned), shadowBeam(t.litField)))
      shade.fillRect(left, y - 0.75, TEXEL, 2.2)
    }
  }
}
