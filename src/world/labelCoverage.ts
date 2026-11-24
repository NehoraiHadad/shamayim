import type { Box } from './layout'

/** Outward rounding covers every cell with positive-area intersection. */
export function coverageRaster(region: Box) {
  const x = Math.floor(region.left), y = Math.floor(region.top)
  const width = Math.ceil(region.right) - x
  const height = Math.ceil(region.bottom) - y
  const stride = width + 1
  const sums = new Float64Array(stride * (height + 1))
  let occupied = false, weighted = false
  return {
    fill(box: Box, weight = 1) {
      if (box.right <= box.left || box.bottom <= box.top) return
      const left = Math.max(0, Math.floor(box.left) - x)
      const right = Math.min(width, Math.ceil(box.right) - x)
      if (left >= right) return
      const top = Math.max(0, Math.floor(box.top) - y)
      const bottom = Math.min(height, Math.ceil(box.bottom) - y)
      if (top >= bottom) return
      occupied = true
      weighted ||= weight !== 1
      for (let row = top; row < bottom; row++) {
        const start = (row + 1) * stride + 1
        if (!weighted) sums.fill(1, start + left, start + right)
        else for (let i = start + left; i < start + right; i++) sums[i] = Math.max(sums[i], weight)
      }
    },
    integrate(covered?: Float64Array) {
      if (!occupied) return
      for (let row = stride; row < sums.length; row += stride) {
        let total = 0
        for (let i = row + 1; i < row + stride; i++) {
          total += covered?.[i] ? 0 : sums[i]
          sums[i] = total + sums[i - stride]
        }
      }
    },
    cells: sums,
    left: (edge: number) => Math.floor(edge) - x,
    right: (edge: number) => Math.ceil(edge) - x,
    top: (edge: number) => (Math.floor(edge) - y) * stride,
    bottom: (edge: number) => (Math.ceil(edge) - y) * stride,
    area(left: number, right: number, top: number, bottom: number) {
      return sums[bottom + right] - sums[bottom + left] - sums[top + right] + sums[top + left]
    },
  }
}
