import type { layerSnapshot } from './density'
import { LATTICES } from './lattice'

/** Integrate beam extinction with layer-mean heights: the footprint displacement
 * from a cell of base b and depth v is bounded by cot(alt) times the greater
 * of |b - layer.baseKm| and |b + v - layer.baseKm - layer.meanVKm|. */
export function shadowTau(snapshot: readonly ReturnType<typeof layerSnapshot>[], x: number, y: number,
  sun: { altitude: number; azimuth: number }, groundAboveEyeKm = 0) {
  if (sun.altitude <= 0) return 0
  const az = sun.azimuth * Math.PI / 180
  const alt = sun.altitude * Math.PI / 180
  const cot = 1 / Math.tan(alt)
  const east = Math.sin(az) * cot, north = Math.cos(az) * cot
  let tau = 0
  for (const { layer, densityGrid } of snapshot) {
    if (!layer?.cover) continue
    const base = Math.max(groundAboveEyeKm, layer.baseKm)
    const depth = layer.baseKm + layer.meanVKm - base
    if (depth <= 0) continue
    const radius = LATTICES[layer.lattice].median * layer.g
    const count = Math.max(1, Math.ceil(depth * cot / (radius / 2)))
    let sum = 0
    for (let k = 0; k < count; k++) {
      const h = base + depth * (k + 0.5) / count - groundAboveEyeKm
      sum += densityGrid.tauAt(x + h * east, y + h * north)
    }
    tau += sum * depth / (count * layer.meanVKm)
  }
  return tau / (2 * Math.sin(alt))
}
