import { fromUtm, toUtm } from './utm'

/**
 * Exact polygon-rectangle overlap geometry for cross-UTM-zone Sentinel-2 pixel aggregation.
 * Projects a source pixel's 4 corners into the target UTM CRS and computes its exact intersection
 * area with each target cell via Sutherland-Hodgman clipping, preserving rotation and scale change.
 */
export type Pt2 = readonly [number, number]

function clipHalfPlane(
  poly: Pt2[], inside: (p: Pt2) => boolean, intersect: (a: Pt2, b: Pt2) => Pt2,
): Pt2[] {
  const out: Pt2[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const inA = inside(a), inB = inside(b)
    if (inB) {
      if (!inA) out.push(intersect(a, b))
      out.push(b)
    } else if (inA) {
      out.push(intersect(a, b))
    }
  }
  return out
}

const lerpX = (a: Pt2, b: Pt2, x: number): Pt2 => [x, a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]
const lerpY = (a: Pt2, b: Pt2, y: number): Pt2 => [a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y]

/** Exact intersection area (m²) between a convex polygon and axis-aligned box `[minE, maxE] × [minN, maxN]`. */
export function quadRectOverlapArea(
  quad: Pt2[], minE: number, maxE: number, minN: number, maxN: number,
): number {
  let p = clipHalfPlane(quad, (v) => v[0] >= minE, (a, b) => lerpX(a, b, minE))
  if (p.length < 3) return 0
  p = clipHalfPlane(p, (v) => v[0] <= maxE, (a, b) => lerpX(a, b, maxE))
  if (p.length < 3) return 0
  p = clipHalfPlane(p, (v) => v[1] >= minN, (a, b) => lerpY(a, b, minN))
  if (p.length < 3) return 0
  p = clipHalfPlane(p, (v) => v[1] <= maxN, (a, b) => lerpY(a, b, maxN))
  if (p.length < 3) return 0
  let sum = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    sum += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(sum) * 0.5
}

/** Projects a source UTM pixel's 4 corners into the target UTM CRS. */
export function projectPixelQuad(
  e0: number, n0: number, e1: number, n1: number,
  fromZone: number, fromSouth: boolean, toZone: number, toSouth: boolean,
): Pt2[] {
  const proj = (e: number, n: number): Pt2 => {
    const ll = fromUtm(e, n, fromZone, fromSouth)
    const m = toUtm(ll.lat, ll.lon, toZone, toSouth)
    return [m.e, m.n]
  }
  return [proj(e0, n0), proj(e1, n0), proj(e1, n1), proj(e0, n1)]
}
