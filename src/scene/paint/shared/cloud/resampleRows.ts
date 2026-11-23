/** Px between the even rows a sheet's uneven ones are resampled to. */
export const ROW = 2

/** The texel grid on `out` even rows from `ys[0]` to its last row, and each output row's source row spacing (px). */
export function resampleRows(texels: number[][], cols: number, ys: readonly number[], out: number) {
  const y0 = ys[0], span = ys[ys.length - 1] - y0
  const buf = new Float32Array(cols * out * 4)
  const spacing: number[] = []
  let r = 0
  for (let k = 0; k < out; k++) {
    const y = y0 + (k * span) / (out - 1)
    while (r + 2 < ys.length && ys[r + 1] < y) r++
    const h = spacing[k] = ys[r + 1] - ys[r]
    const t = h > 0 ? Math.min(1, Math.max(0, (y - ys[r]) / h)) : 0
    for (let c = 0; c < cols; c++) {
      const a = texels[r * cols + c], b = texels[(r + 1) * cols + c]
      for (let i = 0; i < 4; i++) buf[(k * cols + c) * 4 + i] = a[i] + (b[i] - a[i]) * t
    }
  }
  return { buf, spacing }
}
