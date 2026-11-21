import { RANGES } from './cells'
import { clumpSampler, LATTICES } from './lattice'
import { lambdaOf } from './occupancy'
import { altitudeOf } from './project'
import type { CloudField, FieldLayer } from './types'

/** Expected far-strip cover per azimuth bin, with centre range and altitudes. */
export function farStrips(field: CloudField, layer: FieldLayer) {
  const [near, far] = RANGES[layer.lattice]
  if (near === far || layer.cover === 0) return []
  const binDeg = layer.lattice === 'high' ? 8 : 4
  const rangeKm = (near + far) / 2
  const [dx, dy] = layer.d
  const aFar = altitudeOf(layer.baseKm, far)
  const aTop = altitudeOf(layer.baseKm + layer.meanVKm, near)
  const baseline = lambdaOf(layer.cover)
  const clump = clumpSampler(field.placeId, layer.lattice)
  const amplitude = LATTICES[layer.lattice].amplitude
  // Midpoint clump estimate: intensity error is bounded by amplitude × Λ per bin.
  return Array.from({ length: 360 / binDeg }, (_, i) => {
    const az = (i + 0.5) * binDeg
    const rad = az * Math.PI / 180
    const noise = clump(rangeKm * Math.sin(rad) - dx, rangeKm * Math.cos(rad) - dy)
    const intensity = baseline * (1 + amplitude * (noise - 0.5))
    return { az, widthDeg: binDeg, rangeKm, opacity: -Math.expm1(-intensity), aFar, aTop }
  })
}
