import type { Box } from './layout'

// Pack the two backdrop prefix sums into one exact number. Each channel uses
// 20 bits, enough for the entire 520 × 128 scene, even before tether clipping.
const BEYOND_CHANNEL = 2 ** 20
export const fabricArea = (packed: number) => packed % BEYOND_CHANNEL
export const beyondArea = (packed: number) => Math.floor(packed / BEYOND_CHANNEL)

/** Outward rounding includes cells with positive-area intersection. */
export function coverageRaster(region: Box) {
  const x = Math.floor(region.left), y = Math.floor(region.top)
  const width = Math.ceil(region.right) - x
  const height = Math.ceil(region.bottom) - y
  const stride = width + 1
  const sums = new Float64Array(stride * (height + 1))
  let occupied = false, hasBeyond = false

  function fill(box: Box, beyond: boolean) {
    const left = Math.max(0, Math.floor(box.left) - x)
    const right = Math.min(width, Math.ceil(box.right) - x)
    const top = Math.max(0, Math.floor(box.top) - y)
    const bottom = Math.min(height, Math.ceil(box.bottom) - y)
    if (box.right <= box.left || box.bottom <= box.top || left >= right || top >= bottom) return
    occupied = true
    hasBeyond ||= beyond
    for (let row = top; row < bottom; row++) {
      const start = (row + 1) * stride + 1
      if (!beyond) sums.fill(1, start + left, start + right)
      // Own fabric (including fields) covers beyond silhouettes wherever their cells coincide.
      else for (let i = start + left; i < start + right; i++) {
        if (!sums[i]) sums[i] = BEYOND_CHANNEL
      }
    }
  }

  return {
    fill: (box: Box) => fill(box, false),
    fillBeyond: (box: Box) => fill(box, true),
    get hasBeyond() { return hasBeyond },
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
