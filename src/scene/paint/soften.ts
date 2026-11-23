/*
 * The sheet's soft hand: a separable box blur, run twice per axis (close to a Gaussian), over a premultiplied RGBA grid.
 * Each row has its own radius (in cells, fractional), so the softening shrinks with perspective toward the horizon.
 * The field says where the cloud is and how thick; this draws it as soft masses, not texel edges (the owner's call).
 * Pure: the same grid and radii give the same pixels.
 */
export function soften(buf: Float32Array, cols: number, rows: number, rx: readonly number[], ry: readonly number[]) {
  const sums = new Float64Array((Math.max(cols, rows) + 1) * 4)
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < rows; r++) if (rx[r] > 0) boxLine(buf, sums, r * cols * 4, 4, cols, () => rx[r])
    for (let c = 0; c < cols; c++) boxLine(buf, sums, c * 4, cols * 4, rows, (i) => ry[i])
  }
}

/**
 * One line of `n` RGBA cells from `start`, `stride` floats apart: each cell becomes the mean over ±radius(i) cells, the
 * outermost pair weighted by the radius's fraction (no seams where it changes), with the line's ends held (no dark rim).
 */
function boxLine(buf: Float32Array, sums: Float64Array, start: number, stride: number, n: number,
  radius: (i: number) => number) {
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < n; i++) sums[(i + 1) * 4 + k] = sums[i * 4 + k] + buf[start + i * stride + k]
    const first = sums[4 + k], last = sums[n * 4 + k] - sums[(n - 1) * 4 + k]
    // The sum over the cells before `j`, the line extended by its end values on both sides.
    const before = (j: number) => j <= 0 ? j * first : j >= n ? sums[n * 4 + k] + (j - n) * last : sums[j * 4 + k]
    const cell = (j: number) => before(j + 1) - before(j)
    for (let i = 0; i < n; i++) {
      const r = Math.max(0, radius(i)), whole = Math.floor(r), part = r - whole
      const inner = before(i + whole + 1) - before(i - whole)
      buf[start + i * stride + k] = (inner + part * (cell(i - whole - 1) + cell(i + whole + 1))) / (2 * r + 1)
    }
  }
}
