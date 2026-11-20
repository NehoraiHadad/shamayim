import type { RGB } from '../../world/types'
import type { LayerOf } from '../model/types'
import { css, mix, outline, type Ctx2D, type PaintEnv } from './hand'

/*
 * The rainbow and the halo in the hand (C10): each a true circle round its centre, laid as radial washes (its colour bands
 * from one radius to the next, soft edges), clipped to the sky over the land.
 * - Halo: the sky a shade darker inside the ring (no light is refracted under 22°), a sharp inner rim, faintly red, then
 *   warm white fading outward over several degrees. Sun dogs: a small soft patch level with the sun, red on its sun side,
 *   fading out to a whitish tail.
 * - Rainbow: the primary red outside to violet inside, the sky inside it a little brighter, Alexander's band between the
 *   bows a little darker, the secondary fainter with its colours reversed; its strength round the circle (where the rain
 *   is, its foot) laid as a conic mask over the washes.
 */

/** One stop of a radial wash: its radius (deg from the centre), colour and alpha. */
export type Stop = [radiusDeg: number, rgb: RGB, alpha: number]

export const RED: RGB = [0.95, 0.27, 0.2]
const ORANGE: RGB = [1, 0.58, 0.18], YELLOW: RGB = [1, 0.9, 0.3], GREEN: RGB = [0.36, 0.82, 0.38], BLUE: RGB = [0.32, 0.5, 0.96]
export const VIOLET: RGB = [0.55, 0.36, 0.86]
const WHITE: RGB = [1, 1, 1]
/** The darker sky's tone (inside the halo, Alexander's band): a shade of the sky, laid thinly. */
export const SHADE: RGB = [0.16, 0.19, 0.27]

/** The halo's washes at strength `s`: the darker sky inside, then the ring (a sharp reddish inner rim fading out white). */
export function haloStops(s: number): { inside: Stop[]; ring: Stop[] } {
  return {
    inside: [[7, SHADE, 0], [15, SHADE, 0.045 * s], [21.5, SHADE, 0.075 * s], [21.9, SHADE, 0]],
    ring: [[21.6, [1, 0.45, 0.32], 0], [22, [1, 0.5, 0.36], 0.34 * s], [22.5, [1, 0.8, 0.62], 0.32 * s], [23.4, [0.98, 0.95, 0.9], 0.24 * s],
      [25.5, [0.95, 0.96, 1], 0.13 * s], [29, [0.95, 0.96, 1], 0.05 * s], [32, [0.95, 0.96, 1], 0]],
  }
}

/**
 * The rainbow's washes at strength `s` (the secondary at `s2`): the brighter sky inside the primary; the primary, violet at
 * 40.6° to red at 42.3°; Alexander's darker band; the secondary, red at 50.1° to violet at 53.6°.
 */
export function rainbowStops(s: number, s2: number): { inside: Stop[]; primary: Stop[]; band: Stop[]; secondary: Stop[] } {
  const a = 0.6 * s, b = 0.55 * s2
  return {
    inside: [[10, WHITE, 0], [30, WHITE, 0.035 * s], [39.6, WHITE, 0.08 * s], [40.4, WHITE, 0]],
    primary: [[40.1, VIOLET, 0], [40.6, VIOLET, a * 0.7], [40.95, BLUE, a * 0.85], [41.3, GREEN, a], [41.6, YELLOW, a], [41.95, ORANGE, a],
      [42.3, RED, a * 0.85], [42.9, RED, 0]],
    band: [[42.4, SHADE, 0], [43.4, SHADE, 0.07 * s], [49, SHADE, 0.07 * s], [50, SHADE, 0]],
    secondary: s2 > 0.03 ? [[49.5, RED, 0], [50.1, RED, b * 0.85], [50.8, ORANGE, b], [51.5, YELLOW, b], [52.2, GREEN, b], [52.9, BLUE, b * 0.85],
      [53.6, VIOLET, b * 0.6], [54.3, VIOLET, 0]] : [],
  }
}

/** A radial wash between the stops' radii (deg, ascending) round (cx, cy) at k px a degree. */
function ringWash(ctx: Ctx2D, cx: number, cy: number, k: number, stops: readonly Stop[]) {
  if (stops.length < 2) return
  const r0 = Math.max(0, stops[0][0] * k), r1 = stops.at(-1)![0] * k
  if (r1 <= r0) return
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1)
  for (const [r, rgb, a] of stops) g.addColorStop(Math.min(1, Math.max(0, (r * k - r0) / (r1 - r0))), css(rgb, Math.max(0, Math.min(1, a))))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r1, 0, Math.PI * 2)
  ctx.arc(cx, cy, r0, 0, Math.PI * 2, true)
  ctx.fill()
}

function paintHalo(ctx: Ctx2D, desc: LayerOf<'bow'>) {
  const { cx, cy, k } = desc
  const stops = haloStops(desc.strength)
  ringWash(ctx, cx, cy, k, stops.inside)
  ringWash(ctx, cx, cy, k, stops.ring)
  for (const d of desc.dogs) {
    // A soft patch, taller than wide, red toward the sun, then amber and a whitish tail going out.
    const steps = 7
    for (let i = steps - 1; i >= 0; i--) {
      const t = i / (steps - 1)
      const x = d.x + d.side * (t * 2 - 0.15) * d.r, r = d.r * (0.6 - 0.2 * t)
      const rgb = t < 0.25 ? mix([1, 0.45, 0.3], [1, 0.88, 0.68], t / 0.25) : mix([1, 0.88, 0.68], [0.94, 0.96, 1], (t - 0.25) / 0.75)
      const a = d.alpha * (i === 0 ? 0.55 : 0.6 * (1 - t) ** 0.8)
      ctx.save()
      ctx.translate(x, d.y)
      ctx.scale(1, 1.45)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
      g.addColorStop(0, css(rgb, a))
      g.addColorStop(0.5, css(rgb, a * 0.45))
      g.addColorStop(1, css(rgb, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

function paintRainbow(ctx: Ctx2D, desc: LayerOf<'bow'>) {
  const { cx, cy, k } = desc
  const stops = rainbowStops(desc.strength, desc.secondary)
  for (const part of [stops.inside, stops.primary, stops.band, stops.secondary]) ringWash(ctx, cx, cy, k, part)
  // Its strength round the circle: where the rain is, fading into its foot.
  if (desc.mask.length) {
    const g = ctx.createConicGradient(0, cx, cy)
    desc.mask.forEach((m, i) => g.addColorStop(i / desc.mask.length, css(WHITE, m)))
    g.addColorStop(1, css(WHITE, desc.mask[0]))
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = g
    ctx.fillRect(desc.bounds.x, desc.bounds.y, desc.bounds.w, desc.bounds.h)
    ctx.globalCompositeOperation = 'source-over'
  }
}

export function paintBow(ctx: Ctx2D, desc: LayerOf<'bow'>, _env: PaintEnv): void {
  ctx.save()
  // The sky over the land only: what falls under the horizon or behind the land is not seen.
  outline(ctx, desc.clip)
  ctx.clip()
  if (desc.look === 'halo') paintHalo(ctx, desc)
  else paintRainbow(ctx, desc)
  ctx.restore()
}
