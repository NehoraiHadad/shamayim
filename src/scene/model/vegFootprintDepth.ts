import type { FacePoint } from '../../world/face'
import { FACE_EPSILON, fallbackFaceKm, measuredFaceAt } from './faceProjection'

interface DepthBounds {
  crestLo: number; crestHi: number; footLo: number; footHi: number
  kmLo: number; kmHi: number; points: readonly FacePoint[]
  crests: readonly number[]; regular: boolean; sharedY: number; lastY: number
}
export type Depth = [lo: number, hi: number]

function firstAtOrBelow(points: readonly FacePoint[], y: number): number {
  let lo = 0, hi = points.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].y < y) lo = mid + 1
    else hi = mid
  }
  return lo
}

function regularKm(points: readonly FacePoint[], i: number, crestKm: number, crestY: number, y: number): number {
  if (y <= crestY + FACE_EPSILON) return crestKm
  const previous = points[i - 1]
  const usesKnot = previous && previous.y > crestY + FACE_EPSILON
  const prevKm = usesKnot ? previous.km : crestKm
  if (i === points.length) return prevKm
  const prevY = usesKnot ? previous.y : crestY
  const next = points[i]
  return prevKm + (next.km - prevKm) * ((y - prevY) / (next.y - prevY))
}

/** Bounds a rectangle's radial distance on one strip, including profile and interpolation discontinuities. */
export function distanceRange(s: DepthBounds, name: 'near' | 'far', top: number, bottom: number): Depth {
  if (!s.points.length) {
    if (bottom <= s.crestLo + FACE_EPSILON) return [s.kmLo, s.kmHi]
    const fraction = (y: number, crest: number, foot: number) => Math.max(0, Math.min(1, (y - crest) / Math.max(1, foot - crest)))
    const lo = fallbackFaceKm(name, s.kmLo, fraction(bottom, s.crestLo, s.footLo))
    const hi = fallbackFaceKm(name, s.kmHi, fraction(top, s.crestHi, s.footHi))
    return top <= s.crestHi + FACE_EPSILON ? [Math.min(lo, s.kmLo), Math.max(hi, s.kmHi)] : [lo, hi]
  }
  const { crestLo, crestHi, kmLo, kmHi, points } = s
  if (top > s.lastY) return [points.at(-1)!.km, points.at(-1)!.km]
  const topIndex = s.regular ? firstAtOrBelow(points, top) : 0
  const bottomIndex = s.regular ? firstAtOrBelow(points, bottom) : 0
  const kmAt = s.regular
    ? (km: number, crest: number, y: number, index: number) => regularKm(points, index, km, crest, y)
    : (km: number, crest: number, y: number) => measuredFaceAt(points, km, crest, y).km
  let min = Infinity, max = -Infinity
  const include = (crest: number) => {
    // For fixed crest, depth is linear between DEM knots. Within each crest branch the first segment's
    // interpolation is monotone in crest y and crest distance, which are bounded independently above.
    min = Math.min(min, kmAt(kmLo, crest, top, topIndex), kmAt(kmLo, crest, bottom, bottomIndex))
    max = Math.max(max, kmAt(kmHi, crest, top, topIndex), kmAt(kmHi, crest, bottom, bottomIndex))
    if (top <= crest + FACE_EPSILON && bottom > crest + FACE_EPSILON) {
      min = Math.min(min, kmLo)
      max = Math.max(max, kmHi)
    }
  }
  // Below the first shared knot, every possible crest follows the same measured segments.
  if (top > s.sharedY) include(crestLo)
  else {
    for (const crest of s.crests) include(crest)
    for (const y of [top, bottom]) {
      const skip = y - FACE_EPSILON
      if (skip >= crestLo && skip <= crestHi) { include(skip); include(Math.max(crestLo, skip - 1e-9)) }
    }
  }
  for (let i = topIndex; i < points.length; i++) {
    const p = points[i]
    if (s.regular && p.y > bottom) break
    if (p.y >= top && p.y <= bottom && p.y > crestLo + FACE_EPSILON) {
      min = Math.min(min, p.km)
      max = Math.max(max, p.km)
    }
  }
  return [min, max]
}

export function profileBounds(points: readonly FacePoint[], crestLo: number, crestHi: number) {
  const crests = [crestLo, crestHi]
  let regular = true, sharedY = Infinity
  for (let i = 0; i < points.length; i++) {
    const y = points[i].y, skip = y - FACE_EPSILON
    if (skip >= crestLo && skip <= crestHi) crests.push(skip, Math.max(crestLo, skip - 1e-9))
    if (y > crestHi + FACE_EPSILON) sharedY = Math.min(sharedY, y)
    if (i > 0 && y <= points[i - 1].y + FACE_EPSILON) regular = false
  }
  // The fast path needs all knots after the first shared one to survive the epsilon check.
  return { crests, regular, sharedY: regular ? sharedY : Infinity,
    lastY: regular && sharedY < Infinity ? points.at(-1)!.y : Infinity }
}
