import type { LayerOf, Pt } from '../model/types'
import { smoothstep } from '../../domain/smoothstep'
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
    const glow = p.glow * smoothstep(0, 0.04, p.glow)
    const R = p.r * 4.5
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
    g.addColorStop(0, css(p.rgb, 0.32 * glow))
    g.addColorStop(0.35, css(p.rgb, 0.1 * glow))
    g.addColorStop(1, css(p.rgb, 0))
    ctx.fillStyle = g
    ctx.fillRect(p.x - R, p.y - R, 2 * R, 2 * R)
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
 * The Milky Way: a soft, irregular band of faint light, never a set of stripes. Laid from many seeded soft blobs scattered
 * across it (denser and brighter at its middle, so its edges fade out gently), mottled by noise into a grain of light;
 * brighter knots where the star clouds are (Sagittarius and Scutum toward the centre, Cygnus); a dust of faint stars; then
 * the dark lanes taken out of its light (the Great Rift along it from Cygnus to Sagittarius, a few smaller dark patches
 * elsewhere). Faint throughout: it never outshines the bright stars. Segments that jump across the screen (where the band
 * passes behind the eye or near the zenith) are skipped.
 */
export function paintMilkyWay(ctx: Ctx2D, desc: LayerOf<'milkyWay'>, _env: PaintEnv): void {
  const { spine, upper, lower, bright, rift, clouds, alpha, seed } = desc
  const r = rng(seed)
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * Math.cos(TAU * r())
  const jump = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) > 120
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  /** A point at `t` along segment i (from point i − 1), `v` across (+1 the upper edge, −1 the lower). */
  const place = (i: number, t: number, v: number): Pt => {
    const s = lerp(spine[i - 1], spine[i], t), e = v >= 0 ? lerp(upper[i - 1], upper[i], t) : lerp(lower[i - 1], lower[i], t)
    const k = Math.abs(v)
    return [s[0] + (e[0] - s[0]) * k, s[1] + (e[1] - s[1]) * k]
  }
  const half = (i: number) => {
    const h = (j: number) => (Math.hypot(upper[j][0] - spine[j][0], upper[j][1] - spine[j][1]) + Math.hypot(lower[j][0] - spine[j][0], lower[j][1] - spine[j][1])) / 2
    return Math.max(2, (h(i - 1) + h(i)) / 2)
  }
  const blob = (p: Pt, R: number, rgb: readonly [number, number, number], a: number) => {
    if (R < 0.5) return
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R)
    g.addColorStop(0, css(rgb, a))
    g.addColorStop(0.45, css(rgb, a * 0.55))
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    ctx.fillRect(p[0] - R, p[1] - R, 2 * R, 2 * R)
  }
  const segs: number[] = []
  for (let i = 1; i < spine.length; i++) {
    if (bright[i - 1] <= 0 || bright[i] <= 0) continue
    if (jump(spine[i - 1], spine[i]) || jump(upper[i - 1], upper[i]) || jump(lower[i - 1], lower[i])) continue
    segs.push(i)
  }
  const mottle = (p: Pt) => Math.min(1.35, Math.max(0.1, fractal(seed, p[0], p[1], 0.03, 0.03, 3) * 2 - 0.35))
  const warm = mix(desc.rgb, [1, 0.93, 0.84], 0.5)
  const glowAlpha = (a: number) => a * smoothstep(0, 0.004, a)
  // The diffuse light: soft blobs, most near the middle.
  for (const i of segs) {
    const b = (bright[i - 1] + bright[i]) / 2, hw = half(i)
    const len = Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1])
    const n = Math.ceil((len / hw) * 6) + 2
    for (let j = 0; j < n; j++) {
      const v = Math.max(-1.1, Math.min(1.1, gauss() * 0.42))
      const p = place(i, (j + r()) / n, v)
      blob(p, hw * (0.35 + 0.45 * r()), desc.rgb, glowAlpha(0.032 * b * alpha * mottle(p) * (1 - 0.3 * Math.abs(v))))
    }
    // The star clouds: brighter, warmer knots.
    const c = (clouds[i - 1] + clouds[i]) / 2
    if (c > 0.06) {
      const m = Math.ceil((len / hw) * 8 * c) + 1
      for (let j = 0; j < m; j++) {
        const p = place(i, r(), -0.1 + (r() - 0.5) * 0.9)
        blob(p, hw * (0.18 + 0.32 * r()), warm, glowAlpha(0.05 * c * b * alpha * (0.5 + 0.5 * mottle(p))))
      }
    }
  }
  // A dust of faint stars along it, thicker at its middle.
  for (const i of segs) {
    const b = (bright[i - 1] + bright[i]) / 2, hw = half(i)
    const len = Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1])
    const dots = Math.round(len * hw * 0.11 * Math.min(1, b + 0.25))
    for (let j = 0; j < dots; j++) {
      const p = place(i, r(), Math.max(-1.2, Math.min(1.2, gauss() * 0.5)))
      const s = 0.45 + 0.5 * r() ** 2
      ctx.fillStyle = css([0.9, 0.92, 1], (0.05 + 0.2 * r() ** 2) * alpha * mottle(p))
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s)
    }
  }
  // The dark lanes: taken out of the band's light, the Great Rift a broken lane a little off its middle.
  ctx.globalCompositeOperation = 'destination-out'
  for (const i of segs) {
    const hw = half(i), d = (rift[i - 1] + rift[i]) / 2
    const len = Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1])
    const lane = d > 0.08
    const n = Math.ceil((len / hw) * (lane ? 9 : 2))
    for (let j = 0; j < n; j++) {
      const p = place(i, r(), lane ? 0.14 + gauss() * 0.13 : gauss() * 0.55)
      const a = (lane ? 0.5 * d : 0.22) * (0.4 + 0.6 * fractal(seed + 7, p[0], p[1], 0.05, 0.05, 2))
      const radius = hw * (lane ? 0.14 + 0.2 * r() : 0.1 + 0.15 * r())
      if (a >= 0.002) blob(p, radius, [0, 0, 0], a)
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}
