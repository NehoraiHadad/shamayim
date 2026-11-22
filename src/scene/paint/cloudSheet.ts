import type { LayerOf, RGB } from '../model/types'
import { mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * A field layer as one continuous sheet over the dome (SPEC §6.0: layers before shapes). MEDIUM: the model's screen-ray
 * grid laid on a scratch surface and stretched over the sky with the canvas's own bilinear smoothing (no filter): the
 * deck's soft brightness variations near the zenith, its bands crowding toward the horizon, its edges and gaps where
 * `alpha` falls. The rows (`ys`) are uneven, so they are first resampled here, linearly between the two rays around
 * each output row and in premultiplied colour, to rows ROW px apart. One draw then stretches them: a per-row strip would
 * lose the vertical blend, because the canvas clamps its smoothing to the source rectangle and draws stair-steps.
 * Pure: every number is the model's; the grid's extent is the sheet's (the model spans the sky edge to edge).
 */
const ROW = 2

export function paintCloudSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const { xs, ys } = desc
  const cols = xs.length, rows = ys.length
  if (cols < 2 || rows < 2 || !desc.alpha.some((a) => a > 0)) return
  const y0 = ys[0], span = ys[rows - 1] - y0
  if (span <= 0) return
  const out = Math.max(2, Math.ceil(span / ROW) + 1)
  const texels = premultiplied(desc)
  const { canvas, ctx: s } = env.canvas(cols, out)
  const image = s.createImageData(cols, out)
  let r = 0
  for (let k = 0; k < out; k++) {
    const y = y0 + (k * span) / (out - 1)
    while (r + 2 < rows && ys[r + 1] < y) r++
    const h = ys[r + 1] - ys[r]
    const t = h > 0 ? Math.min(1, Math.max(0, (y - ys[r]) / h)) : 0
    for (let c = 0; c < cols; c++) {
      const a = texels[r * cols + c], b = texels[(r + 1) * cols + c]
      const alpha = a[3] + (b[3] - a[3]) * t
      const at = (k * cols + c) * 4
      for (let i = 0; i < 3; i++) image.data[at + i] = byte(alpha > 0 ? (a[i] + (b[i] - a[i]) * t) / alpha : 0)
      image.data[at + 3] = byte(alpha)
    }
  }
  s.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Texel centres sit at +0.5: the first and last centres land on the grid's edges.
  ctx.drawImage(canvas, 0.5, 0.5, cols - 1, out - 1, xs[0], y0, xs[cols - 1] - xs[0], span)
  ctx.restore()
}

/** Each ray's colour times its alpha, and its alpha: the quantities that interpolate without dark fringes. */
function premultiplied(desc: LayerOf<'cloudSheet'>): number[][] {
  return Array.from({ length: desc.xs.length * desc.ys.length }, (_, n) => {
    const a = Math.min(1, Math.max(0, desc.alpha[n] ?? 0))
    const rgb = toneOf(desc, desc.tone[n] ?? 0)
    return [rgb[0] * a, rgb[1] * a, rgb[2] * a, a]
  })
}

/** Lit at 0, the body at ½, the shaded underside at 1. */
function toneOf({ lit, body, shade }: LayerOf<'cloudSheet'>, tone: number): RGB {
  const t = Math.min(1, Math.max(0, tone))
  return t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
}

const byte = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255)
