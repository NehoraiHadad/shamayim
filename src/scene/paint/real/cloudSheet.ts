import { smoothstep } from '../../../domain/smoothstep'
import { CORE_LEAK } from '../../model/bodies'
import type { LayerOf } from '../../model/types'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { lampLight } from './cloud/lampLight'
import { RASTER, sheetField, type SheetField } from './cloud/sheetField'
import { sheetLight } from './cloud/sheetLight'
import { cloudPoint, cloudTone } from './cloud/tone'

/*
 * A field layer as one continuous sheet over the dome (SPEC §6.0: layers before shapes): the model's coverage as a body of
 * cloud that the light goes through. Its crowns and the rim toward the light bright, its core, far side and base in its own
 * shade, thin parts letting the sky through; a closed deck and the high veils keep the model's own tones. MEDIUM: one raster
 * (`sheetField`), stretched over the sky by the canvas's own smoothing (no filter). Pure: every number is the model's.
 */

/** Opacity of the thickest cloud of an open deck: a breath of sky stays behind it. */
const CORE = 1 - CORE_LEAK
/** Low over the horizon a cloud is far: the share of the sky's height over which the air takes its depth, and what it keeps. */
const FAR = 0.34, KEEP = 0.2

export function paintCloudSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const { xs, ys } = desc, cols = xs.length, rows = ys.length
  if (cols < 2 || rows < 2 || !desc.alpha.some((a) => a > 0)) return
  const span = ys[rows - 1] - ys[0]
  if (span <= 0) return
  const field = sheetField(desc), { w, h } = field
  const { canvas, ctx: sheet } = env.canvas(w, h)
  const image = sheet.createImageData(w, h)
  colour(image.data, desc, field)
  sheet.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Texel centres sit at +0.5: the first and last centres land on the grid's edges.
  ctx.drawImage(canvas, 0.5, 0.5, w - 1, h - 1, xs[0], ys[0], xs[cols - 1] - xs[0], span)
  ctx.restore()
}

function colour(data: Uint8ClampedArray, desc: LayerOf<'cloudSheet'>, field: SheetField): void {
  const { w, h, alpha, open } = field, { city } = desc
  const { x, y, beam } = lampLight(desc.lamp)
  const light = open ? sheetLight(field, { x: (x - desc.xs[0]) * RASTER, y: (y - desc.ys[0]) * RASTER }, beam) : null
  const tone = cloudTone(desc, open), point = cloudPoint(), rgb = new Float32Array(3), core = 1 + open * (CORE - 1)
  for (let j = 0, p = 0; j < h; j++) {
    point.near = KEEP + (1 - KEEP) * smoothstep(0, FAR, 1 - j / h)
    for (let i = 0; i < w; i++, p++) {
      if (alpha[p] <= 0.003) continue
      point.tone = field.tone[p]
      light?.(i, j, p, point)
      tone(point, rgb)
      // The source's share and the towns' light are on the cloud, whatever its own light.
      const o = p * 4, gain = desc.source ? field.source[p] ** (1 / 2.4) : 1, towns = city ? field.city[p] : 0
      for (let k = 0; k < 3; k++) {
        // As `scaleLight` and `addLight`, in place: the sRGB curve's power part, where a cloud's tones are.
        const own = gain === 1 ? rgb[k] : Math.max(0, (rgb[k] + 0.055) * gain - 0.055)
        data[o + k] = Math.round(255 * Math.min(1, towns ? Math.sqrt(own * own + towns * city!.rgb[k] ** 2) : own))
      }
      data[o + 3] = Math.round(255 * alpha[p] * core)
    }
  }
}
