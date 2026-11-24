import { css } from '../base/hand'
import { vegetationLight } from './vegetationLight'
import type { LayerOf } from '../../../model/types'
import { displace, sample, tube } from '../base/core'
import { outline, type Ctx2D, type PaintEnv } from '../base/hand'
import { paintVegFields, paintVegRows, paintVegStrata } from './landVegetation'
import { paintPaperGrain } from './paperGrain'
import { paintLitSurface, type OwnGround, type PlaneTexelCtx } from './planeTexel'
import { receiverBrush, type ReceiverBrush, type ReceiverInk } from './receiverBrush'

const BLACK: ReceiverInk = [[0, 0, 0]]

/** What a hand paints its own way: the ground's surface (then no paper lies over it), the gullies. */
export interface PlaneLook {
  ground?: (t: PlaneTexelCtx) => OwnGround
  gullies: (brush: ReceiverBrush, desc: LayerOf<'plane'>) => void
}
const PLAIN: PlaneLook = { gullies: paintGullies }

function paintGullies(brush: ReceiverBrush, desc: LayerOf<'plane'>) {
  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.1, 0.3, 2, desc.grain.seed + i * 13)
    const n = line.length
    for (const [from, to, fade] of [[0, 0.45, 1], [0.4, 0.75, 0.65], [0.7, 1, 0.35]] as const) {
      const piece = line.slice(Math.floor(from * (n - 1)), Math.ceil(to * (n - 1)) + 1)
      if (piece.length < 2) continue
      const w0 = gully.w * (1 - from * 0.7), w1 = gully.w * (1 - to * 0.7)
      for (const [k, a] of [[1, 0.35], [0.45, 1]] as const) {
        const path = brush.path()
        tube(piece, w0 * k / 2, w1 * k / 2, false).forEach(([x, y], j) => j ? path.lineTo(x, y) : path.moveTo(x, y))
        path.closePath()
        brush.fill(BLACK, gully.alpha * a * fade)
      }
    }
  })
}

function paintTerraces(brush: ReceiverBrush, desc: LayerOf<'plane'>) {
  if (desc.terraces.length) {
    const ctx = brush.path()
    for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.45) : ctx.moveTo(x, y + 0.45)))
    brush.stroke(BLACK, 0.11, 0.55)
  }
}

/** Paints the complete lit terrain plane in one cached pass (replaces dual-band `planeScratch`). */
export function paintPlaneLight(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv, look = PLAIN): void {
  const { light } = desc
  const { litField } = light
  const targets = env.shade ? [ctx, env.shade] : [ctx]
  for (const target of targets) target.save()

  if (desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    paintLitSurface(ctx, desc.outline, desc.bounds, desc.surfaceTone, litField, desc.key, desc.grain.amount * env.hand.grain, desc.grain.seed, env, look.ground)
    const litVeg = desc.vegetation
    const toneAt = vegetationLight(litVeg.tones, litField, desc.outline, desc.bounds, Boolean(env.shade))
    const brush = receiverBrush(ctx, env.shade)
    paintVegStrata(brush, litVeg, toneAt)
    paintVegFields(brush, litVeg, toneAt)
    look.gullies(brush, desc)
    paintTerraces(brush, desc)
    paintVegRows(brush, litVeg, toneAt)
    const grain = desc.grain.amount * env.hand.grain
    // White paper specks have a stronger relative effect in the shadows of the display.
    if (!look.ground) paintPaperGrain(ctx, desc.bounds, desc.grain.seed, grain * Math.min(1, litField.yHorizon / 0.38), env)
  } else for (const target of targets) {
    target.fillStyle = css(desc.fill)
    target.fillRect(desc.bounds.x, desc.bounds.y, desc.bounds.w, desc.bounds.h)
  }

  // Single antialiased silhouette mask (zero fringe halo, zero median bleed).
  for (const target of targets) {
    target.globalCompositeOperation = 'destination-in'
    outline(target, desc.outline)
    target.fillStyle = '#000'
    target.fill()
    target.restore()
  }
}
