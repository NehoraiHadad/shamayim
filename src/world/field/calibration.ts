import { hashId, seeded } from '../../data/landmarks/hash'
import { cellsAround } from './cells'
import { LATTICES } from './lattice'
import type { FieldLayer } from './types'

const spanKm = 60
const binKm = 3
const n = spanKm / binKm

/** Seeded plan points and footprint query for a 60 km square. */
export function coverageSample(placeId: string, sample: number, count = 4000) {
  const rng = seeded(hashId(`${placeId}:plan:${sample}`))
  const points = Array.from({ length: count }, () => [spanKm * (rng() - 0.5), spanKm * (rng() - 0.5)])
  // Translate the air frame to sample distinct mesoscale regions.
  const d: [number, number] = [900 * (rng() - 0.5), 900 * (rng() - 0.5)]
  const t = sample * 73
  const bin = (x: number) => Math.floor((x + spanKm / 2) / binKm)
  const bins = Array.from({ length: n ** 2 }, () => [] as number[])
  points.forEach(([x, y], i) => bins[bin(y) * n + bin(x)].push(i))
  return (layer: FieldLayer) => {
    if (layer.cover >= 0.98) return 1
    const field = { placeId, t, layers: [{ ...layer, d }] }
    const { median, sigma } = LATTICES[layer.lattice]
    // Box-Muller with a 32-bit uniform draw has |normal| < 6.67.
    const maxRadiusKm = (layer.lattice === 'low' ? 0.60 : median * Math.exp(sigma * 6.67)) * layer.g
    const covered = new Uint8Array(count)
    for (const { x, y, r } of cellsAround(field, layer.lattice, 0, 0, Math.SQRT2 * spanKm / 2 + maxRadiusKm)) {
      for (let j = Math.max(0, bin(y - r)); j <= Math.min(n - 1, bin(y + r)); j++) {
        for (let i = Math.max(0, bin(x - r)); i <= Math.min(n - 1, bin(x + r)); i++) {
          for (const index of bins[j * n + i]) {
            const [px, py] = points[index]
            if ((px - x) ** 2 + (py - y) ** 2 <= r ** 2) covered[index] = 1
          }
        }
      }
    }
    return covered.reduce((total, value) => total + value, 0) / count
  }
}
