/*
 * The shape of a sheet's masses, read off the model's own coverage: how deep inside its mass each point lies (px from the
 * nearest gap, below 0 in the gap) and how thick that mass is there. A hand that carves by a share of the thickness can
 * draw heads and a flat base into a mass of any size without closing a gap or losing a cloud. Pure: the grid alone.
 */

import { smoothstep } from '../../../domain/smoothstep'
import { soften } from '../soften'

/** The share of the thickest cloud near by at which a part is cloud, and the least alpha that is any. */
const EDGE = 0.4, FAINT = 0.05
/** How near that thickest cloud is looked for (px), across and down. */
const NEAR_X = 6, NEAR_Y = 4
/** How fast a mass's thickness falls off away from its middle (per px). */
const FALL = 0.5
/** How far (px) the rounded outline may stand outside the model's edge, and the share of its depth a far, thin part keeps,
 *  over these roundings (px): a cloudlet at the horizon is never rounded away. */
const OUT = 0.5, KEEP = 0.6, KEEP_FROM = 1.9, KEEP_FULL = 1.25

export interface Grid { cols: number; rows: number; colPx: number; rowPx: number }
export interface MassForm { depth: Float32Array; thick: Float32Array }

/** The form of the masses of `alpha`, their corners rounded over `round` px (a row). */
export function massForm(alpha: Float32Array, grid: Grid, round: readonly number[]): MassForm {
  const over = overEdge(alpha, grid)
  const inner = distance(over, grid, 1), outer = distance(over, grid, -1)
  const sharp = inner.map((d, n) => d - outer[n])
  const keep = round.map((px) => KEEP * smoothstep(KEEP_FROM, KEEP_FULL, px))
  const depth = eased(sharp, grid, round).map((d, n) => {
    const kept = keep[Math.floor(n / grid.cols)]
    return Math.max(kept > 0 && sharp[n] > 0 ? kept * sharp[n] : -Infinity, Math.min(d, sharp[n] + OUT))
  })
  const thick = depth.map((d) => Math.max(0, d)), diagonal = Math.hypot(grid.colPx, grid.rowPx)
  for (let k = 0; k < 2; k++) {
    sweep(grid, diagonal, (n) => depth[n] > 0, (n, from, px) => { if (thick[from] - FALL * px > thick[n]) thick[n] = thick[from] - FALL * px })
  }
  return { depth, thick }
}

/** How far (px) each cell on the given side of the edge lies from it, 0 on the other. */
function distance(over: Float32Array, grid: Grid, side: 1 | -1): Float32Array {
  const { cols, rows, colPx, rowPx } = grid, far = cols * colPx
  const steps = [[1, 0, colPx], [-1, 0, colPx], [0, 1, rowPx], [0, -1, rowPx]] as const
  const inside = (n: number) => over[n] > 0 === side > 0
  const d = over.map((own, n) => {
    if (!inside(n)) return 0
    const c = n % cols, r = (n - c) / cols
    let least = far
    for (const [i, j, px] of steps) {
      if (c + i < 0 || c + i >= cols || r + j < 0 || r + j >= rows) continue
      const other = over[n + i + j * cols]
      if (other > 0 !== own > 0) least = Math.min(least, (own / (own - other)) * px)
    }
    return least
  })
  sweep(grid, Math.hypot(colPx, rowPx), inside, (n, from, px) => { if (d[from] + px < d[n]) d[n] = d[from] + px })
  return d
}

/** A grid of distances eased over `round` px (a row): its corners and horns go, the masses' edges stay where they are. */
function eased(sharp: Float32Array, { cols, rows, colPx, rowPx }: Grid, round: readonly number[]): Float32Array {
  const buf = new Float32Array(sharp.length * 4)
  for (let n = 0; n < sharp.length; n++) buf[n * 4] = sharp[n]
  soften(buf, cols, rows, round.map((r) => r / colPx), round.map((r) => r / rowPx))
  return sharp.map((_, n) => buf[n * 4])
}

/** Each cell's alpha over its mass's edge: against the thickest cloud near by, so a thin veil's edge is its own. */
function overEdge(alpha: Float32Array, { cols, rows, colPx, rowPx }: Grid): Float32Array {
  const across = Math.max(1, Math.round(NEAR_X / colPx)), down = Math.max(1, Math.round(NEAR_Y / rowPx))
  const wide = alpha.map((_, n) => {
    const c = n % cols
    let most = 0
    for (let i = Math.max(0, c - across); i <= Math.min(cols - 1, c + across); i++) most = Math.max(most, alpha[n - c + i])
    return most
  })
  return alpha.map((a, n) => {
    const r = Math.floor(n / cols)
    let most = 0
    for (let j = Math.max(0, r - down); j <= Math.min(rows - 1, r + down); j++) most = Math.max(most, wide[(j - r) * cols + n])
    return a - Math.max(FAINT, EDGE * most)
  })
}

/** Both ways over the grid, each inside cell offered its four neighbours already seen, and how far they are. */
function sweep({ cols, rows, colPx, rowPx }: Grid, diagonal: number, inside: (n: number) => boolean,
  each: (n: number, from: number, px: number) => void) {
  for (const way of [1, -1]) {
    for (let k = 0; k < cols * rows; k++) {
      const n = way > 0 ? k : cols * rows - 1 - k
      if (!inside(n)) continue
      const c = n % cols, r = (n - c) / cols
      const offer = (i: number, j: number, px: number) => {
        if (c + i < 0 || c + i >= cols || r + j < 0 || r + j >= rows) return
        const from = n + i + j * cols
        if (inside(from)) each(n, from, px)
      }
      offer(-way, 0, colPx)
      offer(0, -way, rowPx)
      offer(-way, -way, diagonal)
      offer(way, -way, diagonal)
    }
  }
}

