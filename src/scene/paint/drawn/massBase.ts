import { soften } from '../soften'
import type { Grid, MassForm } from './massForm'

/*
 * A cumulus stands on a flat, firm base: where the model's cells end in a round foot, the drawn mass is cut across it. The
 * cut is a share of the mass's own thickness, so it never takes a whole cloud, and it only ever takes. Pure: the form alone.
 */

/** How much of a mass's thickness its base cuts; the least height (px) of a mass cut; how far across (thicknesses) one base goes; the
 *  most thickness (px) a base is drawn for: a deck's underside is no one base. */
const CUT = 0.5, HEIGHT_MIN = 3, REACH = 1.2, THICK_MAX = 45
/** How far up (px) a base is told, how far under it, and what its columns are eased over (px). */
const UP = 40, UNDER = 24, EASE = 4

/** One column's part of a mass: its rows, its thickness, and the row its base stands at. */
interface Post { top: number; foot: number; thick: number; base: number }

/** How far (px) each cell stands over its mass's flat base, cut as far as `flat` (0…1 a row) says it is seen from the side. */
export function overBases(form: MassForm, grid: Grid, flat: readonly number[]): Float32Array {
  const { cols, rowPx } = grid
  const posts = Array.from({ length: cols }, (_, c) => column(form, grid, c))
  const near = (c: number, own: Post, reach: number) => {
    const found: Post[] = []
    for (let i = Math.max(0, c - reach); i <= Math.min(cols - 1, c + reach); i++) {
      for (const p of posts[i]) if (p.top < own.foot && p.foot > own.top && Math.abs(p.foot - own.foot) * rowPx < 1.5 * Math.max(p.thick, own.thick)) found.push(p)
    }
    return found
  }
  const reachOf = (thick: number) => Math.max(1, Math.round((REACH * thick) / grid.colPx))
  posts.forEach((own, c) => {
    for (const p of own) {
      const around = near(c, p, reachOf(p.thick)), thick = Math.max(...around.map((q) => q.thick))
      // What runs on past the sheet's far edge stands on no base of its own.
      p.base = p.foot === grid.rows - 1 ? p.foot + UP / rowPx : Math.max(...around.map((q) => q.foot)) - (CUT * thick * flat[p.foot]) / rowPx
    }
  })
  const told = new Float32Array(form.depth.length * 4)
  posts.forEach((own, c) => {
    for (const p of own) {
      const around = near(c, p, Math.max(1, reachOf(p.thick) >> 1))
      const base = around.reduce((sum, q) => sum + q.base, 0) / around.length
      const last = Math.min(grid.rows - 1, p.foot + Math.round(UNDER / rowPx))
      for (let r = p.top; r <= last && (r <= p.foot || form.depth[r * cols + c] <= 0); r++) {
        told[(r * cols + c) * 4] = Math.min(UP, (base - r) * rowPx)
        told[(r * cols + c) * 4 + 1] = 1
      }
    }
  })
  soften(told, cols, grid.rows, flat.map(() => EASE / grid.colPx), flat.map(() => EASE / rowPx))
  return form.depth.map((_, n) => (told[n * 4 + 1] > 1e-3 ? told[n * 4] / told[n * 4 + 1] : UP))
}

/** A column's masses, the tall enough ones. */
function column({ depth, thick }: MassForm, { cols, rows, rowPx }: Grid, c: number): Post[] {
  const found: Post[] = []
  for (let r = 0, run: Post | null = null; r < rows; r++) {
    const n = r * cols + c
    if (depth[n] <= 0) { run = null; continue }
    if (!run) found.push(run = { top: r, foot: r, thick: 0, base: r })
    run.foot = r
    run.thick = Math.min(THICK_MAX, Math.max(run.thick, thick[n]))
  }
  return found.filter((p) => (p.foot - p.top) * rowPx >= HEIGHT_MIN)
}
