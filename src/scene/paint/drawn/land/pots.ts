import { TEXEL } from '../../../model/planeBands'
import { labOf, toSrgb } from '../../../model/tone'
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

/** The pots a plane takes; how far the material is gathered (cells); where a pot's edge stands, its smallest shape (points). */
const POTS = { near: 6, far: 4, back: 3 } as const
const GATHER = 1.2, EDGE = 0.43, LEAST = 7
/** How far a slow noise bends the patches' sides (px): the model's lie in columns, the land's do not. */
const BENT = 50, BENT_SEED = 733

/** A pot: the mean linear reflectance of its ground, the cells it holds, its shapes. */
export interface Pot { rho: RGB; count: number; shapes: Path2D }
/** A plane's pots, the most held first (it fills the whole plane), and each cell's. */
export interface Ground { pots: Pot[]; label: Uint8Array; on: Uint8Array }

/** Where a grid of the plane's cells lies, so that a shape that meets a side runs past it. */
export const frameOf = ({ bounds: b }: PlaneTexelCtx): Frame => ({ x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 })

/** The cell of a place on the plane. */
export function cellAt(t: PlaneTexelCtx, x: number, y: number): number {
  const i = Math.min(t.wPx - 1, Math.max(0, Math.floor((x - t.bounds.x) / TEXEL)))
  return Math.min(t.hPx - 1, Math.max(0, Math.floor((y - t.bounds.y) / TEXEL))) * t.wPx + i
}

const grounds = kept<Ground>(6)

export function groundOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>): Ground {
  const { x, y, w, h } = desc.bounds
  return grounds([desc.key, x, y, w, h, JSON.stringify(desc.light.litField.snow ?? null)].join('|'), () => gather(t, POTS[desc.plane]))
}

function gather(t: PlaneTexelCtx, k: number): Ground {
  const { wPx: cols, hPx: rows, bounds, crestY, footY } = t, cells = cols * rows
  const rho = [0, 1, 2].map(() => new Float32Array(cells)), on = new Uint8Array(cells)
  for (let j = 0, n = 0; j < rows; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < cols; i++, n++) {
      const x = bounds.x + (i + 0.5) * TEXEL, deep = Math.min(1, Math.max(0, (y - crestY[i]) / 40))
      const bent = x + deep * BENT * (fractal(BENT_SEED, x, y, 0.012, 0.03, 2) - 0.5)
      const at = Math.min(cols - 1, Math.max(0, Math.floor((bent - bounds.x) / TEXEL)))
      samplePlaneTexel(t, at, bent, y).rho.forEach((v, m) => { rho[m][n] = v })
      on[n] = y >= crestY[i] - TEXEL && y <= footY[i] + TEXEL ? 1 : 0
    }
  }
  const lab = new Float32Array(cells * 3)
  for (const part of rho) ease(part, cols, rows, Array<number>(rows).fill(GATHER), Array<number>(rows).fill(GATHER * 0.6))
  for (let n = 0; n < cells; n++) {
    const { l, a, b } = labOf([toSrgb(rho[0][n]), toSrgb(rho[1][n]), toSrgb(rho[2][n])])
    lab.set([l, a, b], n * 3)
  }
  const { label, count } = classesOf(lab, on, k)
  const order = [...count.keys()].filter((c) => count[c]).sort((a, b) => count[b] - count[a])
  if (!order.length) order.push(label[0])
  return { on, label: label.map((c) => Math.max(0, order.indexOf(c))), pots: order.map((c) => potOf(t, rho, label, on, c)) }
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
  traceOver(shapes, { cols: t.wPx, rows: t.hPx, at: is }, EDGE, frameOf(t), LEAST)
  return { rho: [sum[0] / count, sum[1] / count, sum[2] / count], count, shapes }
}
