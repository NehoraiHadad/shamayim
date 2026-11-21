import { expect, it } from 'vitest'
import { hashId, seeded } from '../../data/landmarks/hash'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { cellsAround, cellsAt, RANGES } from './cells'
import { cellTauAt, densityGrid, farStrips } from './density'
import { buildField } from './field'
import type { FieldInput } from './types'

const input: FieldInput = {
  placeId: 'density-test', hours: mapForecast(fixture).hours, at: '2026-11-17T08:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}

it('matches exact near-field optical depth within 5% normalized RMS per layer', () => {
  const field = buildField(input)
  const rng = seeded(hashId('density-samples'))
  for (const layer of field.layers) {
    const { lattice } = layer
    const radius = RANGES[lattice][0]
    const grid = densityGrid(field, lattice, 0, 0, radius, field.t)
    let errorSquared = 0
    let tauSquared = 0
    for (let n = 0; n < 2000; n++) {
      const distance = radius * Math.sqrt(rng())
      const angle = rng() * 2 * Math.PI
      const x = distance * Math.sin(angle)
      const y = distance * Math.cos(angle)
      const exact = cellsAt(field, lattice, x, y).reduce((sum, cell) => sum + cellTauAt(cell, x, y), layer.floorTau)
      errorSquared += (grid.tauAt(x, y) - exact) ** 2
      tauSquared += exact ** 2
    }
    const rms = Math.sqrt(errorSquared / tauSquared)
    console.info(`${lattice} density RMS ${(100 * rms).toFixed(2)}%`)
    expect(rms, lattice).toBeLessThanOrEqual(0.05)
  }
})

it('serves a complete four-layer scrub within the cold and warm budgets', () => {
  function scrub(placeId: string, minute: number, cold = false) {
    const at = '2026-11-17T08:' + String(minute).padStart(2, '0')
    const field = buildField({ ...input, placeId, at, hours: cold ? [...input.hours] : input.hours })
    let tau = 0
    for (const layer of field.layers) {
      const { lattice } = layer
      const [near, far] = RANGES[lattice]
      cellsAround(field, lattice, 0, 0, near)
      farStrips(field, layer)
      const grid = densityGrid(field, lattice, 0, 0, far, field.t)
      for (let i = 0; i < 360; i++) {
        const az = i * Math.PI / 180
        for (const r of [near / 4, near / 2, near, (near + far) / 2]) {
          tau += grid.tauAt(r * Math.sin(az), r * Math.cos(az))
        }
      }
    }
    return tau
  }
  const mean = (count: number, work: (i: number) => unknown) => {
    const start = performance.now()
    for (let i = 0; i < count; i++) work(i)
    return (performance.now() - start) / count
  }
  scrub('warm-density', 0)
  const buildMs = mean(100, () => buildField(input))
  const coldMs = mean(5, i => scrub(`cold-density-${i}`, i, true))
  const warmMs = mean(20, i => scrub('warm-density', i + 1))
  console.info({ buildMs, coldMs, warmMs })
  expect(buildMs).toBeLessThanOrEqual(1)
  expect(coldMs).toBeLessThanOrEqual(15)
  expect(warmMs).toBeLessThanOrEqual(3)
})
