import type { Pt } from './types'

/** The ridge's crest height (m) at x (px at 375), linearly between its points; NaN where not known. */
export function ridgeHeightAt(points: readonly Pt[], heights: readonly number[] | undefined): (x: number) => number {
  return (x) => {
    if (!heights?.length || !points.length) return Number.NaN
    const i = points.findIndex(([px]) => px >= x)
    if (i <= 0) return heights[i < 0 ? heights.length - 1 : 0]
    const t = (x - points[i - 1][0]) / (points[i][0] - points[i - 1][0])
    return heights[i - 1] + t * (heights[i] - heights[i - 1])
  }
}
