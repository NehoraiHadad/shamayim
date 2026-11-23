import { smoothstep } from '../../../../src/domain/smoothstep'
import { addLight } from '../../../../src/scene/model/tone'
import type { LayerOf } from '../../../../src/scene/model/types'
import type { Ctx2D, PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { FACTS } from './facts'
import { cloudLight } from './cloudLight'
import { cloudTone } from './cloudTone'
import { sheetField } from './sheetField'

/*
 * A field layer in natural light: the model's coverage as a body of cloud that the light goes through. Its crowns and the
 * rim toward the light bright, its core, far side and base in its own shade, thin parts letting the sky through. MEDIUM:
 * one raster, stretched by the canvas's own smoothing.
 */

/** Opacity of the thickest cloud: a breath of sky stays behind it. */
const CORE = 0.97
/** Low over the horizon a cloud is far: the share of the sky's height over which the air takes its depth, and what it keeps. */
const FAR = 0.34, KEEP = 0.2
/** A veil has no depth to speak of: what it keeps of it. */
const VEIL_DEPTH = 0.6

export function paintCloudSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const { xs, ys } = desc, cols = xs.length, rows = ys.length
  if (cols < 2 || rows < 2 || !desc.alpha.some((a) => a > 0)) return
  const width = xs[cols - 1] - xs[0], span = ys[rows - 1] - ys[0]
  const { sun, moon } = FACTS.light, lamp = sun.altitude > -4 ? sun : moon
  const field = sheetField(desc, lamp)
  const light = cloudLight(field, lamp, xs[0], ys[0])
  const { canvas, ctx: sheet } = env.canvas(field.w, field.h)
  const image = sheet.createImageData(field.w, field.h), data = image.data
  const depth = desc.lattice === 'high' ? VEIL_DEPTH : 1
  for (let p = 0, o = 0; p < field.alpha.length; p++, o += 4) {
    const a = field.alpha[p]
    if (a <= 0.003) continue
    const near = KEEP + (1 - KEEP) * smoothstep(0, FAR, 1 - Math.floor(p / field.w) / field.h)
    let rgb = cloudTone(desc, { tone: field.tone[p], sun: light.sun[p], sky: light.sky[p], deep: light.deep[p] * depth,
      base: light.base[p], relief: field.relief[p], thick: field.thick[p], near, own: field.open })
    if (desc.city) rgb = addLight(rgb, desc.city.rgb, field.city[p])
    data[o] = rgb[0] * 255; data[o + 1] = rgb[1] * 255; data[o + 2] = rgb[2] * 255
    data[o + 3] = a * CORE * 255
  }
  sheet.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0.5, 0.5, field.w - 1, field.h - 1, xs[0], ys[0], width, span)
  ctx.restore()
}
