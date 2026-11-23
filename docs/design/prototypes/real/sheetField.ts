import { smoothstep } from '../../../../src/domain/smoothstep'
import { hashId } from '../../../../src/data/landmarks/hash'
import type { LayerOf } from '../../../../src/scene/model/types'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import { deckOpenness } from '../../../../src/scene/paint/shared/cloud/deck'
import { resampleRows, ROW } from '../../../../src/scene/paint/shared/cloud/resampleRows'
import { noiseAt, placeOf, puffTile, swellTile, wispTile } from './cloudNoise'

/*
 * A sheet's density on a raster: the model's coverage (where and how thick) as a soft body, its edge carried in and out
 * and its inside thinned by perspective noise. A full core and an open sky stay what they are: the noise works on the rim.
 */

/** Raster px per sky px. */
export const RASTER = 0.6

export interface SheetField {
  w: number; h: number
  /** Drawn opacity 0–1, the cloud's thickness 0–1, the model's tone 0–1, the towns' light 0–1, how far the heads face away from the light. */
  alpha: Float32Array; thick: Float32Array; tone: Float32Array; city: Float32Array; relief: Float32Array
  /** How open the deck is 0–1: what is closed keeps the model's own cover and tone. */
  open: number
  /** The deck's scale by row: 1 overhead, small far off. */
  scale: Float32Array
}

/** How a kind of cloud is made: its softening overhead (px); how far the noise carries its edge; the noise tile's width
 *  overhead (px) and its stretch along the wind; the puffs' part in the noise (the rest wisps); the rim's softness; how much
 *  the noise thins the inside. */
/** How far the rim stands back from the model's faintest cover, so a mass keeps its mean cover. */
const BIAS = 0.06
/** How far toward the light a head's slope is taken, in tile widths. */
const SLOPE = 0.06
interface Make { soft: number; carry: number; tile: number; along: number; puff: number; rim: number; thin: number }
const HEAP: Make = { soft: 10, carry: 0.95, tile: 230, along: 1.1, puff: 0.62, rim: 0.46, thin: 0.3 }
const FLEECE: Make = { soft: 10, carry: 1, tile: 190, along: 1.2, puff: 0.5, rim: 0.48, thin: 0.42 }
const VEIL: Make = { soft: 14, carry: 1, tile: 300, along: 3, puff: 0, rim: 1, thin: 0.75 }
const DECK: Make = { soft: 9, carry: 0.85, tile: 300, along: 1.8, puff: 0.4, rim: 0.6, thin: 0.12 }

const makeOf = (desc: LayerOf<'cloudSheet'>): Make => desc.lattice === 'high' ? VEIL
  : ['st', 'ns', 'as'].includes(desc.genus) ? DECK : desc.lattice === 'mid' ? FLEECE : HEAP

/** `from`: the light's place in sky px. */
export function sheetField(desc: LayerOf<'cloudSheet'>, from: { x: number; y: number }): SheetField {
  const { xs, ys } = desc, cols = xs.length, rows = ys.length
  const width = xs[cols - 1] - xs[0], span = ys[rows - 1] - ys[0]
  const open = desc.lattice === 'high' ? 1 : deckOpenness(desc)
  const make = blend(DECK, makeOf(desc), open)
  const out = Math.ceil(span / ROW) + 1
  const texels = Array.from({ length: cols * rows }, (_, n) => {
    const a = Math.min(1, Math.max(0, desc.alpha[n] ?? 0))
    return [(desc.tone[n] ?? 0) * a, (desc.city?.weight[n] ?? 0) * a, 0, a]
  })
  const { buf, spacing } = resampleRows(texels, cols, ys, out)
  const colPx = width / (cols - 1)
  const scaleAt = rowScale(spacing)
  soften(buf, cols, out, scaleAt.map((s) => make.soft * Math.max(0.12, s) / colPx), scaleAt.map((s) => 0.6 * make.soft * s / ROW))
  const w = Math.ceil(width * RASTER) + 1, h = Math.ceil(span * RASTER) + 1, size = w * h
  const field: SheetField = { w, h, alpha: new Float32Array(size), thick: new Float32Array(size), tone: new Float32Array(size),
    city: new Float32Array(size), relief: new Float32Array(size), open, scale: new Float32Array(h) }
  const at0 = placeOf(hashId(desc.id) % 9973), puffs = puffTile(), wisps = wispTile(), swell = swellTile()
  const veiled = desc.lattice === 'high'
  for (let j = 0; j < h; j++) {
    const gy = Math.min(out - 1.001, (j * (out - 1)) / (h - 1)), r = Math.floor(gy), ty = gy - r
    const scale = field.scale[j] = scaleAt[r]
    // The grain's size steps down the sky in octaves, two blended: a size sliding with the row would shear into streaks.
    const level = Math.min(2.999, -Math.log2(0.1 + 0.9 * scale)), step = Math.floor(level), part = level - step
    const read = (tile: Float32Array, i: number, rate: number, a: number, b: number) => {
      const one = (l: number) => {
        const size = make.tile * 2 ** -l
        return noiseAt(tile, (i / RASTER - width / 2) * rate / (size * make.along) + a + at0.u + 0.37 * l, (j / RASTER) * rate * (1 + 0.45 * l) / size + b + at0.v + 0.61 * l)
      }
      return one(step) * (1 - part) + one(step + 1) * part
    }
    for (let i = 0; i < w; i++) {
      const gx = Math.min(cols - 1.001, (i * (cols - 1)) / (w - 1)), c = Math.floor(gx), tx = gx - c
      const n = (r * cols + c) * 4, below = n + cols * 4
      const at = (k: number) => {
        const top = buf[n + k] + (buf[n + 4 + k] - buf[n + k]) * tx
        return top + (buf[below + k] + (buf[below + 4 + k] - buf[below + k]) * tx - top) * ty
      }
      const a = at(3)
      if (a < 0.012) continue
      const p = j * w + i
      // The grain is bent by a slow swirl, so a tear curls.
      const bend = read(wisps, i, 0.5, 0.31, 0.17) - 0.5
      const wisp = read(wisps, i, 1, bend * 0.22, bend * 0.16)
      const puff = make.puff ? read(puffs, i, 1.1, bend * 0.1 + 0.2, -bend * 0.08) : 0
      const noise = wisp + (puff - wisp) * make.puff
      const rimmed = a + make.carry * (noise - 0.5) * Math.min(1, 4.4 * a * (1 - a)) - BIAS
      const d = smoothstep(0, 1, Math.max(0, rimmed - BIAS) / make.rim)
      // A head's slope rising toward the light is its far side.
      const dx = from.x - xs[0] - i / RASTER, dy = from.y - ys[0] - j / RASTER, far = Math.hypot(dx, dy) || 1
      field.relief[p] = read(swell, i, 1.1, bend * 0.1 + (SLOPE * dx) / far, -bend * 0.08 + (SLOPE * dy) / far) - read(swell, i, 1.1, bend * 0.1, -bend * 0.08)
      field.thick[p] = Math.min(1, Math.max(0, rimmed)) * (1 - make.thin * (1 - noise))
      const body = d * (1 - make.thin * 0.75 * (1 - noise) ** 1.4)
      // A veil has no body to carry: its own cover, drawn out in wisps of the same mean.
      const own = veiled ? a * Math.max(0, 1 + 2.6 * (1 - a) * (wisp - 0.5)) : a
      const kept = veiled ? 0 : open
      const drawn = field.alpha[p] = Math.min(1, kept * body + (1 - kept) * own)
      if (drawn <= 0.004) continue
      field.tone[p] = at(0) / a
      field.city[p] = at(1) / a
    }
  }
  return field
}

/** Each row's scale by its spacing, smooth down the sky (the model's rows change spacing in steps). */
function rowScale(spacing: readonly number[]): number[] {
  const wide = Math.max(...spacing)
  const raw = spacing.map((s) => Math.sqrt(s / wide))
  const reach = Math.round(16 / ROW)
  return raw.map((_, r) => {
    let sum = 0, n = 0
    for (let k = Math.max(0, r - reach); k <= Math.min(raw.length - 1, r + reach); k++) { sum += raw[k]; n++ }
    return Math.max(0.06, sum / n)
  })
}

function blend(a: Make, b: Make, t: number): Make {
  const mixed = { ...a }
  for (const key of Object.keys(a) as (keyof Make)[]) mixed[key] = a[key] + (b[key] - a[key]) * t
  return mixed
}
