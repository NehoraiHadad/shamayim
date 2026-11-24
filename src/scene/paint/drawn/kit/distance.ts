import type { Grid } from './contour'

/* How far in from its edge each place of a cut grid lies (over 0 inside), in cells; the frame is no edge. Pure. */

const DIAG = Math.SQRT2, FAR = 1e4

/** Beside the edge the distance is read off where it crosses the grid, so that it moves as smoothly as the cut does. */
export function distances(grid: Grid): Grid {
  const { cols, rows, at } = grid, d = new Float32Array(cols * rows)
  const crossing = (n: number, to: number) => (at[n] > 0 === at[to] > 0 ? FAR : at[n] / (at[n] - at[to]))
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const x = Math.min(i ? crossing(n, n - 1) : FAR, i < cols - 1 ? crossing(n, n + 1) : FAR)
    const y = Math.min(j ? crossing(n, n - cols) : FAR, j < rows - 1 ? crossing(n, n + cols) : FAR)
    d[n] = x && y ? (x * y) / Math.sqrt(x * x + y * y) : 0
  }
  for (const by of [1, -1]) pass(grid, d, by)
  return { ...grid, at: d.map((v, n) => (at[n] > 0 ? v : -v)) }
}

/** Each cell's distance from those of its neighbours already passed, on its own side of the edge. */
function pass({ cols, rows, at }: Grid, d: Float32Array, by: number) {
  const [i0, i1] = by > 0 ? [0, cols - 1] : [cols - 1, 0]
  for (let k = 0, n = by > 0 ? 0 : rows * cols - 1; k < rows; k++) {
    for (let i = i0; ; i += by, n += by) {
      const side = at[n] > 0, back = n - by * cols
      let v = d[n]
      if (i !== i0 && at[n - by] > 0 === side) v = Math.min(v, d[n - by] + 1)
      if (k) {
        if (at[back] > 0 === side) v = Math.min(v, d[back] + 1)
        if (i !== i0 && at[back - by] > 0 === side) v = Math.min(v, d[back - by] + DIAG)
        if (i !== i1 && at[back + by] > 0 === side) v = Math.min(v, d[back + by] + DIAG)
      }
      d[n] = v
      if (i === i1) break
    }
    n += by
  }
}
