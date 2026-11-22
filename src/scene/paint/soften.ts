/*
 * The sheet's soft hand: a separable box blur, run twice per axis (close to a Gaussian), over a premultiplied RGBA
 * grid. The field says where the cloud is and how thick; this says how it is drawn, as soft masses the eye rests on,
 * not texel edges (the owner's call, 22 Nov: the first WebGL sky's gentle veils over physically exact stair-steps).
 * Pure: the same grid and radii give the same pixels.
 */
export function soften(buf: Float32Array, cols: number, rows: number, rx: number, ry: number): void {
  const line = new Float32Array(Math.max(cols, rows) * 4)
  for (let pass = 0; pass < 2; pass++) {
    if (rx > 0) for (let r = 0; r < rows; r++) boxLine(buf, line, r * cols * 4, 4, cols, rx)
    if (ry > 0) for (let c = 0; c < cols; c++) boxLine(buf, line, c * 4, cols * 4, rows, ry)
  }
}

/** One line of `n` RGBA cells from `start`, `stride` floats apart, averaged over ±r with the ends held (no dark rim). */
function boxLine(buf: Float32Array, line: Float32Array, start: number, stride: number, n: number, r: number): void {
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) line[i * 4 + k] = buf[start + i * stride + k]
  const w = 2 * r + 1
  for (let k = 0; k < 4; k++) {
    const at = (i: number) => line[Math.min(n - 1, Math.max(0, i)) * 4 + k]
    let sum = 0
    for (let i = -r; i <= r; i++) sum += at(i)
    for (let i = 0; i < n; i++) {
      buf[start + i * stride + k] = sum / w
      sum += at(i + r + 1) - at(i - r)
    }
  }
}
