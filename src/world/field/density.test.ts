import { expect, it } from 'vitest'
import { hashId, seeded } from '../../data/landmarks/hash'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { cellsAround, cellsAt, RANGES } from './cells'
import { cellTauAt, densityGrid, layerSnapshot, rasterRange, shadowTau } from './density'
import { buildField } from './field'
import { createClumpSampler, sampleClumpGrid } from './clump'
import type { FieldInput, Lattice } from './types'

const input: FieldInput = {
  placeId: 'density-test', hours: mapForecast(fixture).hours, at: '2026-11-17T08:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}

it.each([
  ['fixture', input.covers],
  ['sparse', { low: 0.15, mid: 0.1, high: 0.2 }],
  ['overcast', { low: 0.999, mid: 0.98, high: 0.95 }],
] as const)('indexes every contributing cell for %s', (mix, covers) => {
  const field = buildField({ ...input, covers })
  const rng = seeded(hashId('density-samples'))
  for (const layer of field.layers) {
    const { lattice } = layer
    const radius = rasterRange(layer) * 0.85
    const grid = densityGrid(field, lattice, 0, 0, radius, field.t)
    let errorSquared = 0
    let tauSquared = 0
    for (let n = 0; n < 2000; n++) {
      const distance = radius * Math.sqrt(rng())
      const angle = rng() * 2 * Math.PI
      const x = distance * Math.sin(angle)
      const y = distance * Math.cos(angle)
      const exact = cellsAt(field, lattice, x, y).reduce((sum, cell) => sum + cellTauAt(cell, x, y), layer.floorTau)
      const sampled = grid.tauAt(x, y)
      errorSquared += (sampled - exact) ** 2
      tauSquared += exact ** 2
    }
    const rms = Math.sqrt(errorSquared / tauSquared)
    console.info(mix, lattice, { tauRms: rms })
    expect.soft(rms, lattice).toBeLessThanOrEqual(1e-12)
  }
})

it('keeps the shared snapshot at the requested keyframe and joins the expected density at the edge', () => {
  const field = buildField(input)
  const t = field.t + 0.5
  for (const layer of field.layers) {
    const { lattice } = layer
    const [near] = RANGES[lattice]
    const snapshot = layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1], t)
    expect(snapshot.densityGrid.tauAt(RANGES[lattice][1] + 1, 0)).toBe(layer.floorTau)
    expect(snapshot.cells).toEqual(cellsAround(field, lattice, 0, 0, near, 0.5))
    const range = rasterRange(layer)
    const edge = snapshot.densityGrid.tauAt(range, 0)
    expect(snapshot.densityGrid.tauAt(range - 1e-6, 0)).toBeCloseTo(edge, 4)
    expect(snapshot.densityGrid.tauAt(range + 1e-6, 0)).toBeCloseTo(edge, 4)
  }
})

it.each([5, 20, 45, 70])('integrates slant extinction at %s degrees over raised and lowered ground', altitude => {
  const field = buildField(input)
  const snapshot = layerSnapshot(field, 'low', 0, 0, 50)
  const cell = snapshot.cells.find(cell => Math.hypot(cell.x, cell.y) < 4 && cell.tau0 > 10)!
  const alt = altitude * Math.PI / 180
  const isolated = { ...snapshot, layer: { ...snapshot.layer!, baseKm: cell.baseKm, meanVKm: cell.vKm },
    densityGrid: { ...snapshot.densityGrid, tauAt: (x: number, y: number) => cellTauAt(cell, x, y) } }
  for (const ground of [-0.3, 0.25]) {
    const x = cell.x - (cell.baseKm + cell.vKm / 2 - ground) / Math.tan(alt)
    const sun = { altitude, azimuth: 90 }
    expect(Math.exp(-shadowTau([isolated], x, cell.y, sun, ground))).toBeLessThan(0.1)
    expect(shadowTau([isolated], x, cell.y + 3 * cell.r, sun, ground)).toBe(0)
  }
})

const ensembles: [Lattice, FieldInput['covers'], number][] = [
  ['low', { low: 0.08, mid: 0, high: 0 }, 0],
  ['low', { low: 0.64, mid: 0, high: 0 }, 0],
  ['tower', { low: 0.64, mid: 0, high: 0 }, 95],
  ['mid', { low: 0, mid: 0.54, high: 0 }, 0],
  ['high', { low: 0, mid: 0, high: 0.56 }, 0],
  ['low', { low: 0.999, mid: 0, high: 0 }, 3],
]

it.each(ensembles)('matches exact %s ensemble transmission across and beyond the raster (%j, WMO %s)', (lattice, covers, weatherCode) => {
  let worst = 0
  for (const fade of [0.85, 1]) {
    let exact = 0, expected = 0
    const rng = seeded(hashId('annulus'))
    const count = 4000
    const grids = Array.from({ length: 12 }, (_, index) => {
      const field = buildField({ ...input, placeId: 'annulus-' + index, weatherCode, hours: [],
        covers, wind10: { speedKmh: 0, fromDeg: 0 } })
      const layer = field.layers.find(layer => layer.lattice === lattice)!
      return { field, layer, grid: densityGrid(field, lattice, 0, 0, RANGES[lattice][1]) }
    })
    for (let i = 0; i < count; i++) {
      const { field, grid, layer } = grids[i % grids.length]
      const start = rasterRange(layer) * fade
      const radius = Math.sqrt(start ** 2 + ((start + 1.5) ** 2 - start ** 2) * rng())
      const az = rng() * 2 * Math.PI
      const x = radius * Math.cos(az), y = radius * Math.sin(az)
      const tau = cellsAt(field, lattice, x, y).reduce((sum, cell) => sum + cellTauAt(cell, x, y), layer.floorTau)
      exact += Math.exp(-tau)
      expected += Math.exp(-grid.tauAt(x, y))
    }
    const error = Math.abs(exact - expected) / count
    console.info({ lattice, covers, fade, exact: exact / count, expected: expected / count, error })
    worst = Math.max(worst, error)
  }
  expect(worst).toBeLessThan(0.03)
})

it('bounds the cached clump interpolation error by the curvature estimate', () => {
  const exact = createClumpSampler(hashId('clump-cache'), 12)
  const cached = sampleClumpGrid(exact, 12)
  const rng = seeded(hashId('clump-points'))
  let max = 0
  for (let i = 0; i < 4000; i++) {
    const x = 1000 * (rng() - 0.5), y = 1000 * (rng() - 0.5)
    max = Math.max(max, Math.abs(cached(x, y) - exact(x, y)))
  }
  console.info({ clumpError: max })
  expect(max).toBeLessThanOrEqual(24 / (8 * 16 ** 2))
})
