import { it, expect } from 'vitest'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { cellsAround, RANGES } from './cells'
import { densityGrid, farStrips, layerSnapshot } from './density'
import { buildField } from './field'
import { referenceLoop } from './referenceLoop.test-helper'
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

const SAMPLE_COUNT = 21
const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]

function medianMs(work: (i: number) => unknown) {
  work(-1)
  const samples = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
    const start = performance.now()
    work(i)
    return performance.now() - start
  })
  return median(samples)
}

function pairedSamples(work: (i: number) => unknown) {
  referenceLoop()
  work(-1)
  return Array.from({ length: SAMPLE_COUNT }, (_, i) => {
    const start = performance.now()
    referenceLoop()
    const before = performance.now()
    work(i)
    const after = performance.now()
    referenceLoop()
    return { ms: after - before, reference: ((before - start) + (performance.now() - after)) / 2 }
  })
}

// Absolute budgets calibrated from CI runs 44993185800, 44995756933 and 44997772484.
it('builds a new forecast within the 3 ms arrival budget', () => {
  const ms = medianMs(() => buildField({ ...input, hours: [...input.hours] }))
  console.info('forecast arrival median ms', ms)
  expect(ms).toBeLessThanOrEqual(3)
})

it('serves all four layers within the 15 ms cold place budget', () => {
  buildField(input)
  const cold = (i: number) => scrub(`cold-density-${i}`, i + 1)
  const samples = pairedSamples(cold)
  const ms = median(samples.map(sample => sample.ms))
  const ratio = median(samples.map(sample => sample.ms / sample.reference))
  console.info('cold place scrub median ms', ms, { coldRatio: ratio })
  expect(ms).toBeLessThanOrEqual(15)
})

// Warm budget recalibrated on the field branch's CI runs 45014581197–45019767384 (1.75–3.41 ms, runner-bound): p95 + 15 %.
it('serves all four layers within the 3.9 ms warm scrub budget', () => {
  // Warm the renderer over distinct minutes before sampling the steady-state scrub path.
  for (let minute = SAMPLE_COUNT + 1; minute < SAMPLE_COUNT + 29; minute++) scrub('warm-density', minute)
  const warm = (i: number) => scrub('warm-density', i + 1)
  const samples = pairedSamples(warm)
  const ms = median(samples.map(sample => sample.ms))
  const ratio = median(samples.map(sample => sample.ms / sample.reference))
  console.info('warm scrub median ms', ms, { reference: median(samples.map(sample => sample.reference)), ratio })
  expect(ms).toBeLessThanOrEqual(3.9)
})

it('profiles the components of a warm scrub', () => {
  const fields = Array.from({ length: SAMPLE_COUNT + 1 }, (_, minute) => buildField({
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
