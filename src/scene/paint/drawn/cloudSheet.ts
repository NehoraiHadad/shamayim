import { hashId } from '../../../data/landmarks/hash'
import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf, RGB } from '../../model/types'
import { addLight } from '../../model/tone'
import { toneOf } from '../cloudLook'
import { mix, type Ctx2D, type PaintEnv } from '../hand'
import { billows } from './billows'
import { paintHeads } from './heads'
import { lowLight, whitened } from './light'
import { fieldAt, sheetField, type SheetField } from './sheetField'

/*
 * A cloud sheet in the drawn hand (v1b's clouds): soft layered masses with rounded, lit heads and a shade under each, a
 * calm edge, no photographic grain. The masses are the model's (`sheetField`); the hand draws them of heads (`heads`),
 * each inside the model's coverage, with broad billows in the middle of the large ones. A closed deck keeps the model's own opacity and gets broad lit and shaded banks;
 * the high veils stay veils. MEDIUM: one raster, stretched with the canvas's smoothing. Pure: the desc and its seed.
 */

/** Raster px per sky px. */
const RASTER = 0.5
/** A mass's opacity in its core, and how its thin parts fall off (exponent on the model's alpha; faint ones out). */
const CORE = 0.97, THIN = 0.35, FAINT = 0.2
/** The share of the mass's thickness its rim is. */
const RIM = 0.6
/** The light's hand: a puff's lit cap and shaded foot, a mass's broad lit top and shaded base. */
const CAP = 0.7, FOOT = 0.8, BROAD_LIT = 0.8, BROAD_SHADE = 1.1
/** The broad billows' light inside an open mass, where its heads' is calm. */
const INSIDE = 1.1
/** A closed deck's banks: how far their light moves the tone. */
const BANKS = 0.2
/** The share of the model's own tone an open deck's body keeps against the lit: its thin parts', and what a core adds; how
 *  much less under a low sun. */
const BODY = 0.45, CORE_GREY = 0.35, LOW_SUN = 0.1
/** A low sun's light on the rims that face it, and how much less it shades the feet. */
const RIM_LIT = 0.85, LOW_SHADE = 0.2
/** The smallest size of the heads against the zenith's, at the horizon. */
const SIZE_MIN = 0.12
/** How much of the light and the shade on a bank low in the sky the air before it takes, and the height it comes in over (of
 *  the sheet's, from its far edge): the rain that falls before the banks reads against them. */
const AIR_LIT = 0.6, AIR_SHADE = 0.9, AIR_FROM = 0.34, AIR_FULL = 0.12

export function paintDrawnSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const field = sheetField(desc)
  if (!field) return
  const w = Math.ceil(field.width * RASTER) + 1, h = Math.ceil(field.height * RASTER) + 1
  const scratch = env.canvas(w, h)
  const image = scratch.ctx.createImageData(w, h)
  if (desc.lattice === 'high') veil(image.data, desc, field, w, h)
  else masses(image.data, desc, field, w, h)
  scratch.ctx.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(scratch.canvas, 0.5, 0.5, w - 1, h - 1, field.x0, field.y0, field.width, field.height)
  ctx.restore()
}

function masses(out: Uint8ClampedArray, desc: LayerOf<'cloudSheet'>, f: SheetField, w: number, h: number) {
  const seed = hashId(desc.id), low = lowLight(desc), bright = whitened(desc.lit)
  const { cols, rows, open } = f
  const bank = billows(seed)
  const sizeAt = (down: number) => Math.max(SIZE_MIN, Math.sqrt(Math.min(1, f.spacing[Math.round(down * (rows - 1))] / 20)))
  const heads = open ? paintHeads(f, w, h, seed, sizeAt) : null
  let v = 0
  for (let j = 0; j < h; j++) {
    const gy = (j * (rows - 1)) / (h - 1), size = sizeAt(j / (h - 1))
    const air = smoothstep(AIR_FROM, AIR_FULL, 1 - j / (h - 1))
    if (j) v += 1 / (RASTER * size)
    for (let i = 0; i < w; i++) {
      const gx = (i * (cols - 1)) / (w - 1), n = j * w + i
      const a = fieldAt(f.alpha, cols, rows, gx, gy)
      if (a < 0.004) continue
      const cover = heads ? heads.cover[n] : 0
      const alpha = a + open * (CORE * cover * a ** THIN * smoothstep(0, FAINT, a) - a)
      if (alpha < 0.004) continue
      const thick = fieldAt(f.thick, cols, rows, gx, gy), depth = fieldAt(f.depth, cols, rows, gx, gy)
      const part = 1 - smoothstep(0, RIM, depth / Math.max(1, thick)), core = (1 - part) * a
      const tone = fieldAt(f.tone, cols, rows, gx, gy), broad = fieldAt(f.side, cols, rows, gx, gy)
      const broadly = open * INSIDE * (1 - part) + (1 - open) * BANKS
      const relief = (heads ? open * heads.light[n] : 0) + broadly * bank((i / RASTER - f.width / 2) / size, v).light
      const full = open * ((broad > 0 ? BROAD_LIT : BROAD_SHADE * (1 - LOW_SHADE * low)) * broad + low * RIM_LIT * part * (1 - tone))
        + (relief > 0 ? CAP : FOOT) * relief
      const lift = full * (1 - air * (full > 0 ? AIR_LIT : AIR_SHADE))
      const body = toneOf(desc, tone)
      const base = open ? mix(body, mix(desc.lit, body, (BODY + CORE_GREY * (1 - air) * core * core) * (1 - LOW_SUN * low)), open) : body
      put(out, n * 4, underTowns(desc, f, gx, gy, lightOf(base, bright, desc.shade, lift)), alpha)
    }
  }
}

/** A tone moved toward the lit or the shade by the hand's light (+ faces it). */
function lightOf(base: RGB, bright: RGB, shade: RGB, lift: number): RGB {
  return lift > 0 ? mix(base, bright, Math.min(0.95, lift)) : mix(base, shade, Math.min(0.85, -lift))
}

/** A tone with the towns' light on it, by night. */
function underTowns({ city }: LayerOf<'cloudSheet'>, f: SheetField, gx: number, gy: number, rgb: RGB): RGB {
  return city ? addLight(rgb, city.rgb, fieldAt(f.city, f.cols, f.rows, gx, gy)) : rgb
}

/** A high veil: the model's own, softened. */
function veil(out: Uint8ClampedArray, desc: LayerOf<'cloudSheet'>, f: SheetField, w: number, h: number) {
  for (let j = 0; j < h; j++) {
    const gy = (j * (f.rows - 1)) / (h - 1)
    for (let i = 0; i < w; i++) {
      const gx = (i * (f.cols - 1)) / (w - 1), a = fieldAt(f.alpha, f.cols, f.rows, gx, gy)
      if (a > 0.004) put(out, (j * w + i) * 4, underTowns(desc, f, gx, gy, toneOf(desc, fieldAt(f.tone, f.cols, f.rows, gx, gy))), a)
    }
  }
}

function put(out: Uint8ClampedArray, at: number, rgb: RGB, alpha: number) {
  for (let k = 0; k < 3; k++) out[at + k] = Math.round(Math.min(1, Math.max(0, rgb[k])) * 255)
  out[at + 3] = Math.round(Math.min(1, alpha) * 255)
}
