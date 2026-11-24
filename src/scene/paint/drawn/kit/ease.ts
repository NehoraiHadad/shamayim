/*
 * One field eased into itself: a box mean run twice along each axis (close to a Gaussian), each row with its own reach in
 * cells, fractional; the field's ends are held. One channel and no calls a cell: this runs over every sheet at every step of
 * a time drag. Pure: the same field and reaches give the same numbers.
 */
export function ease(buf: Float32Array, cols: number, rows: number, rx: readonly number[], ry: readonly number[]): void {
  const row = new Float64Array(cols + 1), all = new Float64Array((rows + 1) * cols)
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < rows; r++) if (rx[r] > 0) across(buf, row, r * cols, cols, rx[r])
    down(buf, all, cols, rows, ry)
  }
}

/** The sum of a line's cells before `j`, the line held past its ends. */
const before = (sums: Float64Array, n: number, first: number, last: number, j: number): number =>
  j <= 0 ? j * first : j >= n ? sums[n] + (j - n) * last : sums[j]

function across(buf: Float32Array, sums: Float64Array, start: number, n: number, reach: number) {
  const whole = Math.floor(reach), part = reach - whole, per = 1 / (2 * reach + 1), first = buf[start], last = buf[start + n - 1]
  for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + buf[start + i]
  for (let i = 0; i < n; i++) {
    const a = before(sums, n, first, last, i - whole), b = before(sums, n, first, last, i + whole + 1)
    const a1 = before(sums, n, first, last, i - whole - 1), b1 = before(sums, n, first, last, i + whole + 2)
    buf[start + i] = (b - a + part * (a - a1 + b1 - b)) * per
  }
}

/** As `across`, every column at once, row by row. */
function down(buf: Float32Array, sums: Float64Array, cols: number, rows: number, ry: readonly number[]) {
  for (let r = 0, n = 0; r < rows; r++) for (let c = 0; c < cols; c++, n++) sums[n + cols] = sums[n] + buf[n]
  const first = buf.slice(0, cols), last = buf.slice((rows - 1) * cols)
  for (let r = 0; r < rows; r++) {
    const reach = ry[r]
    if (!(reach > 0)) continue
    const whole = Math.floor(reach), part = reach - whole, per = 1 / (2 * reach + 1)
    const js = [r - whole, r + whole + 1, r - whole - 1, r + whole + 2], at = js.map((j) => Math.min(rows, Math.max(0, j)))
    const [a, b, a1, b1] = at.map((j) => j * cols), [pa, pb, pa1, pb1] = js.map((j, k) => j - at[k])
    for (let c = 0, n = r * cols; c < cols; c++, n++) {
      const f = first[c], l = last[c], va = sums[a + c] + pa * f, vb = sums[b + c] + pb * l
      buf[n] = (vb - va + part * (va - (sums[a1 + c] + pa1 * f) + sums[b1 + c] + pb1 * l - vb)) * per
    }
  }
}
