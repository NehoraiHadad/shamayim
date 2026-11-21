import { expect, it } from 'vitest'
import { hashId, seeded } from '../../data/landmarks/hash'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { cellsAround, cellsAt, RANGES } from './cells'
import { cellTauAt, densityGrid, farStrips, layerSnapshot, rasterRange } from './density'
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
    const radius = rasterRange(layer) * 0.85
    const grid = densityGrid(field, lattice, 0, 0, radius, field.t)
    if (lattice === 'tower') console.info('tower grid build median ms', medianMs(() => densityGrid(field, lattice, 0, 0, radius)))
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
    expect.soft(rms, lattice).toBeLessThanOrEqual(lattice === 'tower' ? 0.04 : 0.05)
  }
})

function scrub(placeId: string, minute: number) {
  const at = '2026-11-17T08:' + String(minute).padStart(2, '0')
  const field = buildField({ ...input, placeId, at })
  let tau = 0
  for (const layer of field.layers) {
    const { lattice } = layer
    const [near, far] = RANGES[lattice]
    const { densityGrid: grid } = layerSnapshot(field, lattice)
    farStrips(field, layer)
    const radii = [near / 4, near / 2, near, (near + far) / 2]
    for (let i = 0; i < 360; i++) {
      const az = i * Math.PI / 180
      const east = Math.sin(az)
      const north = Math.cos(az)
      for (const r of radii) tau += grid.tauAt(r * east, r * north)
    }
  }
  return tau
}

function medianMs(work: (i: number) => unknown) {
  work(-1)
  const samples = Array.from({ length: 9 }, (_, i) => {
    const start = performance.now()
    work(i)
    return performance.now() - start
  }).sort((a, b) => a - b)
  return samples[4]
}

/** Strict budgets need a quiet machine: `FIELD_PERF=1 npx vitest run src/world/field/density.test.ts`.
 * In the parallel suite other test files share the CPU (warm 3.3 ms alone measured 5.0 ms there), so the
 * default run only guards against regressions of 3x or more. */
const budget = (ms: number) => (process.env.FIELD_PERF === '1' ? ms : 3 * ms)

it('builds a new forecast within the 3 ms arrival budget', () => {
  const ms = medianMs(() => buildField({ ...input, hours: [...input.hours] }))
  console.info('forecast arrival median ms', ms)
  expect(ms).toBeLessThanOrEqual(budget(3))
})

it('serves all four layers within the 15 ms cold place budget', () => {
  buildField(input)
  const ms = medianMs(i => scrub(`cold-density-${i}`, i + 1))
  console.info('cold place scrub median ms', ms)
  expect(ms).toBeLessThanOrEqual(budget(15))
})

it('serves all four layers within the 3 ms warm scrub budget', () => {
  // Warm the renderer over distinct minutes before sampling the steady-state scrub path.
  for (let minute = 10; minute < 22; minute++) scrub('warm-density', minute)
  const ms = medianMs(i => scrub('warm-density', i + 1))
  console.info('warm scrub median ms', ms)
  expect(ms).toBeLessThanOrEqual(budget(3))
})

it('keeps the shared snapshot at the requested keyframe and joins the expected density at the edge', () => {
  const field = buildField(input)
  const t = field.t + 0.5
  for (const layer of field.layers) {
    const { lattice } = layer
    const [near] = RANGES[lattice]
    const snapshot = layerSnapshot(field, lattice, t)
    expect(snapshot.cells).toEqual(cellsAround(field, lattice, 0, 0, near, 0.5))
    const range = rasterRange(layer)
    const edge = snapshot.densityGrid.tauAt(range, 0)
    expect(snapshot.densityGrid.tauAt(range - 1e-6, 0)).toBeCloseTo(edge, 4)
    expect(snapshot.densityGrid.tauAt(range + 1e-6, 0)).toBeCloseTo(edge, 4)
  }
})

it('profiles the components of a warm scrub', () => {
  const fields = Array.from({ length: 10 }, (_, minute) => buildField({
    ...input, placeId: 'warm-density', at: '2026-11-17T08:' + String(minute).padStart(2, '0'),
  }))
  for (const { lattice } of fields[0].layers) {
    const [near, far] = RANGES[lattice]
    const at = (i: number) => fields[i + 1]
    const gridBuild = medianMs(i => densityGrid(at(i), lattice, 0, 0, far))
    const cellLists = medianMs(i => cellsAround(at(i), lattice, 0, 0, near))
    const snapshot = medianMs(i => layerSnapshot(at(i), lattice))
    const grids = fields.map(field => layerSnapshot(field, lattice).densityGrid)
    const lookups = medianMs(i => {
      const grid = grids[i + 1]
      let tau = 0
      const radii = [near / 4, near / 2, near, (near + far) / 2]
      for (let deg = 0; deg < 360; deg++) {
        const angle = deg * Math.PI / 180
        const east = Math.sin(angle)
        const north = Math.cos(angle)
        for (const r of radii) tau += grid.tauAt(r * east, r * north)
      }
      return tau
    })
    const strips = medianMs(i => farStrips(at(i), at(i).layers.find(layer => layer.lattice === lattice)!))
    console.info(lattice, { snapshot, gridBuild, cellLists, lookups, strips })
  }
})
