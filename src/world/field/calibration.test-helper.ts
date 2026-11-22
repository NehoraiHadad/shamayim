import { hashId, seeded } from '../../data/landmarks/hash'
import { visitCells } from './cells'
import { maxRadius } from './lattice'
import { occupancyOf, shareOf } from './occupancy'
import type { FieldLayer } from './types'

/** Prepare a seeded plan window. Used only by the calibration script and field tests. */
export function coverageSample(placeId: string, sample: number, spanKm: number, count = 4000) {
  const rng = seeded(hashId(`${placeId}:plan:${sample}`))
  const points = Array.from({ length: count }, () => [spanKm * (rng() - 0.5), spanKm * (rng() - 0.5)])
  const d: [number, number] = [900 * (rng() - 0.5), 900 * (rng() - 0.5)]
  const t = sample * 73
  const angle = rng() * 2 * Math.PI
  const vel: [number, number] = [Math.sin(angle), Math.cos(angle)]
  const binKm = spanKm / 20
  const n = 20
  const bin = (x: number) => Math.floor((x + spanKm / 2) / binKm)
  const bins = Array.from({ length: n ** 2 }, () => [] as number[])
  points.forEach(([x, y], i) => bins[bin(y) * n + bin(x)].push(i))
  return (layer: FieldLayer) => {
    const largest = occupancyOf(layer.lattice, 0.979999, false)
    const field = { placeId, t, layers: [{ ...layer, ...largest, d, vel }] }
    const thresholds = new Float64Array(count).fill(Infinity)
    visitCells(field, layer.lattice, 0, 0, Math.SQRT2 * spanKm / 2 + maxRadius(layer.lattice) * largest.g, 0,
      (_i, _j, x, y, r, _base, _v, _tau, share, _seed, _genus, rank, axis) => {
        const baseRadius = r / (largest.g * Math.sqrt(share))
        const invR2 = 1 / (baseRadius * baseRadius)
        const maximum = largest.g * largest.g * share
        for (let j = Math.max(0, bin(y - r)); j <= Math.min(n - 1, bin(y + r)); j++) {
          for (let i = Math.max(0, bin(x - r)); i <= Math.min(n - 1, bin(x + r)); i++) {
            for (const index of bins[j * n + i]) {
              const dx = points[index][0] - x
              const dy = points[index][1] - y
              const rr = axis === undefined ? dx * dx + dy * dy
                : (dx * vel[0] + dy * vel[1]) ** 2 + 9 * (dx * vel[1] - dy * vel[0]) ** 2
              const target = rr * invR2
              if (target > maximum) continue
              let needed = target / share
              if (needed < 1) {
                let lo = 0
                let hi = 1
                for (let step = 0; step < 16; step++) {
                  const mid = (lo + hi) / 2
                  if (shareOf(rank, mid, layer.lattice === 'tower' ? 0.4 : 0.25) >= target) hi = mid
                  else lo = mid
                }
                needed = hi
              }
              thresholds[index] = Math.min(thresholds[index], needed)
            }
          }
        }
      })
    return thresholds
  }
}

/** Average independent seed windows, separating the fit and held-out evaluation. */
export function coverageEvaluator(layer: FieldLayer, heldOut: boolean) {
  const thresholds = Array.from({ length: 24 }, (_, i) => coverageSample(
    heldOut ? 'cover-validation-b' : 'cover-calibration-a', heldOut ? 100 + i : i,
    layer.lattice === 'high' ? 300 : 60,
  )(layer)).flatMap(sample => Array.from(sample)).sort((a, b) => a - b)
  return (cover: number, calibrated = true) => {
    // Cover >= 0.98 is the geometric floor rule.
    if (cover >= 0.98) return 1
    if (cover <= 0) return 0
    const { Q, g } = occupancyOf(layer.lattice, cover, calibrated)
    const intensity = Q * g * g
    let low = 0
    let high = thresholds.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (thresholds[mid] <= intensity) low = mid + 1
      else high = mid
    }
    return low / thresholds.length
  }
}
