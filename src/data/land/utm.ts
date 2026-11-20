/**
 * WGS84 latitude/longitude <-> UTM easting/northing (m) for any northern or southern zone.
 * Uses Krüger's 3rd-order transverse Mercator series (Karney 2011; Krüger 1912): accurate to
 * millimetres within a UTM zone. Sentinel-2 L2A granules are tiled natively in UTM (EPSG:32601–32660
 * north, EPSG:32701–32760 south).
 */
const A_WGS84 = 6_378_137
const F_WGS84 = 1 / 298.257223563
const K0 = 0.9996
const N0 = F_WGS84 / (2 - F_WGS84)
const A_MERID = (A_WGS84 / (1 + N0)) * (1 + (N0 * N0) / 4 + N0 ** 4 / 64)
const E_ECC = (2 * Math.sqrt(N0)) / (1 + N0)
const RAD = Math.PI / 180
const SOUTH_FALSE_N = 10_000_000

const ALPHA = [
  N0 / 2 - (2 / 3) * N0 ** 2 + (5 / 16) * N0 ** 3,
  (13 / 48) * N0 ** 2 - (3 / 5) * N0 ** 3,
  (61 / 240) * N0 ** 3,
] as const

const BETA = [
  N0 / 2 - (2 / 3) * N0 ** 2 + (37 / 96) * N0 ** 3,
  (1 / 48) * N0 ** 2 + (1 / 15) * N0 ** 3,
  (17 / 480) * N0 ** 3,
] as const

const DELTA = [
  2 * N0 - (2 / 3) * N0 ** 2 - 2 * N0 ** 3,
  (7 / 3) * N0 ** 2 - (8 / 5) * N0 ** 3,
  (56 / 15) * N0 ** 3,
] as const

/** Home UTM zone (1..60) for a WGS84 longitude in degrees. */
export const utmZoneOf = (lon: number): number =>
  Math.max(1, Math.min(60, Math.floor((lon + 180) / 6) + 1))

/** Projects WGS84 `(lat, lon)` to UTM `(e, n)` metres in `(zone, south)`. */
export function toUtm(lat: number, lon: number, zone: number, south = false): { e: number; n: number } {
  const phi = lat * RAD
  const lambda = (lon - (zone * 6 - 183)) * RAD
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - E_ECC * Math.atanh(E_ECC * Math.sin(phi)))
  const xi = Math.atan2(t, Math.cos(lambda))
  const eta = Math.atanh(Math.sin(lambda) / Math.sqrt(1 + t * t))
  let E = eta
  let N = xi
  for (let j = 1; j <= 3; j++) {
    E += ALPHA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta)
    N += ALPHA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta)
  }
  return { e: 500_000 + K0 * A_MERID * E, n: (south ? SOUTH_FALSE_N : 0) + K0 * A_MERID * N }
}

/** Inverse UTM projection from `(e, n)` metres in `(zone, south)` back to WGS84 `(lat, lon)`. */
export function fromUtm(e: number, n: number, zone: number, south = false): { lat: number; lon: number } {
  const xi = (n - (south ? SOUTH_FALSE_N : 0)) / (K0 * A_MERID)
  const eta = (e - 500_000) / (K0 * A_MERID)
  let xiP = xi
  let etaP = eta
  for (let j = 1; j <= 3; j++) {
    xiP -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta)
    etaP -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta)
  }
  const chi = Math.asin(Math.max(-1, Math.min(1, Math.sin(xiP) / Math.cosh(etaP))))
  let phi = chi
  for (let j = 1; j <= 3; j++) phi += DELTA[j - 1] * Math.sin(2 * j * chi)
  const lon0 = zone * 6 - 183
  const lon = lon0 + Math.atan2(Math.sinh(etaP), Math.cos(xiP)) / RAD
  return { lat: phi / RAD, lon }
}

/** Projects a UTM rectangle `[minE, minN, maxE, maxN]` to its enclosing WGS84 bbox `[minLon, minLat, maxLon, maxLat]`. */
export function utmBoxToWgs84Bbox(
  minE: number, minN: number, maxE: number, maxN: number, zone: number, south: boolean,
): [number, number, number, number] {
  const corners = [
    fromUtm(minE, minN, zone, south),
    fromUtm(maxE, minN, zone, south),
    fromUtm(minE, maxN, zone, south),
    fromUtm(maxE, maxN, zone, south),
  ]
  return [
    Math.min(...corners.map((c) => c.lon)),
    Math.min(...corners.map((c) => c.lat)),
    Math.max(...corners.map((c) => c.lon)),
    Math.max(...corners.map((c) => c.lat)),
  ]
}
