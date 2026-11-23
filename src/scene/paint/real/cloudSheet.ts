import { hashId } from '../../../data/landmarks/hash'
import type { LayerOf } from '../../model/types'
import { deckOpenness, sheetTexels, softRadii } from './cloudLook'
import { rasterise } from './cloudRaster'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { soften } from '../shared/base/soften'

/*
 * A field layer as one continuous sheet over the dome (SPEC §6.0: layers before shapes). MEDIUM: the model's screen-ray
 * grid laid on a scratch surface and stretched over the sky with the canvas's own bilinear smoothing (no filter). The
 * rows (`ys`) are uneven, denser toward the horizon, so they are first resampled here, linearly between the two rays
 * around each output row and in premultiplied colour, to rows ROW px apart. One draw then stretches them: a per-row strip
 * would lose the vertical blend, because the canvas clamps its smoothing to the source rectangle and draws stair-steps.
 * How the sheet looks (its colour, translucency and softness) is `cloudLook`'s; its fine detail `cloudRaster`'s.
 * Pure: every number is the model's; the grid's extent is the sheet's (the model spans the sky edge to edge).
 */
export const ROW = 2

export function paintCloudSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const { xs, ys } = desc
  const cols = xs.length, rows = ys.length
  if (cols < 2 || rows < 2 || !desc.alpha.some((a) => a > 0)) return
  const y0 = ys[0], span = ys[rows - 1] - y0
  if (span <= 0) return
  const out = Math.max(2, Math.ceil(span / ROW) + 1)
  const open = deckOpenness(desc)
  const { buf, spacing } = resampleRows(sheetTexels(desc, open), cols, ys, out)
  const colPx = (xs[cols - 1] - xs[0]) / (cols - 1), rowPx = span / (out - 1)
  const radii = spacing.map(softRadii)
  soften(buf, cols, out, radii.map(([across]) => across / colPx), radii.map(([, down]) => down / rowPx))
  const width = xs[cols - 1] - xs[0]
  const { canvas, w, h } = rasterise(env, { buf, cols, rows: out, spacing }, width, span, open, hashId(desc.id))
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Texel centres sit at +0.5: the first and last centres land on the grid's edges.
  ctx.drawImage(canvas, 0.5, 0.5, w - 1, h - 1, xs[0], y0, width, span)
  ctx.restore()
}

/** The texel grid on `out` even rows from `ys[0]` to its last row, and each output row's source row spacing (px). */
export function resampleRows(texels: number[][], cols: number, ys: readonly number[], out: number) {
  const y0 = ys[0], span = ys[ys.length - 1] - y0
  const buf = new Float32Array(cols * out * 4)
  const spacing: number[] = []
  let r = 0
  for (let k = 0; k < out; k++) {
    const y = y0 + (k * span) / (out - 1)
    while (r + 2 < ys.length && ys[r + 1] < y) r++
    const h = spacing[k] = ys[r + 1] - ys[r]
    const t = h > 0 ? Math.min(1, Math.max(0, (y - ys[r]) / h)) : 0
    for (let c = 0; c < cols; c++) {
      const a = texels[r * cols + c], b = texels[(r + 1) * cols + c]
      for (let i = 0; i < 4; i++) buf[(k * cols + c) * 4 + i] = a[i] + (b[i] - a[i]) * t
    }
  }
  return { buf, spacing }
}
