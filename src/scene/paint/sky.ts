import type { LayerOf } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'

/*
 * The sky: its gradient over its bounds, and the haze band at the horizon (rising from nothing to its strength at eye
 * level and thinning just below it, behind the far land; C6 adds the glow). MEDIUM: flat light, no hand marks.
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

export function paintSky(ctx: Ctx2D, desc: LayerOf<'sky'>, env: PaintEnv): void {
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
