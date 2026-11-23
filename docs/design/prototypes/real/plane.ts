import { encodedByte } from '../../../../src/scene/model/displayByte'
import { shadeLinearRgb } from '../../../../src/scene/model/landRadiance'
import { shadowBeam } from '../../../../src/scene/model/planeField'
import { TEXEL } from '../../../../src/scene/model/planeBands'
import type { LayerOf } from '../../../../src/scene/model/types'
import { outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { paintPlaneLight } from '../../../../src/scene/paint/shared/land/planeLight'
import { paintVegFields, paintVegRows, paintVegStrata } from '../../../../src/scene/paint/shared/land/landVegetation'
import { preparePlaneTexels, samplePlaneTexel } from '../../../../src/scene/paint/shared/land/planeTexel'
import { receiverBrush } from '../../../../src/scene/paint/shared/land/receiverBrush'
import { vegetationLight } from '../../../../src/scene/paint/shared/land/vegetationLight'
import { FACTS } from './facts'
import { planeGround } from './planeGround'
import { paintGullies } from './planeGullies'

/*
 * A plane of land in natural light: the model's palette, light field, snow and haze on a fine raster, the ground's own
 * surface at the eye's slant, and haze lying a little deeper at a far plane's foot. Pure.
 */

/** Surface px per sky px. */
const FINE = 1.6
/** How much deeper the model's own haze lies in the plane's foot. */
const POOL = 0.3

/** How far daylight opens the land's mid tones and its colour (linear light): the eye's own adaptation, none by night. */
const OPEN = 0.2, CHROMA = 0.12

function lift(rgb: [number, number, number], day: number) {
  const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2], k = 1 + OPEN * day * Math.max(0, 1 - y)
  for (let n = 0; n < 3; n++) rgb[n] = Math.max(0, (y + (rgb[n] - y) * (1 + CHROMA * day)) * k)
}

export function paintPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const { litField } = desc.light, { bounds } = desc
  if (!desc.surfaceTone.palette.length || !desc.surfaceTone.cells.length) return paintPlaneLight(ctx, desc, env)
  const targets = env.shade ? [ctx, env.shade] : [ctx]
  for (const target of targets) target.save()
  const { sun, moon } = FACTS.light
  const lamp = sun.altitude > -4 ? sun : moon
  const t = preparePlaneTexels(desc.outline, bounds, desc.surfaceTone, litField, desc.grain.seed, desc.grain.amount * env.hand.grain)
  const ground = planeGround(t, lamp.x < bounds.x + bounds.w / 2 ? -1 : 1)
  const w = Math.max(1, Math.ceil(bounds.w * FINE)), h = Math.max(1, Math.ceil(bounds.h * FINE))
  const scratch = env.canvas(w, h), shadows = shadowBeam(litField)
  const images = targets.map(() => scratch.ctx.createImageData(w, h))
  const day = Math.min(1, litField.eSun[1])
  const rgb: [number, number, number] = [0, 0, 0]
  for (let j = 0, o = 0; j < h; j++) {
    const y = bounds.y + (j + 0.5) / FINE
    for (let i = 0; i < w; i++, o += 4) {
      const x = bounds.x + (i + 0.5) / FINE, col = Math.min(t.wPx - 1, Math.floor((x - bounds.x) / TEXEL))
      const { rho, relief } = ground(x, y)
      const s = samplePlaneTexel(t, col, x, y, rho)
      const v = Math.min(1, Math.max(0, (y - t.crestY[col]) / Math.max(1, t.footY[col] - t.crestY[col])))
      const haze = Math.min(1, s.haze * (1 + POOL * v * v))
      for (let n = 0; n < images.length; n++) {
        shadeLinearRgb(s.rho, n ? shadows : litField.eSun, litField.eMoon, litField.eSky, Math.min(1, s.sVis * relief), s.mVis * relief,
          Math.min(1, s.vSky * (0.5 + 0.5 * relief)), litField.yHorizon, haze, litField.hazeLin, rgb)
        const data = images[n].data
        lift(rgb, day)
        data[o] = encodedByte(rgb[0]); data[o + 1] = encodedByte(rgb[1]); data[o + 2] = encodedByte(rgb[2]); data[o + 3] = 255
      }
    }
  }
  images.forEach((image, n) => {
    scratch.ctx.putImageData(image, 0, 0)
    targets[n].imageSmoothingEnabled = true
    targets[n].imageSmoothingQuality = 'high'
    targets[n].drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, w / FINE, h / FINE)
  })
  const veg = desc.vegetation, toneAt = vegetationLight(veg.tones, litField, desc.outline, bounds, Boolean(env.shade))
  const brush = receiverBrush(ctx, env.shade)
  paintVegStrata(brush, veg, toneAt)
  paintVegFields(brush, veg, toneAt)
  paintGullies(brush, desc)
  paintVegRows(brush, veg, toneAt)
  for (const target of targets) {
    target.globalCompositeOperation = 'destination-in'
    outline(target, desc.outline)
    target.fillStyle = '#000'
    target.fill()
    target.restore()
  }
}
