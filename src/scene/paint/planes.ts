import type { LayerOf, Pt, Wash } from '../model/types'
import { displace, sample, tube } from './core'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'
import { paintLandSurface, paintMottleOnly } from './landSurface'

/*
 * A plane of land in the enriched hand (Stage 3 living land, after the anidoodle skill's craft notes).
 * MEDIUM: the scene's own illustrated hand — flat opaque bodies painted with quantised, light-free land
 * albedo washes and gentle seeded patches, soft one-sided light, Koschmieder aerial haze, no outlines.
 * ORDER: FORM (light-free: quantised albedo patches + mottle/grain, gullies cut down slopes, contour
 * terraces, grounded scrub drifts) -> LIGHT (`source-over`: ambient mood + aerial haze veil, snow, shade
 * and lit crest washes, floor shadow, crest rim, ground lift). Worker-safe on OffscreenCanvas; no clock;
 * no `ctx.filter`.
 */

/** The form of a plane: light-free living-land albedo patches, mottle, gullies, terraces and scrub. */
export function paintPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  outline(ctx, desc.outline)
  ctx.fillStyle = css(desc.fill)
  ctx.fill()
  ctx.save()
  outline(ctx, desc.outline)
  ctx.clip()
  const grainAmount = desc.grain.amount * env.hand.grain
  if (desc.surfaceTone) paintLandSurface(ctx, desc.outline, desc.bounds, desc.surfaceTone, grainAmount, desc.grain.seed, env)
  else paintMottleOnly(ctx, desc.bounds, grainAmount, desc.grain.seed, env)
  ctx.restore()
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

/** The nested bands of a wash: each depth's share of the band and its strength (soft fall-off, no filter). */
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

function paintSoft(ctx: Ctx2D, points: Pt[], fill: string, soft: number) {
  const offsets: [number, number][] = soft > 0
    ? [[0, 0], [-soft, 0], [soft, 0], [0, -soft / 2], [0, soft / 2], [-soft / 2, -soft / 4], [soft / 2, soft / 4]]
    : [[0, 0]]
  ctx.fillStyle = fill
  for (const [dx, dy] of offsets) {
    ctx.beginPath()
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)))
    ctx.closePath()
    ctx.fill()
  }
}

/**
 * The light of a plane (`source-over` onto the light-free living-land form): ambient mood & Koschmieder aerial
 * haze veil, snow, shade and lit crest washes, floor shadow, crest rim and scrub/gully lift.
 */
export function paintPlaneLight(ctx: Ctx2D, desc: LayerOf<'plane'>, _env: PaintEnv): void {
  const light = desc.light
  const { x, y, w, h } = desc.bounds
  ctx.save()

  // Mood + aerial haze veil over the light-free land form.
  if (light.veil?.length) {
    if (light.veil.some(([, , a]) => a > 0.002)) {
      if (light.veil.length > 1) {
        const g = ctx.createLinearGradient(x, 0, x + w, 0)
        for (const [at, rgb, a] of light.veil) g.addColorStop(Math.min(1, Math.max(0, (at - x) / (w || 1))), css(rgb, a))
        ctx.fillStyle = g
      } else ctx.fillStyle = css(light.veil[0][1], light.veil[0][2])
      ctx.fillRect(x, y, w, h)
    }
  } else {
    if (light.tones.length > 1) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0)
      for (const [at, rgb] of light.tones) g.addColorStop(Math.min(1, Math.max(0, (at - x) / (w || 1))), css(rgb))
      ctx.fillStyle = g
    } else ctx.fillStyle = css(light.tint)
    ctx.fillRect(x, y, w, h)
  }

  if (light.snow) {
    const { edge, rgb, alpha } = light.snow
    for (const [dy, a] of [[-3, 0.45], [0, 0.35], [2.5, 0.3]] as const) {
      ctx.beginPath()
      ctx.moveTo(edge[0][0], y - 20)
      ctx.lineTo(edge.at(-1)![0], y - 20)
      for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(edge[i][0], edge[i][1] + dy)
      ctx.closePath()
      ctx.fillStyle = css(rgb, alpha * a)
      ctx.fill()
    }
  }
  paintWashes(ctx, light.shade)
  paintWashes(ctx, light.lit)
  for (const face of light.faces) paintSoft(ctx, face.points, css(face.rgb, face.alpha / (face.soft ? 4 : 1)), face.soft ?? 0)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 0.7
  for (const alpha of [...new Set(light.rims.map((rim) => rim.alpha))]) {
    const rims = light.rims.filter((rim) => rim.alpha === alpha)
    ctx.beginPath()
    for (const rim of rims) rim.points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.strokeStyle = css(rims[0].rgb, alpha)
    ctx.stroke()
  }

  const lift = light.lift
  if (lift) {
    if (desc.scrub.length) {
      ctx.beginPath()
      for (const dot of desc.scrub) {
        if (dot.r < 0.7) continue
        const cx = dot.x + lift.dx * dot.r * 0.35, cy = dot.y + lift.dy * dot.r * 0.45
        ctx.rect(cx - dot.r * 0.45, cy - dot.r * 0.4, dot.r * 0.9, dot.r * 0.8)
      }
      ctx.fillStyle = css(lift.rgb, lift.alpha)
      ctx.fill()
    }
    if (desc.gullies.length) {
      ctx.beginPath()
      for (const gully of desc.gullies) {
        const lip = gully.points.slice(0, Math.max(2, Math.ceil(gully.points.length * 0.7)))
        lip.forEach(([px, py], i) => (i ? ctx.lineTo(px + lift.dx * gully.w * 0.6, py) : ctx.moveTo(px + lift.dx * gully.w * 0.6, py)))
      }
      ctx.strokeStyle = css(lift.rgb, lift.alpha * 0.3)
      ctx.lineWidth = 0.45
      ctx.stroke()
    }
  }
  // Mask once to the plane's exact antialiased outline so multi-pass snow/washes never lose coverage at the crest edge.
  ctx.globalCompositeOperation = 'destination-in'
  outline(ctx, desc.outline)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
}
