import type { LayerOf, Wash } from '../model/types'
import { displace, sample, tube } from './core'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'
import { paintVegFields, paintVegRows, paintVegStrata } from './landVegetation'
import { paintLitSurface } from './planeTexel'

/*
 * Self-contained single-pass lit plane painter (Stages C2, 3, 4 & 7 round 2):
 * renders exact linear-light `ρ · E -> ^0.6 -> per-sample linear Koschmieder haze -> finishing paper grain`,
 * then lays lit geological strata, cropland fields, gullies, terraces, orchard rows, single-hazed crest washes,
 * sunlit crest rims and gully catchlights, masked once by `destination-in` against the antialiased plane outline.
 * Worker-safe; no clock; no `ctx.filter`.
 */

const WASH = [[1, 0.22], [0.78, 0.22], [0.57, 0.22], [0.37, 0.22], [0.18, 0.22]] as const

function paintWashes(ctx: Ctx2D, washes: readonly Wash[]) {
  if (!washes.length) return
  for (const [f, w] of WASH) {
    ctx.beginPath()
    for (const wash of washes) {
      wash.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      for (let i = wash.top.length - 1; i >= 0; i--) ctx.lineTo(wash.top[i][0], wash.top[i][1] + wash.depth[i] * f)
      ctx.closePath()
    }
    ctx.fillStyle = css(washes[0].rgb, washes[0].alpha * w)
    ctx.fill()
  }
}

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
    paintLitSurface(ctx, desc.outline, desc.bounds, desc.surfaceTone, litField, desc.grain.amount * env.hand.grain, desc.grain.seed, env)
    const litVeg = litField.litTones.length ? { ...desc.vegetation, tones: [...litField.litTones] } : desc.vegetation
    paintVegStrata(ctx, litVeg)
    paintVegFields(ctx, litVeg)
    paintGroundMarks(ctx, desc)
    paintVegRows(ctx, litVeg)
  } else if (light.veil.length && light.veil.some(([, , a]) => a > 0.002)) {
    const { x, y, w, h } = desc.bounds
    if (light.veil.length > 1) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0)
      for (const [at, rgb, a] of light.veil) g.addColorStop(Math.min(1, Math.max(0, (at - x) / (w || 1))), css(rgb, a))
      ctx.fillStyle = g
    } else ctx.fillStyle = css(light.veil[0][1], light.veil[0][2])
    ctx.fillRect(x, y, w, h)
  }

  // Single-hazed illustrated crest washes & crisp sunlit rims (never double-hazed).
  paintWashes(ctx, light.shade)
  paintWashes(ctx, light.lit)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 0.8
  for (const alpha of [...new Set(light.rims.map((rim) => rim.alpha))]) {
    const rims = light.rims.filter((rim) => rim.alpha === alpha)
    ctx.beginPath()
    for (const rim of rims) rim.points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.strokeStyle = css(rims[0].rgb, alpha)
    ctx.stroke()
  }

  const lift = light.lift
  if (lift && desc.gullies.length) {
    ctx.beginPath()
    for (const gully of desc.gullies) {
      const lip = gully.points.slice(0, Math.max(2, Math.ceil(gully.points.length * 0.7)))
      lip.forEach(([px, py], i) => (i ? ctx.lineTo(px + lift.dx * gully.w * 0.6, py) : ctx.moveTo(px + lift.dx * gully.w * 0.6, py)))
    }
    ctx.strokeStyle = css(lift.rgb, lift.alpha * 0.32)
    ctx.lineWidth = 0.45
    ctx.stroke()
  }

  // Single antialiased silhouette mask (zero fringe halo, zero median bleed).
  ctx.globalCompositeOperation = 'destination-in'
  outline(ctx, desc.outline)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
}
