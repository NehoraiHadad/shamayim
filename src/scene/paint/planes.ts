import type { LayerOf } from '../model/types'
import { displace, sample, tube } from './core'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'
import { paintLandSurface } from './landSurface'
import { paintVegCrowns } from './landVegCrowns'
import { paintVegTufts } from './landVegTufts'
import { paintVegFields, paintVegRows, paintVegStrata } from './landVegetation'

/*
 * A terrain plane's light-free form in the enriched hand (Stage C2 + Living Land Stages 3 & 4).
 * ORDER: quantised albedo patches + mottle/grain (`landSurface.ts`) -> bare-desert geological strata ->
 * cropland field patchwork -> gullies & stone terraces -> converging orchard rows ->
 * one `destination-in` antialiased outline mask (matching
 * `paintPlaneLight` with exact single coverage and zero median bleed). Worker-safe; no clock; no `ctx.filter`.
 */

/** The form of a plane: light-free living-land albedo, strata, fields, gullies, terraces and vegetation. */
export function paintPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const grainAmount = desc.grain.amount * env.hand.grain
  const hasSurface = desc.surfaceTone.palette.length > 0 && desc.surfaceTone.cells.length > 0
  if (hasSurface) {
    paintLandSurface(ctx, desc.outline, desc.bounds, desc.surfaceTone, grainAmount, desc.grain.seed, env)
  } else {
    outline(ctx, desc.outline)
    ctx.fillStyle = css(desc.fill)
    ctx.fill()
  }

  // Ground-plane strata (bare/desert) and cropland patchwork sit softly under gullies, terraces and canopies.
  paintVegStrata(ctx, desc.vegetation)
  paintVegFields(ctx, desc.vegetation)

  // Gullies: tapered cuts down slopes, darkest at the head and fading out, edge softened by stacked copies.
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

  // Terraces: the shade line under each step of a non-bare hillside.
  if (desc.terraces.length) {
    ctx.beginPath()
    for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.45) : ctx.moveTo(x, y + 0.45)))
    ctx.strokeStyle = 'rgb(0 0 0 / 0.11)'
    ctx.lineWidth = 0.55
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // Ground-aligned orchard alleys stay with the static form. Scene canopies are composited over it.
  paintVegRows(ctx, desc.vegetation)
  if (!desc.canopyId) {
    paintVegTufts(ctx, desc.vegetation)
    paintVegCrowns(ctx, desc.vegetation)
  }

  // Single application of `ctx.fill()`'s exact antialiased outline coverage so surface, fields and slope-edge
  // vegetation never thicken the silhouette or leak outside `paintPlaneLight`'s mask.
  if (hasSurface) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    outline(ctx, desc.outline)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
  }
}
