import { onCircle } from '../optics'
import type { layerSnapshot } from './density'
import { cellInterval } from './rayCell'
import { smoothstep } from './genus'
import { groundRangeAt, R_EFF_KM } from './project'
import type { CloudField, FieldCell, FieldLayer } from './types'

export type FieldSnapshot = readonly ReturnType<typeof layerSnapshot>[]
const rad = Math.PI / 180

function slab(layer: FieldLayer): [number, number] {
  const { lattice, baseKm, lowBaseKm = baseKm, form, meanVKm } = layer
  if (lattice === 'tower') return [baseKm, form.conv > 0.6 ? 12 : baseKm + 5]
  if (lattice === 'mid') return [form.nimbostratus ? 1.3 : 4, form.sheet || form.nimbostratus ? 7 : 4.6]
  if (lattice === 'high') return [form.veil ? 8.5 : 10, 11.5]
  const cu = Math.max(0.3, Math.min(2.5, lowBaseKm))
  const sc = Math.max(0.4, Math.min(2, lowBaseKm))
  const st = Math.max(0.05, Math.min(0.6, lowBaseKm))
  const min = form.stratus ? Math.min(st, sc, cu) : form.strat ? Math.min(sc, cu) : cu
  const max = Math.max(cu + (form.conv > 0.1 ? 1.5 : 0.5), form.strat ? sc + 0.6 : 0, baseKm + meanVKm)
  return [min, max]
}

function ray(snapshot: FieldSnapshot, az: number, alt: number, columnStep?: number) {
  const east = Math.sin(az * rad), north = Math.cos(az * rad)
  const cos = Math.cos(alt * rad), slope = Math.tan(alt * rad)
  const curvature = 1 / (2 * R_EFF_KM)
  const height = (d: number) => d * (slope + d * curvature)
  const patches = new Map<FieldCell, number>()
  let tau = 0
  for (const { layer, densityGrid: grid } of snapshot) {
    if (!layer?.cover) continue
    const [min, max] = slab(layer)
    // At this zenith tolerance lateral travel through a 12 km column is below 0.12 mm.
    if (cos < 1e-8) {
      tau += grid.rayDepthAt(0, 0, min, max, max - min, patches)
      continue
    }
    const start = groundRangeAt(min, alt), end = groundRangeAt(max, alt)
    if (!columnStep) {
      const range = grid.rayRange
      for (const cell of grid.rayCells(east, north, start, Math.min(range, end))) {
        const base = groundRangeAt(cell.baseKm, alt)
        const interval = cellInterval(cell, east, north, slope, curvature, Math.max(start, base), Math.min(range, end))
        if (!interval) continue
        const [lo, hi] = interval
        // Simpson quadrature is exact on the cubic fade.
        // Splitting at the fade start makes the piecewise integral exact as well.
        const from = Math.max(lo, range * 0.85)
        const weight = (d: number) => 1 - smoothstep(range * 0.85, range, d)
        const length = from >= hi ? hi - lo : from - lo
          + (hi - from) * (weight(from) + 4 * weight((from + hi) / 2) + weight(hi)) / 6
        // τ₀ = κv, so integrating κ along the whole chord gives τ₀·ds/v.
        const slant = cell.tau0 * length / (cell.vKm * cos)
        if (cell.genus === 'ac' || cell.genus === 'ci') patches.set(cell, slant)
        else tau += slant
      }
    }
    const meanStart = columnStep ? Math.min(start, groundRangeAt(layer.baseKm, alt)) : groundRangeAt(layer.baseKm, alt)
    const layerEnd = groundRangeAt(layer.baseKm + layer.meanVKm, alt)
    const meanEnd = columnStep ? Math.max(end, layerEnd) : layerEnd
    if (!columnStep && !layer.floorTau && meanEnd <= 0.85 * grid.rayRange) continue
    // Only the ensemble term uses quadrature. If its coefficient has radial
    // Lipschitz constant L, the midpoint error in log T is at most
    // L × step × slant length / (4 × meanVKm). The smoothstep fade has
    // slope at most 10 / rayRange and each clump axis slope is at most 2 / wavelength.
    const count = Math.max(1, Math.ceil((meanEnd - meanStart) / (columnStep ?? 0.1)))
    const step = (meanEnd - meanStart) / count
    for (let k = 0; k < count; k++) {
      const lo = meanStart + k * step, hi = lo + step, d = (lo + hi) / 2
      const args = [d * east, d * north, height(lo), height(hi), step / cos] as const
      tau += columnStep ? grid.rayDepthAt(...args, patches) : grid.meanRayDepth(...args)
    }
  }
  for (const [cell, slant] of patches) {
    const gap = cell.genus === 'ac' ? 0.35 : 0.5
    tau -= Math.log1p((1 - gap) * Math.expm1(-slant))
  }
  return Math.exp(-tau)
}

/** Five equal-weight samples over the disc. The supplied snapshot belongs to the shown minute. */
export function transmitAlong(field: CloudField, snapshot: FieldSnapshot, az: number, alt: number, t = field.t, columnStep?: number) {
  if (t !== field.t) throw new RangeError('Transmission requires the field at the snapshot minute')
  let sum = ray(snapshot, az, alt, columnStep)
  for (let k = 0; k < 4; k++) {
    const p = onCircle({ azimuth: az, altitude: alt }, 0.19, k * Math.PI / 2)
    sum += ray(snapshot, p.azimuth, p.altitude, columnStep)
  }
  return sum / 5
}
