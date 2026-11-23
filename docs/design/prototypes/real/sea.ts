import { seeded } from '../../../../src/data/landmarks/hash'
import type { LayerOf, RGB, SeaDesc, Shine } from '../../../../src/scene/model/types'
import { css, mix, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { paintOutsideSea } from '../../../../src/scene/paint/shared/town/outsideGround'
import { paintWater as paintToday } from '../../../../src/scene/paint/shared/land/water'

/*
 * Water in natural light over the model's own wash: wave rows that lengthen and part toward the eye, a pale far edge
 * lying into the haze, a shore that is wet and broken instead of a drawn line. Pure: the desc and a seed.
 */

/** Rows of waves: the far ones' spacing and the near ones', px. */
const ROWS = [0.55, 3.2] as const

/** Wave strokes over a band from `top` to `bottom`, between x0 and x1, on what is already drawn there. */
function waves(ctx: Ctx2D, x0: number, x1: number, top: number, bottom: number, light: RGB, dark: RGB, alpha: number, seed: number) {
  const r = seeded(seed), span = Math.max(1, bottom - top)
  for (let y = top + 0.4; y < bottom;) {
    const t = Math.min(1, (y - top) / Math.max(28, span)), step = ROWS[0] + (ROWS[1] - ROWS[0]) * t
    const long = 3 + 22 * t, thick = 0.28 + 0.6 * t
    for (let x = x0 - long * r(); x < x1; x += long * (0.7 + 1.5 * r())) {
      const w = long * (0.3 + 0.8 * r()), bright = r()
      ctx.fillStyle = bright > 0.5 ? css(light, alpha * (bright - 0.35)) : css(dark, alpha * 1.1 * (0.6 - bright))
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + (r() - 0.5) * step, w / 2, thick / 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    y += step
  }
}

/** The far edge, lying into the air over it. */
function farHaze(ctx: Ctx2D, x0: number, x1: number, top: number, deep: number, rgb: RGB, alpha: number) {
  const g = ctx.createLinearGradient(0, top, 0, top + deep)
  g.addColorStop(0, css(rgb, alpha))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.fillRect(x0, top, x1 - x0, deep)
}

export function paintSea(ctx: Ctx2D, s: SeaDesc, shine: Shine, t: number): void {
  // The model's wash, light path and horizon; its own ripples and drawn shore are what is replaced here.
  paintOutsideSea(ctx, { ...s, ripples: [], coast: [] }, shine, t)
  const xs = s.points.map(([x]) => x), x0 = Math.min(...xs), x1 = Math.max(...xs)
  ctx.save()
  outline(ctx, s.points)
  ctx.clip()
  waves(ctx, x0, x1, s.top, s.bottom, s.light, s.dark, 0.5 * (1 - 0.35 * shine.night), 71)
  farHaze(ctx, x0, x1, s.top, 7, s.horizon.rgb, 0.4 * (1 - 0.5 * shine.night))
  shore(ctx, s, mix(s.stops[s.stops.length - 1][1], s.shore, 0.35), 0.22, [9, 5.5, 3], -0.2)
  ctx.restore()
  shore(ctx, s, s.shore, 0.14 * (1 - 0.5 * shine.night), [2.2, 1.1], 0)
  foam(ctx, s, 0.65 * (1 - 0.6 * shine.night))
}

/** The shallows or the wet edge: the shore stroked wide and faint to narrow. */
function shore(ctx: Ctx2D, s: SeaDesc, rgb: RGB, alpha: number, widths: readonly number[], dy: number) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = css(rgb, alpha)
  for (const width of widths) {
    ctx.lineWidth = width
    ctx.beginPath()
    s.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)))
    ctx.stroke()
  }
}

/** Broken lines of foam along the shore, thicker toward the eye. */
function foam(ctx: Ctx2D, s: SeaDesc, alpha: number) {
  const r = seeded(19)
  for (let i = 1; i < s.coast.length; i++) {
    const [ax, ay] = s.coast[i - 1], [bx, by] = s.coast[i], long = Math.hypot(bx - ax, by - ay)
    for (let d = 0; d < long; d += 1.6 + 3 * r()) {
      const t = d / long, y = ay + (by - ay) * t, near = Math.min(1, Math.max(0, (y - s.top) / Math.max(1, s.bottom - s.top)))
      ctx.fillStyle = css(s.shore, alpha * r())
      ctx.beginPath()
      ctx.ellipse(ax + (bx - ax) * t + (r() - 0.5) * 2.4 * near, y + (r() - 0.5) * 0.6, (0.5 + 1.8 * near) * (0.5 + r()), 0.2 + 0.28 * near, Math.atan2(by - ay, bx - ax), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function paintWater(ctx: Ctx2D, desc: LayerOf<'water'>, env: PaintEnv): void {
  paintToday(ctx, { ...desc, ruffle: { ...desc.ruffle, lit: [], shade: [] } }, env)
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  for (const [n, band] of desc.bands.entries()) {
    const xs = band.points.map(([x]) => x), x0 = Math.min(...xs), x1 = Math.max(...xs)
    ctx.save()
    outline(ctx, band.points)
    ctx.clip()
    waves(ctx, x0, x1, band.top, band.bottom, desc.ruffle.light, desc.ruffle.dark, 0.4, 83 + n)
    farHaze(ctx, x0, x1, band.top, Math.min(10, (band.bottom - band.top) / 2), band.stops[0][1], 0.5)
    ctx.restore()
  }
  ctx.restore()
}
