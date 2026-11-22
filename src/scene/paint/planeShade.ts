import type { LayerOf, Pt } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'
import { outlineBandY, TEXEL } from './landSurface'

/*
 * Plane linear-light irradiance multiplier painter (Stage 7, Band 0 — composited with `multiply` over
 * `plane:form + canopy:form`). Draws the compact `PlaneShadeField` bilinearly along the plane's exact
 * crest-to-foot band (`outlineBandY`), then lays soft floor cast shadows in `multiply` so cast shadows
 * remove only direct sunlight and never darken below diffuse skylight. Worker-safe; no `ctx.filter`.
 */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

function paintSoftMultiply(ctx: Ctx2D, points: Pt[], rgb: readonly [number, number, number], alpha: number, soft: number) {
  const offsets: [number, number][] = soft > 0
    ? [[0, 0], [-soft, 0], [soft, 0], [0, -soft / 2], [0, soft / 2], [-soft / 2, -soft / 4], [soft / 2, soft / 4]]
    : [[0, 0]]
  const per = alpha / (soft > 0 ? 4 : 1)
  ctx.fillStyle = css(rgb, per)
  for (const [dx, dy] of offsets) {
    ctx.beginPath()
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)))
    ctx.closePath()
    ctx.fill()
  }
}

/** Paints Band 0 of a plane's light canvas: full-face irradiance multiplier + floor cast shadows (`multiply`). */
export function paintPlaneShade(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const field = desc.light.shadeField
  if (!field || !field.cols || !field.rows) return
  const { bounds, outline } = desc
  const wPx = Math.max(1, Math.ceil(bounds.w / TEXEL)), hPx = Math.max(1, Math.ceil(bounds.h / TEXEL))
  const scratch = env.canvas(wPx, hPx)
  const image = scratch.ctx.createImageData(wPx, hPx), data = image.data
  const { crestY, footY } = outlineBandY(outline, bounds, wPx)
  const invW = 1 / Math.max(1, bounds.w), maxC = field.cols - 1, maxR = field.rows - 1
  const src = field.rgb, fCols = field.cols

  for (let j = 0; j < hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < wPx; i++) {
      const x = bounds.x + (i + 0.5) * TEXEL
      const u = clamp((x - bounds.x) * invW, 0, 1)
      const v = clamp((y - crestY[i]) / Math.max(1, footY[i] - crestY[i]), 0, 1)
      const gx = u * maxC, gy = maxR > 0 ? v * maxR : 0
      const c0 = Math.floor(gx), c1 = Math.min(maxC, c0 + 1), fx = gx - c0
      const r0 = Math.floor(gy), r1 = Math.min(maxR, r0 + 1), fy = gy - r0
      const o00 = (r0 * fCols + c0) * 3, o10 = (r0 * fCols + c1) * 3
      const o01 = (r1 * fCols + c0) * 3, o11 = (r1 * fCols + c1) * 3
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy
      const o = (j * wPx + i) * 4
      data[o] = Math.round(src[o00] * w00 + src[o10] * w10 + src[o01] * w01 + src[o11] * w11)
      data[o + 1] = Math.round(src[o00 + 1] * w00 + src[o10 + 1] * w10 + src[o01 + 1] * w01 + src[o11 + 1] * w11)
      data[o + 2] = Math.round(src[o00 + 2] * w00 + src[o10 + 2] * w10 + src[o01 + 2] * w01 + src[o11 + 2] * w11)
      data[o + 3] = 255
    }
  }
  scratch.ctx.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
  ctx.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, wPx * TEXEL, hPx * TEXEL)

  if (desc.light.faces.length) {
    ctx.globalCompositeOperation = 'multiply'
    for (const face of desc.light.faces) paintSoftMultiply(ctx, face.points, face.rgb, face.alpha, face.soft ?? 0)
  }
  ctx.restore()
}
