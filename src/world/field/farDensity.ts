import { RANGES } from './cells'
import { clumpAt } from './handover'
import { clumpSampler, LATTICES } from './lattice'
import { lambdaOf } from './occupancy'
import { altitudeOf } from './project'
import type { CloudField, FieldLayer } from './types'

function stripCentres(lattice: 'low' | 'mid' | 'high') {
  const [near, far] = RANGES[lattice]
  const rangeKm = (near + far) / 2
  const widthDeg = lattice === 'high' ? 8 : 4
  return Array.from({ length: 360 / widthDeg }, (_, i) => {
    const az = (i + 0.5) * widthDeg
    const rad = az * Math.PI / 180
    return { az, widthDeg, rangeKm, east: rangeKm * Math.sin(rad), north: rangeKm * Math.cos(rad) }
  })
}

const centres = { low: stripCentres('low'), mid: stripCentres('mid'), high: stripCentres('high') }

/** Expected far-strip cover per azimuth bin, with centre range and altitudes. */
export function farStrips(field: CloudField, layer: FieldLayer) {
  const { lattice } = layer
  if (lattice === 'tower' || layer.cover === 0) return []
  const [near, far] = RANGES[lattice]
  const aFar = altitudeOf(layer.baseKm, far)
  const aTop = altitudeOf(layer.baseKm + layer.meanVKm, near)
  const baseline = lambdaOf(layer.cover)
  const clump = clumpAt(layer, field.t, clumpSampler(field.placeId, layer.lattice))
  const amplitude = LATTICES[layer.lattice].amplitude
  // Midpoint clump estimate: intensity error is bounded by amplitude × Λ per bin.
  return centres[lattice].map(({ az, widthDeg, rangeKm, east, north }) => {
    const noise = clump(east, north)
    const intensity = baseline * (1 + amplitude * (noise - 0.5))
    return { az, widthDeg, rangeKm, opacity: -Math.expm1(-intensity), aFar, aTop }
  })
}
