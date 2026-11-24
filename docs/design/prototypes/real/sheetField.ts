import { smoothstep } from '../../../../src/domain/smoothstep'
import { hashId } from '../../../../src/data/landmarks/hash'
import type { LayerOf } from '../../../../src/scene/model/types'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import { deckOpenness } from '../../../../src/scene/paint/shared/cloud/deck'
import { resampleRows, ROW } from '../../../../src/scene/paint/shared/cloud/resampleRows'
import { bodyOf, DECK, FLEECE, grainRows, HEAP, VEIL, type Make } from './cloudGrain'
import type { LitBody } from './cloudLight'

/*
 * A sheet's density on a raster: the model's coverage (where and how thick) as a soft body, its edge carried in and out
 * by the one grain of all clouds, its undersides cut flat. A veil and a closed deck keep the model's own cover.
 */

/** Raster px per sky px. */
export const RASTER = 0.6
/** How far over and under a point its underside is looked for, px overhead; how readily a step of cover is one. */
const FOOT = 12, STEP = 1.6
/** How far over its far rim a hole shows its wall, px overhead: the eye looks up at a slant, into the hole. */
const WALL = 11
/** A sheet with up to this share of open sky is a deck with holes; from that one on, heaps with sides of their own. */
const DECK_UP_TO = 0.35, HEAPS_FROM = 0.65
/** Nearer than this (px) to the light's own place it comes from behind, not from a side. */
const BEFORE = 70

export interface SheetField extends LitBody {
  /** Drawn opacity 0–1, the model's tone 0–1, the towns' light 0–1, how far the heads face away from the light. */
  alpha: Float32Array; tone: Float32Array; city: Float32Array; relief: Float32Array
  /** A hole's far wall, and the straight edge of an underside, 0–1. */
  wall: Float32Array; flat: Float32Array
  /** How open the deck is 0–1: what is closed keeps the model's own cover and tone. */
  open: number
}

const makeOf = (desc: LayerOf<'cloudSheet'>): Make => desc.lattice === 'high' ? VEIL
  : ['st', 'ns', 'as'].includes(desc.genus) ? DECK : desc.lattice === 'mid' ? FLEECE : HEAP

/** `from`: the light's place in sky px. */
export function sheetField(desc: LayerOf<'cloudSheet'>, from: { x: number; y: number }): SheetField {
  const { xs, ys } = desc, cols = xs.length, rows = ys.length
  const width = xs[cols - 1] - xs[0], span = ys[rows - 1] - ys[0]
  const open = desc.lattice === 'high' ? 1 : deckOpenness(desc)
  const holed = desc.lattice === 'high' ? 0 : 1 - smoothstep(DECK_UP_TO, HEAPS_FROM, desc.alpha.filter((a) => a < 0.05).length / desc.alpha.length)
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
  const field: SheetField = { w, h, k: RASTER, alpha: new Float32Array(size), thick: new Float32Array(size), tone: new Float32Array(size),
    city: new Float32Array(size), relief: new Float32Array(size),
    wall: new Float32Array(size), flat: new Float32Array(size), open, scale: new Float32Array(h) }
  const grains = grainRows(make, hashId(desc.id) % 9973)
  const veiled = desc.lattice === 'high', kept = veiled ? 0 : open
  for (let j = 0; j < h; j++) {
    const gy = Math.min(out - 1.001, (j * (out - 1)) / (h - 1)), r = Math.floor(gy), ty = gy - r
    const scale = field.scale[j] = scaleAt[r], grain = grains(scale), y = j / RASTER
    const reach = Math.max(1, Math.round((FOOT * scale) / ROW))
    const deep = Math.min(out - 1, r + Math.max(1, Math.round((WALL * scale) / ROW))) * cols
    const over = Math.max(0, r - reach) * cols, under = Math.min(out - 1, r + reach) * cols
    for (let i = 0; i < w; i++) {
      const gx = Math.min(cols - 1.001, (i * (cols - 1)) / (w - 1)), c = Math.floor(gx), tx = gx - c
      const n = (r * cols + c) * 4, below = n + cols * 4
      const at = (k: number) => {
        const top = buf[n + k] + (buf[n + 4 + k] - buf[n + k]) * tx
        return top + (buf[below + k] + (buf[below + 4 + k] - buf[below + k]) * tx - top) * ty
      }
      const here = at(3), wallAt = buf[(deep + c) * 4 + 3] * (1 - tx) + buf[(deep + c + 1) * 4 + 3] * tx
      // Open here and cloud just under: the far wall of a hole (of a deck: a heap's own sides are the model's).
      const wall = veiled ? 0 : holed * Math.max(0, wallAt - here) * smoothstep(0.3, 0.8, wallAt)
      const a = here + wall * 0.8
      if (a < 0.012) continue
      const p = j * w + i, x = i / RASTER
      const dx = from.x - xs[0] - x, dy = from.y - ys[0] - y, far = Math.max(BEFORE, Math.hypot(dx, dy))
      const g = grain(x - width / 2, y, dx / far, dy / far)
      // An underside: cloud over it, open air under it.
      const edge = (o: number, u: number) => buf[(over + o) * 4 + 3] - buf[(under + u) * 4 + 3]
      const flat = veiled ? 0 : Math.min(1, Math.max(0, STEP * (edge(c, c) * (1 - tx) + edge(c + 1, c + 1) * tx)))
      const [body, thick] = bodyOf(make, a, g, flat)
      field.relief[p] = g.relief
      field.wall[p] = wall
      field.flat[p] = flat * holed
      field.thick[p] = thick
      // A veil has no body to carry: its own cover, drawn out in wisps of the same mean.
      const own = veiled ? a * Math.max(0, 1 + 2.6 * (1 - a) * (g.wisp - 0.5)) : a
      const drawn = field.alpha[p] = Math.min(1, kept * body + (1 - kept) * own)
      if (drawn <= 0.004) continue
      const sure = Math.max(0.05, here)
      field.tone[p] = at(0) / sure
      field.city[p] = at(1) / sure
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
