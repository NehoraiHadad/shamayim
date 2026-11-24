import { smoothstep } from '../../../domain/smoothstep'
import type { Grid } from './kit/contour'
import { distances } from './kit/distance'
import { ease } from './kit/ease'
import { farRows } from './sheetFar'
import { fieldAt, type SheetField } from './sheetField'

/*
 * Where a broken sheet is cut: the model's alpha eased over its own rows, and far off low arches over level feet. Pure: the
 * field and the seed.
 */

/** Sky px per grid cell; the alpha an edge is cut at, near and far. */
const CELL = 4, EDGE = 0.36, FAR_EDGE = 0.56
/** How far the model's rows are eased into each other (against their spacing), and wider, for what is round a place. */
const EASED = 0.2, WIDE = 1.6
/** A row this far apart (px) is near; how much a far cloud is cut back from the next, from this far off its middle. */
const NEAR = 14, PARTED = 0.8, MIDDLE = 0.45
/** Nearer to 0 than the first, the sheet is all rows of arches; over the second none of it. */
const ROWS = [0.14, 0.3] as const

/** The eased cloud, on the field's grid. */
export interface Eased { f: SheetField; alpha: Float32Array; wide: Float32Array }

/** The cut: over 0 inside, with each cell's place in its mass; and at (x, y) px how far in from the edge it is (px), and that place. */
export interface Cut { edge: Grid; side: Float32Array; inside: (x: number, y: number) => number; sideAt: (x: number, y: number) => number }

export function easedField(f: SheetField): Eased {
  const alpha = Float32Array.from(f.alpha), wide = Float32Array.from(f.alpha), colPx = f.width / (f.cols - 1), rowPx = f.height / (f.rows - 1)
  for (const [grid, by] of [[alpha, EASED], [wide, WIDE]] as const) ease(grid, f.cols, f.rows, f.spacing.map((s) => (1.4 * by * s) / colPx), f.spacing.map((s) => (by * s) / rowPx))
  return { f, alpha, wide }
}

/** How near a row is (0 far … 1). */
export const nearAt = (f: SheetField, gy: number) => Math.min(1, f.spacing[Math.min(f.rows - 1, Math.max(0, Math.round(gy)))] / NEAR)

export function cutOf({ f, alpha }: Eased, seed: number): Cut {
  const cols = Math.ceil(f.width / CELL) + 1, rows = Math.ceil(f.height / CELL) + 1, edge: Grid = { cols, rows, at: new Float32Array(cols * rows) }
  const side = new Float32Array(cols * rows), sx = f.width / (cols - 1), sy = f.height / (rows - 1)
  const top = (Math.max(0, f.spacing.findIndex((s) => s < ROWS[1] * NEAR)) / (f.rows - 1)) * f.height, far = farRows(f, alpha, top, seed)
  for (let j = 0, n = 0; j < rows; j++) {
    const gy = (j * (f.rows - 1)) / (rows - 1), near = nearAt(f, gy), arched = 1 - smoothstep(ROWS[0], ROWS[1], near)
    const level = EDGE + (FAR_EDGE - EDGE) * (1 - near), parted = PARTED * (1 - near)
    for (let i = 0; i < cols; i++, n++) {
      const gx = (i * (f.cols - 1)) / (cols - 1)
      side[n] = fieldAt(f.side, f.cols, f.rows, gx, gy)
      edge.at[n] = fieldAt(alpha, f.cols, f.rows, gx, gy) - level - parted * Math.max(0, Math.abs(side[n]) - MIDDLE)
      if (!arched) continue
      const arch = far(i * sx, j * sy)
      edge.at[n] += arched * (arch.edge - edge.at[n])
      side[n] += arched * (arch.side - side[n])
    }
  }
  const d = distances(edge), px = (sx + sy) / 2, within = (v: number, most: number) => Math.max(0, Math.min(most, v))
  const read = (grid: Float32Array, x: number, y: number) => fieldAt(grid, cols, rows, within((x - f.x0) / sx, cols - 1), within((y - f.y0) / sy, rows - 1))
  return { edge, side, inside: (x, y) => px * read(d.at, x, y), sideAt: (x, y) => read(side, x, y) }
}
