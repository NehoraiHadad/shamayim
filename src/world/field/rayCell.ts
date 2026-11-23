import { isConvective } from './genus'
import type { FieldCell } from './types'

/** Intersection of the ray with the cell top and base. rr is quadratic in range. */
export function cellInterval(cell: FieldCell, east: number, north: number, slope: number,
  curvature: number, start: number, end: number): [number, number] | undefined {
  const angle = (cell.axis ?? 0) * Math.PI / 180
  const sin = angle ? Math.sin(angle) : 0, cos = angle ? Math.cos(angle) : 1
  const minor = cell.rMinor ?? cell.r
  const u = (east * sin + north * cos) / cell.r, v = (east * cos - north * sin) / minor
  const x = (cell.x * sin + cell.y * cos) / cell.r, y = (cell.x * cos - cell.y * sin) / minor
  const a = u * u + v * v
  const centre = (u * x + v * y) / a
  const rr0 = (x - centre * u) ** 2 + (y - centre * v) ** 2
  if (rr0 >= 1) return
  const half = Math.sqrt((1 - rr0) / a)
  const lo = Math.max(start, centre - half), hi = Math.min(end, centre + half)
  if (lo >= hi) return
  const cumulus = isConvective(cell.genus)
  if (cumulus) {
    // In coordinates relative to the footprint centre, top minus ray height
    // is a concave quadratic. Solve its roots directly.
    const quadratic = cell.vKm * a + curvature
    const linear = slope + 2 * centre * curvature
    const peak = -linear / (2 * quadratic)
    const peakHeight = cell.baseKm + cell.vKm * (1 - rr0) - centre * (slope + centre * curvature)
      + quadratic * peak * peak
    if (peakHeight <= 0) return
    const radius = Math.sqrt(peakHeight / quadratic)
    const from = Math.max(lo, centre + peak - radius), to = Math.min(hi, centre + peak + radius)
    return from < to ? [from, to] : undefined
  }
  const rr = (d: number) => rr0 + a * (d - centre) ** 2
  const above = (d: number) => cell.baseKm + cell.vKm * (1 - rr(d) ** 2) - d * (slope + d * curvature)
  const derivative = (d: number) => -4 * cell.vKm * a * (d - centre) * rr(d) - slope - 2 * d * curvature
  // The top minus the ray height is concave. Each bisection brackets its root
  // within 2^-24 of the initial bracket, including the maximum search.
  const peak = derivative(lo) <= 0 ? lo : derivative(hi) >= 0 ? hi : root(lo, hi, d => derivative(d) > 0)
  if (above(peak) <= 0) return
  return [above(lo) >= 0 ? lo : root(lo, peak, d => above(d) < 0),
    above(hi) >= 0 ? hi : root(peak, hi, d => above(d) >= 0)]
}

function root(lo: number, hi: number, onLeft: (d: number) => boolean) {
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (onLeft(mid)) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
