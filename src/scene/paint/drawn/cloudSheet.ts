import { hashId } from '../../../data/landmarks/hash'
import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf, RGB } from '../../model/types'
import { addLight, scaleLight } from '../../model/tone'
import { toneOf } from '../shared/cloud/deck'
import { throughAir } from '../shared/cloud/throughAir'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { billows } from './billows'
import { lowLight, whitened } from './cloudLight'
import { fieldAt, sheetField, type SheetField } from './sheetField'
import { printField, printSheet } from './sheetPrint'

/*
 * A cloud sheet in the drawn hand. What is broken is printed as capped blocks (`printSheet`), more of it the more open the
 * sheet; a closed deck keeps the model's own opacity and gets broad lit and shaded banks, calm, with no photographic grain;
 * so does what is too thin to be cut, and the high veils stay veils. MEDIUM: one raster, stretched with the canvas's
 * smoothing, and the print over it. Pure: the desc and its seed.
 */

/** Raster px per sky px. */
const RASTER = 0.5
/** The light's hand: a puff's lit cap and shaded foot, how far a closed deck's banks move the tone; the puffs' light inside a
 *  mass against its edge: calmer in the middle; the small heads' light on the edge. */
const CAP = 1.7, FOOT = 1.9, BANKS = 0.27, INSIDE = 0.85, SMALL_LIT = 0.25
/** How much calmer the puffs' own light is under a low sun: the whole mass takes it. */
const LOW_CALM = 0.5
/** The smallest size of the heads against the zenith's, at the horizon. */
const SIZE_MIN = 0.12
/** How much of the light and the shade on a bank low in the sky the air before it takes, and the height it comes in over (of
 *  the sheet's, from its far edge): the rain that falls before the banks reads against them. */
const AIR_LIT = 0.6, AIR_SHADE = 0.9, AIR_FROM = 0.34, AIR_FULL = 0.12
/** What of the cloud too thin to be cut stays behind the print, and the cloud round it (wide alpha) that takes it. */
const WISP = 0.8, ALONE = [0.08, 0.34] as const

export function paintDrawnSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const field = sheetField(desc)
  if (!field) return
  const open = desc.air ? field.open : 0, read = open ? printField(field) : null
  const w = Math.ceil(field.width * RASTER) + 1, h = Math.ceil(field.height * RASTER) + 1
  const scratch = env.canvas(w, h)
  const image = scratch.ctx.createImageData(w, h)
  const left = (a: number, gx: number, gy: number) =>
    (read ? a * (1 - open + open * WISP * (1 - smoothstep(ALONE[0], ALONE[1], fieldAt(read.wide, field.cols, field.rows, gx, gy)))) : a)
  if (desc.lattice === 'high') veil(image.data, desc, field, w, h)
  else masses(image.data, desc, field, left, w, h)
  throughAir(image.data, w, h, desc)
  scratch.ctx.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(scratch.canvas, 0.5, 0.5, w - 1, h - 1, field.x0, field.y0, field.width, field.height)
  ctx.globalAlpha *= open
  if (read) printSheet(ctx, desc, read, env)
  ctx.restore()
}

/** What is not printed: the model's own alpha as far as it is `left`, with the hand's broad light over it. */
function masses(out: Uint8ClampedArray, desc: LayerOf<'cloudSheet'>, f: SheetField, left: (a: number, gx: number, gy: number) => number, w: number, h: number) {
  const head = billows(hashId(desc.id)), low = lowLight(desc), bright = whitened(desc.lit)
  const { cols, rows } = f
  let v = 0
  for (let j = 0; j < h; j++) {
    const gy = (j * (rows - 1)) / (h - 1), size = Math.max(SIZE_MIN, Math.sqrt(Math.min(1, f.spacing[Math.round(gy)] / 20)))
    const air = smoothstep(AIR_FROM, AIR_FULL, 1 - j / (h - 1))
    if (j) v += 1 / (RASTER * size)
    for (let i = 0; i < w; i++) {
      const gx = (i * (cols - 1)) / (w - 1), a = fieldAt(f.alpha, cols, rows, gx, gy), alpha = a < 0.004 ? 0 : left(a, gx, gy)
      if (alpha < 0.004) continue
      const puff = head((i / RASTER - f.width / 2) / size, v), part = 4 * a * (1 - a)
      const relief = puff.light * (INSIDE + (1 - INSIDE) * part) + SMALL_LIT * part * puff.small
      const full = BANKS * (relief > 0 ? CAP : FOOT) * (1 - LOW_CALM * low) * relief
      const lift = full * (1 - air * (full > 0 ? AIR_LIT : AIR_SHADE))
      const base = toneOf(desc, fieldAt(f.tone, cols, rows, gx, gy))
      put(out, (j * w + i) * 4, underTowns(desc, f, gx, gy, lightOf(lit(base, f, gx, gy), bright, desc.shade, lift, low)), alpha)
    }
  }
}

/** A tone moved toward the lit or the shade by the hand's light (+ faces up); a low sun lights the feet, not the caps. */
function lightOf(base: RGB, bright: RGB, shade: RGB, lift: number, low: number): RGB {
  const facing = lift * (1 - 2 * low)
  return facing > 0 ? mix(base, bright, Math.min(0.95, facing)) : mix(base, shade, Math.min(0.85 - 0.5 * low, -facing * (1 - 0.6 * low)))
}

/** A tone in the light its thick base has there. */
function lit(rgb: RGB, f: SheetField, gx: number, gy: number): RGB {
  return f.source ? scaleLight(rgb, fieldAt(f.source, f.cols, f.rows, gx, gy)) : rgb
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
