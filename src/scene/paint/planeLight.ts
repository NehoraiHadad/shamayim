import type { LayerOf, Pt, Wash } from '../model/types'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'

/*
 * Plane light painter (`source-over` onto the light-free living-land form, Stage C2 + Stage 3):
 * Ambient mood, wet-ground darkening & Koschmieder aerial haze veil, snow, shade and lit crest washes,
 * floor shadow, crest rim and scrub/gully lift, masked once with `destination-in` against the plane's
 * antialiased outline. Worker-safe on OffscreenCanvas; no clock; no `ctx.filter`.
 */

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

/** Paints the light pass of one terrain plane (`source-over` onto the plane form). */
export function paintPlaneLight(ctx: Ctx2D, desc: LayerOf<'plane'>, _env: PaintEnv): void {
  const light = desc.light
  const { x, y, w, h } = desc.bounds
  ctx.save()

  // Mood + wet-ground attenuation + aerial haze veil over the light-free land form.
  if (light.veil.length && light.veil.some(([, , a]) => a > 0.002)) {
    if (light.veil.length > 1) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0)
      for (const [at, rgb, a] of light.veil) g.addColorStop(Math.min(1, Math.max(0, (at - x) / (w || 1))), css(rgb, a))
      ctx.fillStyle = g
    } else ctx.fillStyle = css(light.veil[0][1], light.veil[0][2])
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
