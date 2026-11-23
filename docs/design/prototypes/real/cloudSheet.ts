import { addLight } from '../../../../src/scene/model/tone'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { toneOf } from '../../../../src/scene/paint/shared/cloud/deck'
import { FACTS } from './facts'
import { sheetField } from './sheetField'
import { sheetLight } from './sheetLight'

/*
 * A field layer in natural light: the model's coverage as a body of cloud that the light goes through. Its crowns and the
 * rim toward the light bright, its core and its far side in its own shade, thin parts letting the sky through. MEDIUM: one
 * raster, stretched by the canvas's own smoothing. The model's lit, body and shade colours and its tone per node are the
 * ends of the range; the light only says where on it each point stands.
 */

/** Opacity of the thickest cloud: a breath of sky stays behind it. */
const CORE = 0.97
/** How far the model's tone, and how far this raster's own light, place a point between lit and shade. */
const MODEL_SHARE = 0.45, OWN_SHADE = 0.95
/** How far over the model's lit colour the brightest crowns stand, as light (the model's lit is a mass's mean). */
const CROWN = 0.24
/** Share of the sky's light from above in the light on a crown. */
const FROM_SKY = 0.5

export function paintCloudSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const { xs, ys } = desc, cols = xs.length, rows = ys.length
  if (cols < 2 || rows < 2 || !desc.alpha.some((a) => a > 0)) return
  const width = xs[cols - 1] - xs[0], span = ys[rows - 1] - ys[0]
  const field = sheetField(desc)
  const { sun, moon } = FACTS.light
  const light = sheetLight(field, sun.altitude > -4 ? sun : moon, xs[0], ys[0])
  const { canvas, ctx: sheet } = env.canvas(field.w, field.h)
  const image = sheet.createImageData(field.w, field.h), data = image.data
  const thin = desc.lattice === 'high' ? 0.6 : 1
  for (let p = 0, o = 0; p < field.alpha.length; p++, o += 4) {
    const a = field.alpha[p]
    if (a <= 0.003) continue
    const lit = (1 - FROM_SKY) * light.sun[p] + FROM_SKY * light.sky[p]
    const body = field.thick[p] * thin
    const relief = (field.relief[p] - 0.5) * 0.5 * body
    const rgb = colourAt(desc, field.tone[p], lit, relief, body, field.city[p])
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

/** A point's colour: its place between the model's lit and shade colours, and over the lit one on a crown. */
function colourAt(desc: LayerOf<'cloudSheet'>, tone: number, lit: number, relief: number, body: number, city: number): RGB {
  const shade = MODEL_SHARE * tone + OWN_SHADE * body * (1 - lit) * 0.8 - relief - 0.16 * lit
  const rgb = toneOf(desc, Math.min(0.96, Math.max(0, shade)))
  const crown = Math.min(1, Math.max(0, -shade * 2.4 + 0.15)) * lit
  const bright = (c: number) => Math.min(1, c * (1 + CROWN))
  const out: RGB = mix(rgb, [bright(rgb[0]), bright(rgb[1]), bright(rgb[2])], crown)
  return desc.city ? addLight(out, desc.city.rgb, city) : out
}
