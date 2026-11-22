import type { CropArea, CropRing } from '../../data/landmarks/cropAreas'
import { EARTH_R_KM } from '../../data/terrain/panorama'

const RAD = Math.PI / 180
type Point = readonly [number, number]
export type Quad = readonly [Point, Point, Point, Point]
// Cross products are in km². Include numerical boundary contacts in the rejection.
const CROSS_EPS = 1e-12

export interface Bounds {
  minX: number; minY: number; maxX: number; maxY: number
}

interface LocalRing extends Bounds {
  /** Flat `[x0, y0, x1, y1, ...]` coordinates in km east/north of the observer. */
  coords: Float64Array
}

export const boundsOverlap = (a: Bounds, b: Bounds) =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY

export function quadBounds([[ax, ay], [bx, by], [cx, cy], [dx, dy]]: Quad): Bounds {
  return { minX: Math.min(ax, bx, cx, dx), maxX: Math.max(ax, bx, cx, dx),
    minY: Math.min(ay, by, cy, dy), maxY: Math.max(ay, by, cy, dy) }
}

export interface LocalPolygon {
  kind: CropArea['kind']
  rings: LocalRing[]
}

export interface LocalFrame {
  lat0: number
  lon0: number
  eastKm: number
}

export function localFrame(lat0: number, lon0: number): LocalFrame {
  return { lat0, lon0, eastKm: EARTH_R_KM * RAD * Math.cos(lat0 * RAD) }
}

/** Unwrap locally, then apply an affine scale to the GeoJSON coordinates, preserving straight ring edges. */
export function toLocalKm(frame: LocalFrame, lon: number, lat: number): [number, number] {
  return [((((lon - frame.lon0) % 360) + 540) % 360 - 180) * frame.eastKm, (lat - frame.lat0) * EARTH_R_KM * RAD]
}

function packRing(ring: CropRing, frame: LocalFrame): LocalRing {
  const coords = new Float64Array(ring.length * 2)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = toLocalKm(frame, ...ring[i])
    coords[i * 2] = x
    coords[i * 2 + 1] = y
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { coords, minX, minY, maxX, maxY }
}

export function toLocalPolygon(kind: CropArea['kind'], rings: readonly CropRing[], frame: LocalFrame): LocalPolygon {
  return { kind, rings: rings.map((r) => packRing(r, frame)) }
}

function pointInRingXY(ring: LocalRing, x: number, y: number): boolean {
  if (x < ring.minX || x > ring.maxX || y < ring.minY || y > ring.maxY) return false
  const c = ring.coords
  let inside = false
  for (let i = 2; i < c.length; i += 2) {
    const ax = c[i - 2] - x, ay = c[i - 1] - y, bx = c[i] - x, by = c[i + 1] - y
    if ((ay > 0) !== (by > 0) && ax + (bx - ax) * (-ay / (by - ay)) > 0) inside = !inside
  }
  return inside
}

export function pointInPolygonXY(p: LocalPolygon, x: number, y: number): boolean {
  if (!pointInRingXY(p.rings[0], x, y)) return false
  for (let i = 1; i < p.rings.length; i++) if (pointInRingXY(p.rings[i], x, y)) return false
  return true
}

/** Cyrus–Beck convex clipping (1978), https://doi.org/10.1016/0097-8493(78)90021-3. */
function edgeClipsQuad(quad: Quad, ax: number, ay: number, bx: number, by: number): boolean {
  let enter = 0, exit = 1
  for (let i = 0; i < 4; i++) {
    const [x, y] = quad[i], [nextX, nextY] = quad[(i + 1) % 4]
    const dx = nextX - x, dy = nextY - y
    const a = dx * (ay - y) - dy * (ax - x) + CROSS_EPS
    const b = dx * (by - y) - dy * (bx - x) + CROSS_EPS
    if (a < 0 && b < 0) return false
    if (a < 0) enter = Math.max(enter, a / (a - b))
    else if (b < 0) exit = Math.min(exit, a / (a - b))
    if (enter > exit) return false
  }
  return true
}

/**
 * Strict containment of a CCW quad. Clip every shell and hole edge against the footprint, so even a tiny
 * enclosed hole or concavity rejects it. With no boundary intersection, one vertex determines which region
 * contains the entire connected footprint.
 */
export function quadInPolygon(p: LocalPolygon, quad: Quad): boolean {
  const [[ax, ay]] = quad
  const { minX, minY, maxX, maxY } = quadBounds(quad)
  const outer = p.rings[0]
  if (minX < outer.minX || maxX > outer.maxX || minY < outer.minY || maxY > outer.maxY) return false
  if (!pointInPolygonXY(p, ax, ay)) return false
  for (const { minX: left, maxX: right, minY: bottom, maxY: top, coords: c } of p.rings) {
    if (right < minX || left > maxX || top < minY || bottom > maxY) continue
    for (let i = 2; i < c.length; i += 2) {
      const x0 = c[i - 2], y0 = c[i - 1], x1 = c[i], y1 = c[i + 1]
      if (Math.max(x0, x1) < minX || Math.min(x0, x1) > maxX
        || Math.max(y0, y1) < minY || Math.min(y0, y1) > maxY) continue
      if (edgeClipsQuad(quad, x0, y0, x1, y1)) return false
    }
  }
  return true
}
