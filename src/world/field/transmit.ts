import { onCircle } from '../optics'
import type { layerSnapshot } from './density'
import { LATTICES } from './lattice'
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

function ray(snapshot: FieldSnapshot, az: number, alt: number) {
  const east = Math.sin(az * rad), north = Math.cos(az * rad)
  const cos = Math.cos(alt * rad), slope = Math.tan(alt * rad)
  const height = (d: number) => d * slope + d * d / (2 * R_EFF_KM)
  const patches = new Map<FieldCell, number>()
  let tau = 0
  for (const { layer, densityGrid } of snapshot) {
    if (!layer?.cover) continue
    const [min, max] = slab(layer)
    if (cos < 1e-8) {
      tau += densityGrid.rayDepthAt(0, 0, min, max, max - min, patches)
      continue
    }
    const start = groundRangeAt(min, alt), end = groundRangeAt(max, alt)
    const width = end - start
    const count = Math.min(12, Math.max(1, Math.ceil(width / (LATTICES[layer.lattice].pitch / 2))))
    const step = width / count
    // Clip the actual vertical segment at each column. Sampling the horizontal midpoint
    // displaces the footprint by at most half a step, and is exact for a vertical ray.
    for (let k = 0; k < count; k++) {
      const d = start + (k + 0.5) * step
      tau += densityGrid.rayDepthAt(d * east, d * north, height(d - step / 2), height(d + step / 2), step / cos, patches)
    }
  }
  for (const [cell, slant] of patches) {
    const gap = cell.genus === 'ac' ? 0.35 : 0.5
    tau -= Math.log1p((1 - gap) * Math.expm1(-slant))
  }
  return Math.exp(-tau)
}

/** Five equal-weight samples over the disc. The supplied snapshot belongs to the shown minute. */
export function transmitAlong(field: CloudField, snapshot: FieldSnapshot, az: number, alt: number, t = field.t) {
  if (t !== field.t) throw new RangeError('Transmission requires the field at the snapshot minute')
  let sum = ray(snapshot, az, alt)
  for (let k = 0; k < 4; k++) {
    const p = onCircle({ azimuth: az, altitude: alt }, 0.19, k * Math.PI / 2)
    sum += ray(snapshot, p.azimuth, p.altitude)
  }
  return sum / 5
}
