import type { Box, Pt } from './types'

export const TEXEL = 3
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Samples a left-to-right monotonic polyline at each texel column x. */
function samplePolylineY(pts: readonly Pt[], bounds: Box, cols: number, fallback: number): Float32Array {
  const ys = new Float32Array(cols).fill(fallback)
  if (pts.length < 2) return ys
  let seg = 0
  for (let i = 0; i < cols; i++) {
    const x = bounds.x + (i + 0.5) * TEXEL
    while (seg < pts.length - 2 && pts[seg + 1][0] < x) seg++
    const [ax, ay] = pts[seg], [bx, by] = pts[seg + 1]
    const t = clamp((x - ax) / Math.max(1e-6, bx - ax), 0, 1)
    ys[i] = ay + (by - ay) * t
  }
  return ys
}

/** Extracts both upper crest y and local lower foot y per texel column from a plane's closed outline. */
export function outlineBandY(outline: readonly Pt[], bounds: Box, cols: number): { crestY: Float32Array; footY: Float32Array } {
  const bottom = bounds.y + bounds.h
  if (outline.length < 2) return { crestY: new Float32Array(cols).fill(bounds.y), footY: new Float32Array(cols).fill(bottom) }
  // The plane outline runs strictly left -> right along the ridge, then returns right -> left along the local foot.
  let ridgeEnd = outline.length - 1
  for (let i = 1; i < outline.length; i++) {
    if (outline[i][0] <= outline[i - 1][0] + 1e-6) { ridgeEnd = i - 1; break }
  }
  const crestY = samplePolylineY(outline.slice(0, Math.max(2, ridgeEnd + 1)), bounds, cols, bounds.y)
  const lower = outline.slice(ridgeEnd + 1).reverse()
  const footY = lower.length >= 2 && lower.every((p, i) => i === 0 || p[0] >= lower[i - 1][0] - 1e-6)
    ? samplePolylineY(lower, bounds, cols, bottom)
    : new Float32Array(cols).fill(bottom)
  return { crestY, footY }
}

