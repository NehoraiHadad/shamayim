import type { LayerOf, RGB } from '../model/types'
import { mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * A field layer as one continuous sheet over the dome (SPEC §6.0: layers before shapes). MEDIUM: the model's screen-ray
 * grid, one texel per ray, laid on a scratch surface and stretched between the row centres with the canvas's own bilinear
 * smoothing (no filter): the deck's soft brightness variations near the zenith, its bands crowding toward the horizon
 * (the rows do, `ys`), its edges and gaps where `alpha` falls. ORDER: texels, then the strips from far (top) to near.
 * Pure: every number is the model's; the grid's extent is the sheet's (the model spans the sky edge to edge).
 */
export function paintCloudSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const { xs, ys } = desc
  const cols = xs.length, rows = ys.length
  if (cols < 2 || rows < 2 || !desc.alpha.some((a) => a > 0)) return
  const { canvas, ctx: s } = env.canvas(cols, rows)
  const image = s.createImageData(cols, rows)
  for (let n = 0; n < cols * rows; n++) {
    const rgb = toneOf(desc, desc.tone[n] ?? 0)
    image.data.set([byte(rgb[0]), byte(rgb[1]), byte(rgb[2]), byte(desc.alpha[n] ?? 0)], n * 4)
  }
  s.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const x0 = xs[0], w = xs[cols - 1] - x0
  // Texel centres sit at +0.5: a strip from row r's centre to row r+1's interpolates exactly between the two rays.
  for (let r = 0; r + 1 < rows; r++) {
    const h = ys[r + 1] - ys[r]
    if (h > 0) ctx.drawImage(canvas, 0.5, r + 0.5, cols - 1, 1, x0, ys[r], w, h)
  }
  ctx.restore()
}

/** Lit at 0, the body at ½, the shaded underside at 1. */
function toneOf({ lit, body, shade }: LayerOf<'cloudSheet'>, tone: number): RGB {
  const t = Math.min(1, Math.max(0, tone))
  return t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
}

const byte = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255)
