//# allFunctionsCalledOnLoad
import { EARTH_R_KM } from '../../data/terrain/panorama'
import { quadInPolygon, type Bounds, type LocalFrame, type LocalPolygon, type Quad } from './vegPolygon'

const RAD = Math.PI / 180

/** Ray/AABB slab test. The geodesic lies within `pad` of the corresponding straight ray. */
export function rayHitsBounds(b: Bounds, az: number, pad: number): boolean {
  const east = Math.sin(az * RAD), north = Math.cos(az * RAD)
  let lo = 0, hi = Infinity
  for (const [min, max, component] of [[b.minX, b.maxX, east], [b.minY, b.maxY, north]]) {
    if (component === 0) {
      if (min > pad || max < -pad) return false
      continue
    }
    const a = (min - pad) / component, z = (max + pad) / component
    lo = Math.max(lo, Math.min(a, z)); hi = Math.min(hi, Math.max(a, z))
  }
  return lo <= hi
}

export function geodesicPad(frame: LocalFrame, hiKm: number): number | undefined {
  const latitude = frame.lat0 * RAD
  const maxLat = Math.abs(latitude) + hiKm / EARTH_R_KM
  const cosMax = Math.cos(maxLat)
  // The local longitude chart must cover the entire sector without a polar or longitude seam.
  if (maxLat >= Math.PI / 2 || hiKm / (EARTH_R_KM * cosMax) >= Math.PI) return
  // With s = arc length / R, the sphere's geodesic equations give
  // |lat''(s)| <= tan(maxLat) and |lon''(s)| <= tan(maxLat) / cos(maxLat).
  // https://cft.fis.uc.pt/eef/transformations.pdf (spherical geodesic equations)
  // Taylor's remainder bounds the distance from the straight, local polar ray. Add 10 µm for roundoff.
  return 1e-8 + hiKm ** 2 / (2 * EARTH_R_KM) * Math.tan(maxLat)
    * Math.hypot(1, Math.cos(latitude) / cosMax)
}

/** Bound the great-circle sector in the crop polygon's affine lon/lat coordinate system. */
export function testSector(
  frame: LocalFrame, azA: number, azB: number, loKm: number, hiKm: number, test: (quad: Quad) => boolean,
): boolean | undefined {
  const pad = geodesicPad(frame, hiKm)
  if (pad === undefined) return
  const azLo = Math.min(azA, azB) * RAD
  const span = Math.abs(azB - azA) * RAD
  // At most 30° per trapezoid caps the outward overreach of a tangent at sec(15°) − 1.
  const steps = Math.max(1, Math.ceil(span / (30 * RAD)))
  const half = span / (2 * steps), cosHalf = Math.cos(half), sinHalf = Math.sin(half)
  const inner = loKm * cosHalf - pad, outer = hiKm + pad
  const innerSide = (inner * sinHalf + pad) / cosHalf, outerSide = (outer * sinHalf + pad) / cosHalf
  for (let step = 0; step < steps; step++) {
    const mid = azLo + (2 * step + 1) * half
    const east = Math.sin(mid), north = Math.cos(mid)
    const xy = (forward: number, right: number): [number, number] =>
      [forward * east + right * north, forward * north - right * east]
    if (!test([xy(inner, -innerSide), xy(inner, innerSide), xy(outer, outerSide), xy(outer, -outerSide)])) return false
  }
  return true
}

export function sectorInPolygon(
  frame: LocalFrame, crop: LocalPolygon, azA: number, azB: number, loKm: number, hiKm: number,
): boolean {
  return testSector(frame, azA, azB, loKm, hiKm, (quad) => quadInPolygon(crop, quad)) ?? false
}
