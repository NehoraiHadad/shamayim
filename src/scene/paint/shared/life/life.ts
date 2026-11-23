import type { LayerOf, Pt } from '../../../model/types'
import { smoothstep } from '../../../../domain/smoothstep'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'

/*
 * The sky's life in the hand (C10; the birds are `birds.ts`): aircraft (a small
 * plane, its lights by night, a short trail), and meteors (a fine streak, brightest at its
 * head). A painter is a pure function of its desc and `env.phase` (a strip's frame): every motion is periodic over the
 * strip, seeded, with no clock.
 */

/** A polyline in one colour and width. */
export function stroke(ctx: Ctx2D, pts: readonly Pt[], width: number, colour: string) {
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

/** A small plane: its body along `angle`, swept wings, the tail; by night its landing light, strobes and beacon. */
export function paintAircraft(ctx: Ctx2D, desc: LayerOf<'aircraft'>, env: PaintEnv): void {
  const { x, y, size: S } = desc
  const c = Math.cos(desc.angle), s = Math.sin(desc.angle)
  const f = (u: number, v: number): Pt => [x + u * c - v * s, y + u * s + v * c]
  ctx.lineCap = 'round'
  if (desc.trail > 0.5) {
    // A short contrail behind it, thinning and fading as it goes.
    const steps = 8
    for (let i = 0; i < steps; i++) {
      const a = (1 - i / steps) * 0.75
      stroke(ctx, [f(-0.4 * S - (desc.trail * i) / steps, 0), f(-0.4 * S - (desc.trail * (i + 1)) / steps, 0)], Math.max(0.6, 0.35 * S * (1 + i / steps)),
        css(desc.trailRgb, a))
    }
  }
  const night = desc.lights
  const body = css(desc.rgb, (1 - night * 0.8) * smoothstep(1, 0.9, night))
  stroke(ctx, [f(0.5 * S, 0), f(-0.5 * S, 0)], Math.max(0.7, 0.13 * S), body)
  stroke(ctx, [f(0.08 * S, 0), f(-0.12 * S, -0.48 * S)], Math.max(0.6, 0.09 * S), body)
  stroke(ctx, [f(0.08 * S, 0), f(-0.12 * S, 0.48 * S)], Math.max(0.6, 0.09 * S), body)
  stroke(ctx, [f(-0.42 * S, 0), f(-0.52 * S, -0.18 * S)], Math.max(0.5, 0.07 * S), body)
  stroke(ctx, [f(-0.42 * S, 0), f(-0.52 * S, 0.18 * S)], Math.max(0.5, 0.07 * S), body)
  // The sun on its upper side.
  stroke(ctx, [f(0.42 * S, -0.03 * S), f(-0.3 * S, -0.03 * S)], Math.max(0.4, 0.05 * S), css(desc.lit, 0.7 * (1 - night)))
  // One strip second: the strobes flash white twice, the red beacon once, the landing light steady.
  const frame = Math.round(env.phase * 10) % 10
  const light = (p: Pt, r: number, rgb: readonly [number, number, number], a: number) => {
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3)
    g.addColorStop(0, css(rgb, a))
    g.addColorStop(0.3, css(rgb, a * 0.4))
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    ctx.fillRect(p[0] - r * 3, p[1] - r * 3, r * 6, r * 6)
  }
  if (desc.landing) light(f(0.5 * S, 0), 1.4, [1, 0.97, 0.88], 0.95 * night)
  light(f(-0.1 * S, -0.5 * S), 0.6, [1, 0.25, 0.2], 0.8 * night)
  light(f(-0.1 * S, 0.5 * S), 0.6, [0.3, 1, 0.45], 0.8 * night)
  if (frame === 0 || frame === 2) for (const v of [-0.5, 0.5]) light(f(-0.1 * S, v * S), 0.9, [1, 1, 1], night)
  if (frame === 5) light(f(0, 0), 0.8, [1, 0.2, 0.15], night)
}

/** A meteor: a fine streak, faint at its start, brightest near its head, with a short glow there. */
export function paintMeteor(ctx: Ctx2D, desc: LayerOf<'meteor'>, _env: PaintEnv): void {
  const g = ctx.createLinearGradient(desc.x0, desc.y0, desc.x1, desc.y1)
  g.addColorStop(0, css(desc.rgb, 0))
  g.addColorStop(0.75, css(desc.rgb, 0.7))
  g.addColorStop(1, css(desc.rgb, 1))
  ctx.strokeStyle = g
  ctx.lineCap = 'round'
  ctx.lineWidth = desc.width
  ctx.beginPath()
  ctx.moveTo(desc.x0, desc.y0)
  ctx.lineTo(desc.x1, desc.y1)
  ctx.stroke()
  const h = ctx.createRadialGradient(desc.x1, desc.y1, 0, desc.x1, desc.y1, 2.6 * desc.width)
  h.addColorStop(0, css([1, 1, 1], 0.9))
  h.addColorStop(1, css(desc.rgb, 0))
  ctx.fillStyle = h
  ctx.fillRect(desc.x1 - 3 * desc.width, desc.y1 - 3 * desc.width, 6 * desc.width, 6 * desc.width)
}
