import type { LayerOf, Pt } from '../model/types'
import { fractal, rng } from './core'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * The night sky's true objects in the hand (C10): the planets as steady points (no twinkle: a planet is a disc, not a
 * point, and the air's turbulence averages out over it), the brightest stars twinkling, and the Milky Way as a soft,
 * mottled band of faint light with its dark rift, never a cartoon.
 */

const TAU = Math.PI * 2

export function paintPlanets(ctx: Ctx2D, desc: LayerOf<'planets'>, _env: PaintEnv): void {
  for (const p of desc.planets) {
    if (p.glow > 0.02) {
      const R = p.r * 4.5
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
      g.addColorStop(0, css(p.rgb, 0.32 * p.glow))
      g.addColorStop(0.35, css(p.rgb, 0.1 * p.glow))
      g.addColorStop(1, css(p.rgb, 0))
      ctx.fillStyle = g
      ctx.fillRect(p.x - R, p.y - R, 2 * R, 2 * R)
    }
    ctx.fillStyle = css(p.rgb, p.alpha)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, TAU)
    ctx.fill()
    // A white core: the brightest are a hard point of light.
    ctx.fillStyle = css(mix(p.rgb, [1, 1, 1], 0.6), p.alpha)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * 0.55, 0, TAU)
    ctx.fill()
  }
}

/**
 * A twinkling star at `env.phase`: its light flickers by a seeded sum of quick waves (whole numbers of them over the strip,
 * so the strip loops), now and then a little bluer or redder (low stars flash colours).
 */
export function paintTwinkle(ctx: Ctx2D, desc: LayerOf<'twinkle'>, env: PaintEnv): void {
  const r = rng(desc.seed)
  const t = env.phase / desc.loop
  let n = 0
  for (let k = 0; k < 4; k++) n += Math.sin(TAU * ((3 + Math.floor(r() * 9)) * t + r())) * (0.5 / (k + 1))
  const shift = Math.sin(TAU * ((2 + Math.floor(r() * 5)) * t + r()))
  const a = desc.star.alpha * Math.max(0.15, 1 - desc.amp * (0.5 + 0.5 * n))
  const rgb = mix([0.92, 0.94, 1], shift > 0 ? [0.75, 0.85, 1] : [1, 0.88, 0.78], Math.abs(shift) * desc.amp * 0.5)
  const { x, y, r: radius } = desc.star
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
  g.addColorStop(0, css(rgb, 0.3 * a))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6)
  ctx.fillStyle = css(rgb, a)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.fill()
}

/**
 * The Milky Way: quads between its edges, each a soft wash of its brightness, mottled by seeded noise into star clouds, the
 * rift darkening its middle; then a scatter of very faint stars along it. Segments that jump across the screen (where the
 * band passes behind the eye) are skipped.
 */
export function paintMilkyWay(ctx: Ctx2D, desc: LayerOf<'milkyWay'>, _env: PaintEnv): void {
  const { spine, upper, lower, bright, rift, alpha } = desc
  const r = rng(desc.seed)
  const jump = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) > 120
  for (let i = 1; i < spine.length; i++) {
    if (bright[i - 1] <= 0 || bright[i] <= 0) continue
    if (jump(spine[i - 1], spine[i]) || jump(upper[i - 1], upper[i]) || jump(lower[i - 1], lower[i])) continue
    const b = (bright[i - 1] + bright[i]) / 2
    // Soft edges: the band laid eight times, narrower toward its middle, so its light falls off smoothly to the sides.
    for (let pass = 1; pass <= 8; pass++) {
      const k = 1.15 - pass * 0.12
      const lerp = (s: Pt, e: Pt): Pt => [s[0] + (e[0] - s[0]) * k, s[1] + (e[1] - s[1]) * k]
      const u0 = lerp(spine[i - 1], upper[i - 1]), u1 = lerp(spine[i], upper[i]), l1 = lerp(spine[i], lower[i]), l0 = lerp(spine[i - 1], lower[i - 1])
      ctx.fillStyle = css(desc.rgb, 0.02 * b * alpha)
      ctx.beginPath()
      ctx.moveTo(u0[0], u0[1]); ctx.lineTo(u1[0], u1[1]); ctx.lineTo(l1[0], l1[1]); ctx.lineTo(l0[0], l0[1])
      ctx.closePath()
      ctx.fill()
    }
    // Star clouds: soft knots along the band.
    const knots = 2
    for (let j = 0; j < knots; j++) {
      const t = r(), side = (r() - 0.5) * 0.9
      const sx = spine[i - 1][0] + (spine[i][0] - spine[i - 1][0]) * t, sy = spine[i - 1][1] + (spine[i][1] - spine[i - 1][1]) * t
      const ux = upper[i - 1][0] + (upper[i][0] - upper[i - 1][0]) * t, uy = upper[i - 1][1] + (upper[i][1] - upper[i - 1][1]) * t
      const x = sx + (ux - sx) * side, y = sy + (uy - sy) * side
      const R = 9 + 12 * r()
      const m = fractal(desc.seed, x, y, 0.05, 0.05, 2)
      const g = ctx.createRadialGradient(x, y, 0, x, y, R)
      g.addColorStop(0, css(desc.rgb, 0.04 * b * alpha * m))
      g.addColorStop(1, css(desc.rgb, 0))
      ctx.fillStyle = g
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R)
    }
    // The rift: a dark lane down the middle where the dust lies.
    const d = (rift[i - 1] + rift[i]) / 2
    if (d > 0.05) {
      ctx.strokeStyle = css([0.05, 0.06, 0.12], 0.12 * d * alpha)
      ctx.lineWidth = 0.3 * Math.hypot(upper[i][0] - spine[i][0], upper[i][1] - spine[i][1])
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(spine[i - 1][0], spine[i - 1][1] - 1)
      ctx.lineTo(spine[i][0], spine[i][1] - 1)
      ctx.stroke()
    }
    // The band's faint stars.
    const dots = Math.round(6 * b)
    for (let j = 0; j < dots; j++) {
      const t = r(), side = (r() - 0.5) * 2 * (r() ** 0.7)
      const sx = spine[i - 1][0] + (spine[i][0] - spine[i - 1][0]) * t, sy = spine[i - 1][1] + (spine[i][1] - spine[i - 1][1]) * t
      const ux = upper[i - 1][0] + (upper[i][0] - upper[i - 1][0]) * t, uy = upper[i - 1][1] + (upper[i][1] - upper[i - 1][1]) * t
      ctx.fillStyle = css([0.9, 0.92, 1], (0.12 + 0.25 * r()) * alpha)
      ctx.fillRect(sx + (ux - sx) * side, sy + (uy - sy) * side, 0.6, 0.6)
    }
  }
}
