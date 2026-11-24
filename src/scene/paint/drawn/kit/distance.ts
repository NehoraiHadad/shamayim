import type { Grid } from './contour'

/* How far each place of a cut grid lies from its edge (over 0 inside), in cells; the frame is no edge. Pure. */

const DIAG = Math.SQRT2, FAR = 1e4

export function distances(grid: Grid): Grid {
  const inside = toEdge(grid, 1), outside = toEdge(grid, -1)
  return { ...grid, at: inside.map((d, n) => (d ? d - 0.5 : 0.5 - outside[n])) }
}

/** Each cell's distance to the other side of the edge, 0 over there: two passes over its neighbours. */
function toEdge({ cols, rows, at }: Grid, sign: number): Float32Array {
  const d = Float32Array.from(at, (v) => ((v > 0) === (sign > 0) ? FAR : 0))
  for (const by of [1, -1]) {
    for (let q = 0; q < rows * cols; q++) {
      const n = by > 0 ? q : rows * cols - 1 - q, i = n % cols, j = (n - i) / cols
      if (!d[n]) continue
      const was = i - by >= 0 && i - by < cols, will = i + by >= 0 && i + by < cols
      let v = was ? Math.min(d[n], d[n - by] + 1) : d[n]
      if (j - by >= 0 && j - by < rows) {
        const back = n - by * cols
        v = Math.min(v, d[back] + 1)
        if (was) v = Math.min(v, d[back - by] + DIAG)
        if (will) v = Math.min(v, d[back + by] + DIAG)
      }
      d[n] = v
    }
  }
  return d
}
