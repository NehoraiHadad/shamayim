import { it, expect } from 'vitest'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { cellsAround, RANGES } from './cells'
import { densityGrid, farStrips, layerSnapshot } from './density'
import { buildField } from './field'
import type { FieldInput } from './types'

const input: FieldInput = {
  placeId: 'density-test', hours: mapForecast(fixture).hours, at: '2026-11-17T08:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}

function scrub(placeId: string, minute: number) {
  const at = '2026-11-17T08:' + String(minute).padStart(2, '0')
  const field = buildField({ ...input, placeId, at })
  let tau = 0
  for (const layer of field.layers) {
    const { lattice } = layer
    const [near, far] = RANGES[lattice]
    const { densityGrid: grid } = layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1])
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

const median = (values: number[]) => values.sort((a, b) => a - b)[4]

function medianMs(work: (i: number) => unknown) {
  work(-1)
  const samples = Array.from({ length: 9 }, (_, i) => {
    const start = performance.now()
    work(i)
    return performance.now() - start
  })
  return median(samples)
}

const strict = process.env.FIELD_PERF === '1'
const budget = (ms: number) => strict ? ms : 3 * ms

// A fixed CPU-bound loop with a data dependency prevents the JIT from dropping the work.
function referenceLoop() {
  const scratch = new Float64Array(512)
  const objects = Array.from({ length: 128 }, (_, i) => ({ phase: i / 128 }))
  let phase = 0.25
  for (let i = 0; i < 100_000; i++) phase = Math.sin(phase + i / 100)
  scratch[objects.length] = phase
  return scratch[128] + objects[64].phase
}

it('builds a new forecast within the 3 ms arrival budget', () => {
  const ms = medianMs(() => buildField({ ...input, hours: [...input.hours] }))
  console.info('forecast arrival median ms', ms)
  expect(ms).toBeLessThanOrEqual(budget(3))
})

it('serves all four layers within the 15 ms cold place budget', () => {
  buildField(input)
  const cold = (i: number) => scrub(`cold-density-${i}`, i + 1)
  const ms = medianMs(cold)
  const ratio = ms / medianMs(referenceLoop)
  console.info({ coldRatio: ratio })
  if (!strict) expect(ratio).toBeLessThanOrEqual(2.42)
  console.info('cold place scrub median ms', ms)
  expect(ms).toBeLessThanOrEqual(budget(15))
})

it('serves all four layers within the 2 ms warm scrub budget', () => {
  // Warm the renderer over distinct minutes before sampling the steady-state scrub path.
  for (let minute = 10; minute < 38; minute++) scrub('warm-density', minute)
  const warm = (i: number) => scrub('warm-density', i + 1)
  if (strict) {
    const ms = medianMs(warm)
    console.info('warm scrub median ms', ms)
    expect(ms).toBeLessThanOrEqual(2)
    return
  }
  referenceLoop()
  const samples = Array.from({ length: 9 }, (_, i) => {
    const start = performance.now()
    referenceLoop()
    const before = performance.now()
    warm(i)
    const after = performance.now()
    referenceLoop()
    return { ms: after - before, reference: ((before - start) + (performance.now() - after)) / 2 }
  })
  const ms = median(samples.map(sample => sample.ms))
  const ratio = median(samples.map(sample => sample.ms / sample.reference))
  console.info('warm scrub median ms', ms, { reference: median(samples.map(sample => sample.reference)), ratio })
  // 30% margin over the measured 0.448 warm ratio.
  expect(ratio).toBeLessThanOrEqual(0.59)
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
    const snapshot = medianMs(i => layerSnapshot(at(i), lattice, 0, 0, far))
    const grids = fields.map(field => layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1]).densityGrid)
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
