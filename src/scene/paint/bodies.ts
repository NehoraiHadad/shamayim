import type { Disc, LayerOf, MoonDisc, Star } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'

/**
 * MEDIUM: the app's sky hand: the sun as light, not a coin cut out of paper: a hot core easing into a darker, redder limb
 * with a lost edge, an aureole that falls off from the limb outward, softened and dimmed by the cloud in front (a watery
 * sun through a deck). The moon as the SVG draws it: a bone disc in its true phase, the lit limb toward the sun, a few soft
 * seas fixed on the face, a hairline round the dark disc of a thin crescent, earthshine by night. Stars: points of light,
 * the brightest with a breath of halo.
 */
export function paintBodies(ctx: Ctx2D, desc: LayerOf<'bodies'>, _env: PaintEnv): void {
  if (desc.sun && desc.part === 'aureole') { paintAureole(ctx, desc.sun); return }
  if (desc.sun) paintSun(ctx, desc.sun)
  if (desc.moon) paintMoon(ctx, desc.moon)
}

/**
 * The aureole: forward-scattered light round the limb, wide in haze, taken by the cloud in front (its own layer over the
 * clouds, C9: the air between the eye and any cloud glows too).
 */
function paintAureole(ctx: Ctx2D, d: Disc) {
  const { x, y, r } = d
  const clear = 1 - d.veil
  for (const [reach, a] of [[2.6, 0.2], [1.6, 0.42]] as const) {
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * reach)
    g.addColorStop(0, css(d.halo, a * d.aureole * clear))
    g.addColorStop(1, css(d.halo, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r * reach, y - r * reach, 2 * r * reach, 2 * r * reach)
  }
}

function paintSun(ctx: Ctx2D, d: Disc) {
  const { x, y, r } = d
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, d.flatten)
  // Through cloud the disc spreads into a soft patch: stacked wider copies, no hard limb.
  if (d.veil > 0.15) {
    for (const k of [2.2, 1.6, 1.25]) {
      ctx.fillStyle = css(d.core, 0.12 * d.veil)
      ctx.beginPath()
      ctx.arc(0, 0, r * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Behind cloud the disc goes fast: at 80 % of its light taken it is a pale patch.
  const alpha = Math.max(0.1, 1 - 0.97 * d.veil ** 0.7)
  if (d.coin > 0.5) {
    ctx.fillStyle = css(d.core, alpha)
  } else {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 0.9)
    g.addColorStop(0, css(d.core, alpha))
    g.addColorStop(0.42, css(d.core, alpha))
    g.addColorStop(r / (r + 0.9), css(d.limb, alpha))
    g.addColorStop(1, css(d.limb, 0))
    ctx.fillStyle = g
  }
  ctx.beginPath()
  ctx.arc(0, 0, r + 0.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A few soft seas on the face (the SVG's), in disc units (r = 7). */
const MARIA: [number, number, number, number][] = [[-2.3, -2.3, 1.9, 1.4], [2.4, -1.7, 1.5, 1.1], [2.8, 2, 1.3, 1.5], [-4, 1.4, 1.2, 2.1]]

function paintMoon(ctx: Ctx2D, d: MoonDisc) {
  const { r } = d
  ctx.save()
  ctx.translate(d.x, d.y)
  ctx.globalAlpha = d.alpha
  ctx.fillStyle = css(d.rgb, d.earthshine)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  if (d.ring) {
    ctx.strokeStyle = css(d.rgb, 0.18)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }
  // The lit part: the lit limb a half circle toward +x, the terminator a half ellipse as wide as the phase says, turned
  // toward the sun.
  const k = Math.min(1, Math.max(0, d.fraction))
  const rx = Math.abs(1 - 2 * k) * r
  const turn = (d.tilt * Math.PI) / 180
  ctx.rotate(turn)
  ctx.beginPath()
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false)
  ctx.ellipse(0, 0, Math.max(0.001, rx), r, 0, Math.PI / 2, -Math.PI / 2, k < 0.5)
  ctx.closePath()
  ctx.rotate(-turn)
  ctx.clip()
  ctx.fillStyle = css(d.rgb)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  const sea: [number, number, number] = [d.rgb[0] * 0.84 + 0.353 * 0.16, d.rgb[1] * 0.84 + 0.376 * 0.16, d.rgb[2] * 0.84 + 0.44 * 0.16]
  ctx.fillStyle = css(sea, 1 - 0.6 * d.daylight)
  for (const [mx, my, ax, ay] of MARIA) {
    ctx.beginPath()
    ctx.ellipse((mx * r) / 7, (my * r) / 7, (ax * r) / 7, (ay * r) / 7, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function paintStars(ctx: Ctx2D, desc: LayerOf<'stars'>, _env: PaintEnv): void {
  for (const s of desc.stars) paintStar(ctx, s)
}

function paintStar(ctx: Ctx2D, s: Star) {
  if (s.r > 0.85 && s.alpha > 0.5) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
    g.addColorStop(0, `rgb(232 238 255 / ${(0.25 * s.alpha).toFixed(3)})`)
    g.addColorStop(1, 'rgb(232 238 255 / 0)')
    ctx.fillStyle = g
    ctx.fillRect(s.x - s.r * 3, s.y - s.r * 3, s.r * 6, s.r * 6)
  }
  ctx.fillStyle = `rgb(236 240 255 / ${s.alpha.toFixed(3)})`
  ctx.beginPath()
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
  ctx.fill()
}
