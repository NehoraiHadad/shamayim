/** Interpolate sorted rows, extending the edge values. Use a moving row for increasing queries. */
export function rowValues(ys: readonly number[], values: readonly number[], fallback = 0) {
  let row = 0
  return (y: number): number => {
    if (ys.length < 2) return values[0] ?? fallback
    while (row > 0 && ys[row] > y) row--
    while (row + 2 < ys.length && ys[row + 1] < y) row++
    const h = ys[row + 1] - ys[row]
    const t = h > 0 ? Math.min(1, Math.max(0, (y - ys[row]) / h)) : 0
    return values[row] + (values[row + 1] - values[row]) * t
  }
}
