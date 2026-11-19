/**
 * Latitude/longitude (WGS84) to UTM easting/northing (m) in a given northern zone: the Sentinel-2 tiles' own grid
 * (Israel lies in zones 36N, EPSG:32636). Krüger's series to the third order: good to millimetres within a zone.
 */
export function toUtm(lat: number, lon: number, zone: number): { e: number; n: number } {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996
  const n = f / (2 - f)
  const A = (a / (1 + n)) * (1 + n * n / 4 + n ** 4 / 64)
  const alpha = [n / 2 - (2 / 3) * n * n + (5 / 16) * n ** 3, (13 / 48) * n * n - (3 / 5) * n ** 3, (61 / 240) * n ** 3]
  const rad = Math.PI / 180
  const phi = lat * rad, lambda = (lon - (zone * 6 - 183)) * rad
  const e2 = (2 * Math.sqrt(n)) / (1 + n)
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - e2 * Math.atanh(e2 * Math.sin(phi)))
  const xi = Math.atan2(t, Math.cos(lambda)), eta = Math.atanh(Math.sin(lambda) / Math.sqrt(1 + t * t))
  let E = eta, N = xi
  for (let j = 1; j <= 3; j++) {
    E += alpha[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta)
    N += alpha[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta)
  }
  return { e: 500000 + k0 * A * E, n: k0 * A * N }
}
