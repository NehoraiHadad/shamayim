import type { Arch, Band, Glow, LayerDesc, LayerOf } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'

/**
 * MEDIUM: the app's own sky, a smooth wash with no marks: the gradient from zenith to horizon, a three-layer glow round
 * the sun (broad warm sky, a nearer brightening, the aureole), the twilight glow where the sun crosses the land, Earth's
 * shadow with the pink belt above it opposite the sun, a cool glow round the moon, and the haze band at the horizon,
 * rising from nothing to its strength at eye level and thinning just below it.
 *
 * Two ways to lay the same wash: `paintSky` on a canvas (the gradient and band row by row, `paintRows`, then the arch and
 * the glows), and `skyBackground` as CSS backgrounds (the app and the harness lay the base as the sky canvas's own
 * background: the browser composites a CSS gradient off the main thread, where a canvas pays per pixel each time the
 * light changes; see the plan's §6, C6).
 */
export function paintSky(ctx: Ctx2D, desc: LayerOf<'sky'>, env: PaintEnv): void {
  paintRows(ctx, desc, env)
  if (desc.arch) paintArch(ctx, desc.arch, desc.bounds)
  for (const glow of desc.glow) paintGlow(ctx, glow, desc.bounds)
}

/*
 * The sky: its gradient over its bounds, and the haze band at the horizon (rising from nothing to its strength at eye
 * level and thinning just below it, behind the far land). The glows and Earth's shadow are laid over after (C6).
 *
 * Written row by row into the canvas's pixels, not filled with a canvas gradient: both are a function of the row alone,
 * and a gradient filled over the whole surface costs ~15–20 ms in software raster (CPU ×4, dpr 2.75, 1032 × 1177 device
 * px: a shader per pixel), where one colour per row, laid with a native fill of 32-bit words, costs 4–6 ms. The colours
 * are the canvas gradient's own: stops interpolated in sRGB at each row's centre, the band laid over with `source-over`,
 * its top and bottom rows by their coverage (as a filled rect's antialiased edge).
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** RGBA bytes as one 32-bit word in the platform's byte order. */
const LITTLE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1
const wordOf = (r: number, g: number, b: number) => (LITTLE ? (255 << 24 | b << 16 | g << 8 | r) : (r << 24 | g << 16 | b << 8 | 255)) >>> 0

/**
 * A gradient's channel at t, as the canvas interpolates it (sRGB, unpremultiplied; clamped at the end stops): `at` the
 * stops' offsets (sorted), `value` their channel.
 */
function channelAt(at: readonly number[], value: readonly number[], t: number): number {
  if (t <= at[0]) return value[0]
  for (let i = 1; i < at.length; i++) {
    if (t <= at[i]) return at[i] > at[i - 1] ? value[i - 1] + (value[i] - value[i - 1]) * (t - at[i - 1]) / (at[i] - at[i - 1]) : value[i]
  }
  return value[value.length - 1]
}

/** The haze band's gradient (its alpha; its colour is one): 0 → 0.35 → full at eye level → 0.4. */
const BAND_AT = [0, 0.45, 1 / 1.3, 1]
const BAND_ALPHA = [0, 0.35, 1, 0.4]

/**
 * The pixels the rows are written into, kept for the next paint of the same size: every pixel of it is written each
 * time, so nothing of the last paint shows; a fresh 4.8 MB buffer per paint cost ~12 ms (CPU ×4) in page faults and GC.
 */
let scratch: ImageData | null = null
function imageOf(ctx: Ctx2D, width: number, height: number): ImageData {
  if (!scratch || scratch.width !== width || scratch.height !== height) scratch = ctx.createImageData(width, height)
  return scratch
}

function paintRows(ctx: Ctx2D, desc: LayerOf<'sky'>, env: PaintEnv): void {
  const { x, y, w, h } = desc.bounds
  const k = env.scale
  // Device px of the layer's bounds on this canvas (the cache sets a transform of scale k and a whole-pixel offset).
  const m = ctx.getTransform()
  const cw = ctx.canvas.width, ch = ctx.canvas.height
  const dx0 = Math.max(0, Math.round(x * k + m.e)), dx1 = Math.min(cw, Math.round((x + w) * k + m.e))
  const dy0 = Math.max(0, Math.round(y * k + m.f)), dy1 = Math.min(ch, Math.round((y + h) * k + m.f))
  if (dx1 <= dx0 || dy1 <= dy0) return
  const image = imageOf(ctx, dx1 - dx0, dy1 - dy0)
  const words = new Uint32Array(image.data.buffer)
  const at = desc.stops.map(([t]) => clamp01(t))
  const channels = [0, 1, 2].map((j) => desc.stops.map(([, rgb]) => rgb[j]))
  const band = desc.band
  const top = band ? Math.max(y, band.y - band.h) : 0, bottom = band ? Math.min(y + h, band.y + band.h * 0.3) : 0
  const bandAlpha = band ? BAND_ALPHA.map((a) => a * band.alpha) : []
  const over = band ? band.rgb.map((c) => Math.round(clamp01(c) * 255)) : []
  const width = dx1 - dx0
  for (let row = dy0; row < dy1; row++) {
    // Each row's colour at its centre, as the gradient samples it.
    const sy = (row + 0.5 - m.f) / k
    const t = (sy - y) / (h || 1)
    let r = Math.round(clamp01(channelAt(at, channels[0], t)) * 255)
    let g = Math.round(clamp01(channelAt(at, channels[1], t)) * 255)
    let b = Math.round(clamp01(channelAt(at, channels[2], t)) * 255)
    if (band && bottom > top) {
      // The band's rect covers this row by this share (its top and bottom rows partly, as an antialiased edge).
      const cover = clamp01(Math.min(row + 1, bottom * k + m.f) - Math.max(row, top * k + m.f))
      if (cover > 0) {
        const alpha = clamp01(channelAt(BAND_AT, bandAlpha, (sy - (band.y - band.h)) / (band.h * 1.3))) * cover
        r = Math.round(over[0] * alpha + r * (1 - alpha))
        g = Math.round(over[1] * alpha + g * (1 - alpha))
        b = Math.round(over[2] * alpha + b * (1 - alpha))
      }
    }
    const start = (row - dy0) * width
    words.fill(wordOf(r, g, b), start, start + width)
  }
  ctx.putImageData(image, dx0, dy0)
}

function paintGlow(ctx: Ctx2D, g: Glow, bounds: LayerOf<'sky'>['bounds']) {
  const ry = g.ry ?? g.r
  ctx.save()
  ctx.translate(g.x, g.y)
  ctx.scale(1, ry / g.r)
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r)
  fill.addColorStop(0, css(g.rgb, g.alpha))
  fill.addColorStop(1, css(g.rgb, 0))
  ctx.fillStyle = fill
  ctx.fillRect(Math.max(-g.r, bounds.x - g.x), -g.r, Math.min(2 * g.r, bounds.w), 2 * g.r)
  ctx.restore()
}

/** Earth's shadow and the belt, as stops on an ellipse round the antisolar point on the horizon. */
function archStops(a: Arch): [number, string][] {
  const f = (px: number) => Math.min(1, px / a.belt)
  return [[0, css(a.shadowRgb, 0.42 * a.alpha)], [f(a.shadow * 0.8), css(a.shadowRgb, 0.36 * a.alpha)],
    [f(a.shadow * 1.25), css(a.beltRgb, 0.3 * a.alpha)], [f(a.shadow + 0.45 * (a.belt - a.shadow)), css(a.beltRgb, 0.22 * a.alpha)],
    [1, css(a.beltRgb, 0)]]
}

function paintArch(ctx: Ctx2D, a: Arch, bounds: LayerOf<'sky'>['bounds']) {
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.scale(1, a.belt / a.rx)
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, a.rx)
  for (const [at, colour] of archStops(a)) fill.addColorStop(at, colour)
  ctx.fillStyle = fill
  ctx.fillRect(bounds.x - a.x, -a.rx, bounds.w, a.rx)
  ctx.restore()
}

/** The band's stops (px from its top `band.y − band.h` to its bottom `band.y + 0.3 band.h`). */
function bandStops(band: Band): [number, string][] {
  return [[0, css(band.rgb, 0)], [0.45, css(band.rgb, band.alpha * 0.35)], [1 / 1.3, css(band.rgb, band.alpha)], [1, css(band.rgb, band.alpha * 0.4)]]
}

const px = (v: number) => `${Math.round(v * 100) / 100}px`

/**
 * The same base as CSS backgrounds over the layer's box (first listed is on top): the band, the glows, the arch, the
 * gradient. Pure: a string from the desc.
 */
export function skyBackground(desc: LayerOf<'sky'>): string {
  const { h } = desc.bounds
  const out: string[] = []
  const band = desc.band
  if (band) {
    const top = band.y - band.h, span = band.h * 1.3, bottom = top + span
    const stops = bandStops(band).map(([at, colour]) => `${colour} ${px(top + at * span)}`)
    out.push(`linear-gradient(180deg, ${css(band.rgb, 0)} ${px(Math.max(0, top))}, ${stops.join(', ')}, ${css(band.rgb, 0)} ${px(bottom)})`)
  }
  for (const g of [...desc.glow].reverse()) {
    out.push(`radial-gradient(${px(g.r)} ${px(g.ry ?? g.r)} at ${px(g.x)} ${px(g.y)}, ${css(g.rgb, g.alpha)} 0, ${css(g.rgb, 0)} 100%)`)
  }
  const a = desc.arch
  if (a) {
    // The arch only rises above the horizon: below eye level the land covers it.
    out.push(`radial-gradient(${px(a.rx)} ${px(a.belt)} at ${px(a.x)} ${px(a.y)}, ${archStops(a).map(([at, colour]) => `${colour} ${(at * 100).toFixed(2)}%`).join(', ')})`)
  }
  out.push(`linear-gradient(180deg, ${desc.stops.map(([at, rgb]) => `${css(rgb)} ${px(Math.min(1, Math.max(0, at)) * h)}`).join(', ')})`)
  return out.join(', ')
}

/** The sky layers the canvas paints: all but the base, which is laid as the canvas's CSS background (`skyBackground`). */
export const onSkyCanvas = (layers: readonly LayerDesc[]) => layers.filter((layer) => layer.kind !== 'sky')
