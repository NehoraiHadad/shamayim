import { hashId } from '../../../data/landmarks/hash'
import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf, RGB } from '../../model/types'
import { addLight } from '../../model/tone'
import { toneOf } from '../shared/cloud/deck'
import { throughAir } from '../shared/cloud/throughAir'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { billows } from './billows'
import { lowLight, whitened } from './cloudLight'
import { fieldAt, sheetField, type SheetField } from './sheetField'

/*
 * A cloud sheet in the drawn hand (v1b's clouds): soft layered masses with rounded, lit heads and a shade under each, a
 * calm edge, no photographic grain. The masses are the model's (`sheetField`); the hand adds the heads (`billows`) along
 * their edges and the light over them. A closed deck keeps the model's own opacity and gets broad lit and shaded banks;
 * the high veils stay veils. MEDIUM: one raster, stretched with the canvas's smoothing. Pure: the desc and its seed.
 */

/** Raster px per sky px. */
const RASTER = 0.5
/** A mass's opacity in its core, and how its thin parts fall off (exponent on the model's alpha). */
const CORE = 0.94, THIN = 0.55
/** The alpha the drawn edge stands at and its softness: crisper on a lit top than underneath, and what the air before a far one adds. */
const EDGE = 0.4, SOFT_TOP = 0.08, SOFT_BASE = 0.27, SOFT_AIR = 0.12
/** How far the heads, and the small ones on them, move the edge, against a half-thick part. */
const HEADS = 0.85, SMALL = 0.34
/** The light's hand: a puff's lit cap and shaded foot, a mass's broad lit top and shaded base. */
const CAP = 1.7, FOOT = 1.9, BROAD_LIT = 0.8, BROAD_SHADE = 1.1
/** The puffs' light inside a mass against its edge: calmer in the middle; the small heads' light on the edge. */
const INSIDE = 0.85, SMALL_LIT = 0.25
/** A closed deck's banks: how far their light moves the tone. */
const BANKS = 0.27
/** The share of the model's own tone an open deck's body keeps against the lit: its thin parts', and what a core adds; how
 *  much less under a low sun. */
const BODY = 0.45, CORE_GREY = 0.35, LOW_SUN = 0.35
/** How much calmer the puffs' own light is under a low sun: the whole mass takes it. */
const LOW_CALM = 0.5
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
  throughAir(image.data, w, h, desc)
  scratch.ctx.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(scratch.canvas, 0.5, 0.5, w - 1, h - 1, field.x0, field.y0, field.width, field.height)
  ctx.restore()
}

function masses(out: Uint8ClampedArray, desc: LayerOf<'cloudSheet'>, f: SheetField, w: number, h: number) {
  const head = billows(hashId(desc.id)), low = lowLight(desc), bright = whitened(desc.lit)
  const { cols, rows, open } = f
  let v = 0
  for (let j = 0; j < h; j++) {
    const gy = (j * (rows - 1)) / (h - 1), size = Math.max(SIZE_MIN, Math.sqrt(Math.min(1, f.spacing[Math.round(gy)] / 20)))
    const air = smoothstep(AIR_FROM, AIR_FULL, 1 - j / (h - 1))
    if (j) v += 1 / (RASTER * size)
    for (let i = 0; i < w; i++) {
      const gx = (i * (cols - 1)) / (w - 1), at = (j * w + i) * 4
      const a = fieldAt(f.alpha, cols, rows, gx, gy)
      if (a < 0.004) continue
      const x = (i / RASTER - f.width / 2) / size
      const puff = head(x, v), rise = puff.light
      const part = 4 * a * (1 - a)
      const alpha = drawnAlpha(a, HEADS * puff.high + SMALL * puff.small, part, rise, open, SOFT_AIR * (1 - size))
      if (alpha < 0.004) continue
      const broad = fieldAt(f.side, cols, rows, gx, gy)
      const relief = puff.light * (INSIDE + (1 - INSIDE) * part) + SMALL_LIT * part * puff.small
      const full = open * (broad > 0 ? BROAD_LIT : BROAD_SHADE) * broad
        + (open + (1 - open) * BANKS) * (relief > 0 ? CAP : FOOT) * (1 - LOW_CALM * low) * relief
      const lift = full * (1 - air * (full > 0 ? AIR_LIT : AIR_SHADE))
      const body = toneOf(desc, fieldAt(f.tone, cols, rows, gx, gy))
      const base = open ? mix(body, mix(desc.lit, body, (BODY + CORE_GREY * (1 - air) * a * a) * (1 - LOW_SUN * low)), open) : body
      put(out, at, underTowns(desc, f, gx, gy, lightOf(base, bright, desc.shade, lift, low)), alpha)
    }
  }
}

/** The mass's drawn alpha: the model's for a closed deck; an open one's edge stands on its heads. */
function drawnAlpha(a: number, head: number, part: number, rise: number, open: number, air: number) {
  if (!open) return a
  const soft = air + SOFT_BASE + (SOFT_TOP - SOFT_BASE) * smoothstep(-0.2, 0.2, rise)
  const edge = smoothstep(EDGE - soft, EDGE + soft, a + head * part)
  return a + open * (CORE * edge * a ** THIN - a)
}

/** A tone moved toward the lit or the shade by the hand's light (+ faces up); a low sun lights the feet, not the caps. */
function lightOf(base: RGB, bright: RGB, shade: RGB, lift: number, low: number): RGB {
  const facing = lift * (1 - 2 * low)
  return facing > 0 ? mix(base, bright, Math.min(0.95, facing)) : mix(base, shade, Math.min(0.85 - 0.5 * low, -facing * (1 - 0.6 * low)))
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
