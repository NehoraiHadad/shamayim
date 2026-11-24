import { hashId } from '../../../../data/landmarks/hash'
import { smoothstep } from '../../../../domain/smoothstep'
import { grainedSheetAlpha, veiledSheetAlpha } from '../../../model/cloudPaintBounds'
import type { LayerOf } from '../../../model/types'
import { deckOpenness } from '../../shared/cloud/deck'
import { ROW } from '../../shared/cloud/resampleRows'
import { cloudGrain, coverOf, makeOf, thickOf } from './grain'
import { softCover } from './softCover'

/*
 * A sheet's density on a raster: the model's coverage (where and how thick) as a soft body, its edge carried in and out by
 * the one grain of all clouds, its undersides cut flat. A closed deck keeps the model's own cover, a veil its mean.
 */

/** Raster px per sky px. */
export const RASTER = 0.5
/** How far over and under a point its underside is looked for, px overhead; how readily a step of cover is one. */
const FOOT = 12, STEP = 1.6
/** How far over its far rim a hole shows its wall, px overhead (the eye looks up at a slant, into the hole), its cover. */
const WALL = 11, WALL_COVER = 0.8
/** A sheet with up to this share of open sky is a deck with holes; from that one on, heaps with sides of their own. */
const DECK_UP_TO = 0.35, HEAPS_FROM = 0.65, CLEAR = 0.1
/** How calm the inside of a deck with holes is everywhere. */
const CALM = 0.36
/** The cover under which nothing is drawn; how far a veil's wisps part. */
const LEAST = 0.012, COMBED = 1.6
/** From this cover on no fine edge shows. */
const EDGELESS = 0.97
/** Low over the horizon a cloud is far: the shares of the sky's height from which and over which it has a body of its own. */
const FAR = [0.04, 0.37] as const

export interface SheetField {
  w: number; h: number
  /** Each row's scale: 1 overhead, small far off; how far its clouds are bodies of their own, not the far deck's mean (0–1). */
  scale: Float32Array; near: Float32Array
  /** Drawn opacity 0–1, the model's own soft cover, thickness 0–1, the model's tone 0–1, its source's share, the towns' light 0–1, the noise's bend. */
  alpha: Float32Array; cover: Float32Array; thick: Float32Array; tone: Float32Array; source: Float32Array; city: Float32Array; bend: Float32Array
  /** A hole's far wall, and the straight edge of an underside, 0–1. */
  wall: Float32Array; flat: Float32Array
  /** How open the deck is, 0–1: what is closed keeps the model's own cover and tone. */
  open: number
  /** How far it is one broad body, calm inside, wherever the point (0–1). */
  calm: number
  grain: ReturnType<typeof cloudGrain>
}

export function sheetField(desc: LayerOf<'cloudSheet'>): SheetField {
  const { xs, ys } = desc, width = xs[xs.length - 1] - xs[0], span = ys[ys.length - 1] - ys[0]
  const open = deckOpenness(desc), veiled = desc.lattice === 'high', kind = makeOf(desc, open)
  const clear = desc.alpha.reduce((sum, a) => sum + 1 - smoothstep(0, CLEAR, a), 0) / desc.alpha.length
  const holed = open * (1 - smoothstep(DECK_UP_TO, HEAPS_FROM, clear)), make = { ...kind, calm: CALM * holed }
  const { buf, cols, rows, scale } = softCover(desc, make.soft)
  const w = Math.ceil(width * RASTER) + 1, h = Math.ceil(span * RASTER) + 1, grid = () => new Float32Array(w * h)
  const field: SheetField = { w, h, scale: new Float32Array(h), near: new Float32Array(h), alpha: grid(), cover: grid(), thick: grid(), tone: grid(), source: grid(), city: grid(),
    bend: grid(), wall: grid(), flat: grid(), open, calm: make.calm, grain: cloudGrain(make, hashId(desc.id)) }
  const { alpha, grain } = field, next = cols * 4
  for (let j = 0, p = 0; j < h; j++) {
    const gy = (j * (rows - 1)) / (h - 1), r = Math.min(rows - 2, Math.floor(gy)), ty = gy - r, y = j / RASTER
    const size = field.scale[j] = scale[r], near = field.near[j] = smoothstep(FAR[0], FAR[1], 1 - j / h), row = r * next
    const rowAt = (px: number) => Math.min(rows - 1, Math.max(0, r + Math.sign(px) * Math.max(1, Math.round((Math.abs(px) * size) / ROW)))) * next - row
    const under = rowAt(FOOT), over = rowAt(-FOOT), into = rowAt(WALL)
    grain.row(size)
    for (let i = 0; i < w; i++, p++) {
      const gx = (i * (cols - 1)) / (w - 1), c = Math.min(cols - 2, Math.floor(gx)), tx = gx - c, n = row + c * 4
      const across = (k: number) => buf[k] + (buf[k + 4] - buf[k]) * tx
      const texel = (k: number) => across(n + k) + (across(n + next + k) - across(n + k)) * ty
      const here = texel(3)
      // Open here and cloud just under: the far wall of a hole (of a deck: a heap's own sides are the model's).
      const rim = holed ? across(n + into + 3) : 0, wall = holed * Math.max(0, rim - here) * smoothstep(0.3, 0.8, rim), a = here + wall * WALL_COVER
      if (a < LEAST) continue
      const sure = Math.max(LEAST, here)
      field.tone[p] = texel(0) / sure
      field.source[p] = here < LEAST ? 1 : texel(1) / sure
      field.city[p] = texel(2) / sure
      alpha[p] = field.cover[p] = here
      if (!open && !veiled) continue
      const x = i / RASTER - width / 2, bend = field.bend[p] = grain.bend(x, y), wisp = grain.wisp(x, y, bend)
      if (veiled) {
        // A veil has no body to carry: its own cover, drawn out in wisps of the same mean.
        alpha[p] = Math.min(1, a * Math.max(0, 1 + COMBED * (1 - a) * (wisp - 0.5)))
        continue
      }
      // An underside: cloud over it, open air under it.
      const flat = Math.min(1, Math.max(0, STEP * (across(n + over + 3) - across(n + under + 3)))), noise = grain.noise(x, y, bend, wisp)
      const far = grainedSheetAlpha(veiledSheetAlpha(here, open), 0.25 + noise / 2, open), fine = near && a < EDGELESS ? grain.fine(x, y, bend) : 0
      alpha[p] = far + near * (here + open * (coverOf(make, a, noise + fine, wisp, flat) - here) - far)
      field.thick[p] = thickOf(make, a, noise, flat)
      field.flat[p] = flat * holed
      field.wall[p] = wall
    }
  }
  return field
}
