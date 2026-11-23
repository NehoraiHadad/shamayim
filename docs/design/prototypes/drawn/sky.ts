import type { Band, Glow, LayerOf, RGB } from '../../../../src/scene/model/types'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { fractal } from '../../../../src/scene/paint/shared/base/core'
import { pigment } from './palette'

/*
 * The sky as flat bands of paint: the model's gradient and haze cut into steps of even colour, each laid over the one above
 * with a long hand-cut edge; the glow round the sun or the moon as rings of the same paint.
 */

/** The bands' least and most number, and the step of colour (sRGB distance) that makes a new one. */
const FEWEST = 5, MOST = 11, STEP = 0.045
/** A band edge's wave: its height against the band's, at most (px), and its frequency across (1/px). */
const WAVE = 0.6, WAVE_MAX = 11, FREQ = 0.0062
const RINGS = 4, SAMPLES = 160

interface Row { y: number; rgb: RGB }

export function paintDrawnSky(ctx: Ctx2D, desc: LayerOf<'sky'>, _env: PaintEnv): void {
  const { x, y, w, h } = desc.bounds, foot = desc.band ? desc.band.y + 8 : y + h
  const rows = Array.from({ length: SAMPLES + 1 }, (_, i): Row => {
    const at = y + (i / SAMPLES) * (foot - y)
    return { y: at, rgb: hazed(desc, at, (at - y) / h) }
  })
  bandsOf(rows).forEach((band, i) => {
    ctx.fillStyle = css(pigment(band.rgb))
    if (!i) { ctx.fillRect(x, y, w, h); return }
    const amp = Math.min(WAVE_MAX, WAVE * (band.to - band.from))
    ctx.beginPath()
    ctx.moveTo(x - 2, y + h)
    for (let px = x - 2; px <= x + w + 6; px += 6) {
      ctx.lineTo(px, band.from + (fractal(311 + i * 7, px, band.from, FREQ, 0.02, 2) - 0.5) * 2 * amp)
    }
    ctx.lineTo(x + w + 6, y + h)
    ctx.fill()
  })
  for (const glow of desc.glow) rings(ctx, glow)
}

/** The gradient's colour at a row, the haze band over it. */
function hazed({ stops, band }: LayerOf<'sky'>, y: number, t: number): RGB {
  let at = 1
  while (at < stops.length - 1 && stops[at][0] < t) at++
  const [t0, a] = stops[at - 1], [t1, b] = stops[at]
  const rgb = mix(a, b, Math.min(1, Math.max(0, (t - t0) / Math.max(1e-6, t1 - t0))))
  return band ? mix(rgb, band.rgb, band.alpha * share(band, y)) : rgb
}

/** The haze band's strength down its depth (the stops of `skyBackground`). */
function share(band: Band, y: number): number {
  const t = (y - band.y + band.h) / band.h
  return t <= 0 ? 0 : t < 0.585 ? (0.35 * t) / 0.585 : t <= 1 ? 0.35 + (0.65 * (t - 0.585)) / 0.415 : 1
}

/** The rows cut into bands of one colour step each. */
function bandsOf(rows: readonly Row[]) {
  const along = [0]
  for (let i = 1; i < rows.length; i++) along.push(along[i - 1] + Math.hypot(...rows[i].rgb.map((c, k) => c - rows[i - 1].rgb[k])))
  const whole = along[along.length - 1]
  const count = Math.max(FEWEST, Math.min(MOST, Math.round(whole / STEP)))
  const rowAt = (part: number) => rows[Math.max(0, along.findIndex((v) => v >= whole * part - 1e-9))]
  return Array.from({ length: count }, (_, n) => ({ from: rowAt(n / count).y, to: rowAt((n + 1) / count).y, rgb: rowAt((n + 0.5) / count).rgb }))
}

/** A glow as rings of paint: the radial fade's strength, held over each step. */
function rings(ctx: Ctx2D, g: Glow) {
  ctx.fillStyle = css(pigment(g.rgb), g.alpha / RINGS)
  for (let n = RINGS; n >= 1; n--) {
    const k = n / (RINGS + 0.5)
    ctx.beginPath()
    ctx.ellipse(g.x, g.y, g.r * k, (g.ry ?? g.r) * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}
