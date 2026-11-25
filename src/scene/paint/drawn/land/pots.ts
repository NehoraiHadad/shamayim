import { TEXEL } from '../../../model/planeBands'
import { labOf, rgbOfLab, toLinear, toSrgb } from '../../../model/tone'
import type { LayerOf, RGB } from '../../../model/types'
import { fractal } from '../../shared/base/core'
import { samplePlaneTexel, type PlaneTexelCtx } from '../../shared/land/planeTexel'
import { traceOver, type Frame } from '../kit/contour'
import { ease } from '../kit/ease'
import { kept } from '../kit/kept'
import { classesOf } from './classes'

/*
 * The colour block: a plane's material (cover, bare ground, snow) gathered into a few pots, each a set of closed shapes.
 * No light in it, so it stands still while the hour is dragged and is kept.
 */

/** The pots a plane is gathered into, and the most it keeps; how far the material is gathered (cells); where a pot's edge stands, its smallest shape (points). */
const POTS = { near: 6, far: 1, back: 1 } as const, MOST = 4
const GATHER = 1.2, EDGE = 0.43, LEAST = 7
/**
 * Pots nearer than this (Oklab) are one pigment, mixed together; those kept are pushed apart about their mean until the
 * nearest two stand this far, value more than hue, by at most this much: each a distinct step in the box, as the plate's banks and wood.
 */
const MERGE = 0.045, APART = 0.075, SPREAD = 2.4
/** How far a slow noise bends the sides of patches (px): the model's lie in columns, the land's do not. */
const BENT = 15, BENT_SEED = 733
/**
 * The terraces the material is read in: bands of the plane's depth (more uphill, where the land lies farther), each read
 * at its own middle depth and shifted along the slope by up to `SHIFT` px, so a pot's edge runs along the contour (parallel
 * to the crest) at a band's side and steps down the fall line between: knife facets, not domes. How much each band's side
 * wanders (a share of a band).
 */
const TERRACES = 5, SHIFT = 22, WANDER = 0.3

/** A pot: the mean linear reflectance of its ground, the cells it holds, its shapes. */
export interface Pot { rho: RGB; count: number; shapes: Path2D }
/** A plane's pots, the most held first (it fills the whole plane), each cell's, and the place along the plane each cell is read at. */
export interface Ground { pots: Pot[]; label: Uint8Array; on: Uint8Array; bent: Float32Array }

/** Where a grid of the plane's cells lies, so that a shape that meets a side runs past it. */
export const frameOf = ({ bounds: b }: PlaneTexelCtx): Frame => ({ x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 })

/** The column of a place along the plane, and the cell of one on it. */
export const columnAt = (t: PlaneTexelCtx, x: number) => Math.min(t.wPx - 1, Math.max(0, Math.floor((x - t.bounds.x) / TEXEL)))
export const cellAt = (t: PlaneTexelCtx, x: number, y: number) =>
  Math.min(t.hPx - 1, Math.max(0, Math.floor((y - t.bounds.y) / TEXEL))) * t.wPx + columnAt(t, x)

const grounds = kept<Ground>(6)

export function groundOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>): Ground {
  const { x, y, w, h } = desc.bounds
  return grounds([desc.key, x, y, w, h, JSON.stringify(desc.light.litField.snow ?? null)].join('|'), () => gather(t, POTS[desc.plane]))
}

function gather(t: PlaneTexelCtx, k: number): Ground {
  const { wPx: cols, hPx: rows, bounds, crestY, footY } = t, cells = cols * rows
  const rho = [0, 1, 2].map(() => new Float32Array(cells)), on = new Uint8Array(cells), bent = new Float32Array(cells)
  for (let j = 0, n = 0; j < rows; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < cols; i++, n++) {
      const x = bounds.x + (i + 0.5) * TEXEL, deep = Math.min(1, Math.max(0, (y - crestY[i]) / 40)), [shift, at] = terrace(t, i, x, y)
      bent[n] = x + deep * (shift + BENT * (fractal(BENT_SEED, x, y, 0.012, 0.022, 2) - 0.5))
      samplePlaneTexel(t, columnAt(t, bent[n]), bent[n], at).rho.forEach((v, m) => { rho[m][n] = v })
      on[n] = y >= crestY[i] - TEXEL && y <= footY[i] + TEXEL ? 1 : 0
    }
  }
  const lab = new Float32Array(cells * 3)
  for (const part of rho) ease(part, cols, rows, Array<number>(rows).fill(GATHER), Array<number>(rows).fill(GATHER * 0.6))
  for (let n = 0; n < cells; n++) {
    const { l, a, b } = labOf([toSrgb(rho[0][n]), toSrgb(rho[1][n]), toSrgb(rho[2][n])])
    lab.set([l, a, b], n * 3)
  }
  const classes = classesOf(lab, on, k), { count } = classes, label = mixed(classes)
  const order = [...count.keys()].filter((c) => count[c]).sort((a, b) => count[b] - count[a])
  if (!order.length) order.push(label[0])
  return { on, bent, label: label.map((c) => Math.max(0, order.indexOf(c))), pots: apart(order.map((c) => potOf(t, rho, label, on, c))) }
}

/** Pots too near to tell apart mixed into the larger, and the nearest mixed till no more than `MOST` are left; the labels after. */
function mixed({ label, pots, count }: ReturnType<typeof classesOf>): Uint8Array {
  const into = [...count.keys()], dist = (p: number, q: number) => Math.hypot(...[0, 1, 2].map((m) => pots[p * 3 + m] - pots[q * 3 + m]))
  for (;;) {
    const live = into.filter((c, k) => c === k && count[c])
    let best: [number, number] | null = null, least = Infinity
    for (const p of live) for (const q of live) if (p < q && dist(p, q) < least) { least = dist(p, q); best = [p, q] }
    if (!best || (least >= MERGE && live.length <= MOST)) break
    const [big, small] = count[best[0]] >= count[best[1]] ? best : [best[1], best[0]], whole = count[big] + count[small]
    for (let m = 0; m < 3; m++) pots[big * 3 + m] = (pots[big * 3 + m] * count[big] + pots[small * 3 + m] * count[small]) / whole
    count[big] = whole
    count[small] = 0
    into.forEach((c, k) => { if (c === small) into[k] = big })
  }
  return label.map((c) => into[c])
}

/** The pots' reflectances pushed apart about their mean (Oklab of their sRGB), the value by the whole push, the hue by its root. */
function apart(pots: Pot[]): Pot[] {
  if (pots.length < 2) return pots
  const labs = pots.map(({ rho }) => labOf(rho.map(toSrgb) as unknown as RGB)), whole = pots.reduce((sum, p) => sum + p.count, 0)
  const mean = (key: 'l' | 'a' | 'b') => labs.reduce((sum, lab, p) => sum + lab[key] * pots[p].count, 0) / whole
  const m = { l: mean('l'), a: mean('a'), b: mean('b') }
  let least = Infinity
  for (let p = 0; p < labs.length; p++) for (let q = p + 1; q < labs.length; q++) {
    least = Math.min(least, Math.hypot(labs[p].l - labs[q].l, labs[p].a - labs[q].a, labs[p].b - labs[q].b))
  }
  const by = Math.min(SPREAD, Math.max(1, APART / Math.max(1e-4, least))), hue = Math.sqrt(by)
  return pots.map((pot, p) => {
    const lab = labs[p], rgb = rgbOfLab({ l: Math.min(0.97, Math.max(0.08, m.l + (lab.l - m.l) * by)), a: m.a + (lab.a - m.a) * hue, b: m.b + (lab.b - m.b) * hue })
    return { ...pot, rho: rgb.map((v) => toLinear(Math.min(1, Math.max(0, v)))) as unknown as RGB }
  })
}

/** A place's terrace: the shift along the slope its band is read at (px), and the depth (px) it is read at, its band's middle. */
function terrace({ crestY, footY }: PlaneTexelCtx, i: number, x: number, y: number): [number, number] {
  const top = crestY[i], whole = Math.max(1, footY[i] - top), v = Math.min(1, Math.max(0, (y - top) / whole))
  // Bands even in the root of the depth: narrow under the crest, wide at the foot; their sides wander slowly along it.
  const at = Math.sqrt(v) * TERRACES + WANDER * (fractal(BENT_SEED + 1, x, 0, 0.018, 1, 2) - 0.5) * 2
  const band = Math.min(TERRACES - 1, Math.max(0, Math.floor(at))), mid = ((band + 0.5) / TERRACES) ** 2
  return [SHIFT * (fractal(BENT_SEED + 2, (band + 0.5) * 3.7, 0.5, 1, 1, 1) - 0.5) * 2, top + mid * whole]
}

function potOf(t: PlaneTexelCtx, rho: readonly Float32Array[], label: Uint8Array, on: Uint8Array, c: number): Pot {
  const sum: [number, number, number] = [0, 0, 0], is = Float32Array.from(label, (v) => (v === c ? 1 : 0))
  const held = on.some((v, n) => v && is[n])
  let count = 0
  for (let n = 0; n < on.length; n++) if (is[n] && (on[n] || !held)) {
    count++
    for (let m = 0; m < 3; m++) sum[m] += rho[m][n]
  }
  ease(is, t.wPx, t.hPx, Array<number>(t.hPx).fill(1.1), Array<number>(t.hPx).fill(0.7))
  const shapes = new Path2D()
  traceOver(shapes, { cols: t.wPx, rows: t.hPx, at: is }, EDGE, frameOf(t), LEAST, 1)
  return { rho: [sum[0] / count, sum[1] / count, sum[2] / count], count, shapes }
}
