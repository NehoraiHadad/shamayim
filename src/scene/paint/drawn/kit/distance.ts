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
    const [i0, i1] = by > 0 ? [0, cols - 1] : [cols - 1, 0]
    for (let k = 0, n = by > 0 ? 0 : rows * cols - 1; k < rows; k++) {
      for (let i = i0; ; i += by, n += by) {
        let v = d[n]
        if (v) {
          const back = n - by * cols
          if (i !== i0) v = Math.min(v, d[n - by] + 1)
          if (k) {
            v = Math.min(v, d[back] + 1)
            if (i !== i0) v = Math.min(v, d[back - by] + DIAG)
            if (i !== i1) v = Math.min(v, d[back + by] + DIAG)
          }
          d[n] = v
        }
        if (i === i1) break
      }
      n += by
    }
  }
  return d
}
