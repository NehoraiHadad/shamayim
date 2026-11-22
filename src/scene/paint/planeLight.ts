import { solarTransmission } from '../model/planeCloudShadow'
import { vegetationLight } from './vegetationLight'
import type { LayerOf } from '../model/types'
import { displace, sample, tube } from './core'
import { outline, type Ctx2D, type PaintEnv } from './hand'
import { paintVegFields, paintVegRows, paintVegStrata } from './landVegetation'
import { paintPaperGrain } from './paperGrain'
import { paintLitSurface } from './planeTexel'

function paintGroundMarks(ctx: Ctx2D, desc: LayerOf<'plane'>) {
  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.1, 0.3, 2, desc.grain.seed + i * 13)
    const n = line.length
    for (const [from, to, fade] of [[0, 0.45, 1], [0.4, 0.75, 0.65], [0.7, 1, 0.35]] as const) {
      const piece = line.slice(Math.floor(from * (n - 1)), Math.ceil(to * (n - 1)) + 1)
      if (piece.length < 2) continue
      const w0 = gully.w * (1 - from * 0.7), w1 = gully.w * (1 - to * 0.7)
      for (const [k, a] of [[1, 0.35], [0.45, 1]] as const) {
        outline(ctx, tube(piece, w0 * k / 2, w1 * k / 2, false))
        ctx.fillStyle = `rgb(0 0 0 / ${(gully.alpha * a * fade).toFixed(3)})`
        ctx.fill()
      }
    }
  })
  if (desc.terraces.length) {
    ctx.beginPath()
    for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.45) : ctx.moveTo(x, y + 0.45)))
    ctx.strokeStyle = 'rgb(0 0 0 / 0.11)'
    ctx.lineWidth = 0.55
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

/** Paints the complete lit terrain plane in one cached pass (replaces dual-band `planeScratch`). */
export function paintPlaneLight(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const { light } = desc
  const { litField } = light
  ctx.save()

  if (litField && desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    const pass = solarTransmission(desc.cloudShadow, env.phase)
    paintLitSurface(ctx, desc.outline, desc.bounds, desc.surfaceTone, litField, desc.key, desc.grain.amount * env.hand.grain, desc.grain.seed, env, pass)
    const litVeg = desc.vegetation
    const toneAt = vegetationLight(litVeg.tones, litField, desc.outline, desc.bounds, pass)
    paintVegStrata(ctx, litVeg, toneAt)
    paintVegFields(ctx, litVeg, toneAt)
    paintGroundMarks(ctx, desc)
    paintVegRows(ctx, litVeg, toneAt)
    paintPaperGrain(ctx, desc.bounds, desc.grain.seed, desc.grain.amount * env.hand.grain, env)
  }

  // Single antialiased silhouette mask (zero fringe halo, zero median bleed).
  ctx.globalCompositeOperation = 'destination-in'
  outline(ctx, desc.outline)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
}
