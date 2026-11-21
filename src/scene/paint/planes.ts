import type { LayerOf } from '../model/types'
import { displace, sample, tube } from './core'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'
import { paintLandSurface } from './landSurface'

/*
 * A terrain plane's light-free form in the enriched hand (Stage C2 + Living Land Stage 3).
 * ORDER: single-coverage antialiased surface (quantised albedo patches + mottle/grain via `landSurface.ts`,
 * or median fill when the palette is empty) -> gullies cut down slopes -> contour terraces -> grounded scrub.
 * Plane light (`paintPlaneLight`) lives in `scene/paint/planeLight.ts`. Worker-safe; no clock; no `ctx.filter`.
 */

/** The form of a plane: light-free living-land albedo patches, mottle, gullies, terraces and scrub. */
export function paintPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const grainAmount = desc.grain.amount * env.hand.grain
  if (desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    // One application of `ctx.fill()`'s exact antialiased outline coverage via `destination-in` (matching
    // `paintPlaneLight`, with zero median bleed and no double-coverage silhouette thickening).
    paintLandSurface(ctx, desc.outline, desc.bounds, desc.surfaceTone, grainAmount, desc.grain.seed, env)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    outline(ctx, desc.outline)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
  } else {
    outline(ctx, desc.outline)
    ctx.fillStyle = css(desc.fill)
    ctx.fill()
  }
  // Gullies, terraces and scrub lie under the crest by construction (`world/land.ts`): no clip.

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

  // Terraces: the shade line under each step of the hillside.
  if (desc.terraces.length) {
    ctx.beginPath()
    for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.45) : ctx.moveTo(x, y + 0.45)))
    ctx.strokeStyle = 'rgb(0 0 0 / 0.11)'
    ctx.lineWidth = 0.55
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // Scrub: grounded contact shade + olive-dark bushes multiplied onto the local land albedo so scrub always
  // sits naturally darker than both dark pine and warm desert slopes.
  if (desc.scrub.length) {
    ctx.beginPath()
    for (const dot of desc.scrub) ctx.rect(dot.x - dot.r * 0.2, dot.y + dot.r * 0.55, dot.r * 1.5, Math.max(0.35, dot.r * 0.3))
    ctx.fillStyle = 'rgb(0 0 0 / 0.18)'
    ctx.fill()
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const byTone = new Map<string, typeof desc.scrub>()
    for (const dot of desc.scrub) {
      // Map `world/land.ts` scrub shade `[0.30..0.45]` into `[0.65..0.85]` multiply tint (preserving olive bias).
      const tone = css([Math.min(1, dot.rgb[0] * 1.95), Math.min(1, dot.rgb[1] * 1.95), Math.min(1, dot.rgb[2] * 1.85)], 0.85)
      const list = byTone.get(tone)
      if (list) list.push(dot)
      else byTone.set(tone, [dot])
    }
    for (const [tone, dots] of byTone) {
      ctx.beginPath()
      for (const dot of dots) { ctx.moveTo(dot.x + dot.r, dot.y); ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2) }
      ctx.fillStyle = tone
      ctx.fill()
    }
    ctx.restore()
  }
}
