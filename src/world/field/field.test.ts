import { describe, expect, it } from 'vitest'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { displacement, steeringWind, wallMinutes } from './advect'
import { coverageSample } from './calibration'
import { cellsAround, cellsAt } from './cells'
import { buildField } from './field'
import { COVER_KNOTS, occupancyOf, splitLowCover } from './occupancy'
import { altitudeOf, groundRangeAt, projectCell } from './project'
import type { FieldInput } from './types'

const input: FieldInput = {
  placeId: 'shadmot-mehola', hours: mapForecast(fixture).hours, at: '2026-11-17T00:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, rateMmH: 0.5, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}
const start = wallMinutes(input.at)
const fieldAt = (dtMin: number) => buildField({
  ...input, at: new Date((start + dtMin) * 60_000).toISOString().slice(0, 16),
})

describe('cloud field', () => {
  it('calibrates the plan cover of all four lattices', () => {
    const windows = [30, 31, 32].map(i => coverageSample(input.placeId, i))
    for (const layer of fieldAt(0).layers) {
      for (const cover of COVER_KNOTS.slice(1)) {
        const sample = { ...layer, cover, ...occupancyOf(layer.lattice, cover) }
        const result = windows.reduce((sum, covered) => sum + covered(sample), 0) / windows.length
        expect(Math.abs(result - cover), `${layer.lattice} at ${cover}: ${result}`).toBeLessThanOrEqual(0.04)
        if (cover === 1) expect(result).toBe(1)
      }
    }
    const { low, tower } = splitLowCover(0.8, 0.6)
    expect(1 - (1 - low) * (1 - tower)).toBeCloseTo(0.8)
  }, 15_000)

  it('advects and fades continuously through 48 hours of fixture winds', () => {
    // Constant form and cover isolate advection and intrinsic life-cycle fades.
    let before = fieldAt(0)
    let moveErrorKm = 0
    let shareChange = 0
    let newShare = 0
    for (let minute = 1; minute <= 48 * 60; minute++) {
      const after = fieldAt(minute)
      for (const [i, layer] of after.layers.entries()) {
        const oldLayer = before.layers[i]
        const radiusKm = [5, 20, 40, 40][i]
        const old = new Map(cellsAround(before, layer.lattice, 0, 0, radiusKm + 250 / 60).map(cell => [cell.id, cell]))
        const speed = Math.max(Math.hypot(...oldLayer.vel), Math.hypot(...layer.vel))
        const dx = (oldLayer.vel[0] + layer.vel[0]) / 2
        const dy = (oldLayer.vel[1] + layer.vel[1]) / 2
        for (const cell of cellsAround(after, layer.lattice, 0, 0, radiusKm)) {
          const prev = old.get(cell.id)
          if (prev) {
            const x = cell.x - prev.x
            const y = cell.y - prev.y
            moveErrorKm = Math.max(moveErrorKm, Math.hypot(x - dx, y - dy), Math.hypot(x, y) - speed)
            shareChange = Math.max(shareChange, Math.abs(cell.share - prev.share))
          } else {
            newShare = Math.max(newShare, cell.share)
          }
        }
      }
      before = after
    }
    expect(moveErrorKm).toBeLessThanOrEqual(0.001)
    expect(shareChange).toBeLessThanOrEqual(0.15)
    expect(newShare).toBeLessThanOrEqual(0.15)
  }, 60_000)

  it('changes the visible directions over three hours and one day', () => {
    const directions = (minute: number) => {
      const field = fieldAt(minute)
      return field.layers.flatMap(({ lattice }, i) =>
        cellsAround(field, lattice, 0, 0, [10, 80, 40, 120][i]).map(cell => [cell.id, projectCell(cell).az] as const))
    }
    const original = directions(480)
    for (const dt of [180, 1440]) {
      const later = new Map(directions(480 + dt))
      const similar = original.filter(([id, az]) => Math.abs(((later.get(id) ?? Infinity) - az + 540) % 360 - 180) <= 1)
      expect(original.length).toBeGreaterThan(10)
      expect(similar.length / original.length).toBeLessThan(0.2)
    }
  })

  it('uses meteorological vector interpolation and an integrated midnight anchor', () => {
    const first = { time: '2026-11-17T23:00', windSpeed: 60, windDirection: 270,
      windAloft: { low: { speed: 120, fromDeg: 180 }, mid: null, high: null } }
    const second = { ...first, time: '2026-11-18T00:00', windSpeed: 120 }
    const v = steeringWind(first, (0.01 + 1.46) / 2)
    expect(v[0]).toBeCloseTo(0.5)
    expect(v[1]).toBeCloseTo(1)
    const { d, vel } = displacement([first, second], '2026-11-17T23:30', 0.01, [500, 0])
    expect(d[0]).toBeCloseTo(447.5)
    expect(vel[0]).toBeCloseTo(1.5)
  })

  it('projects curved base lines, the horizon and the zenith', () => {
    const [cell] = cellsAround(fieldAt(0), 'low', 0, 0, 10)
    const projected = projectCell(cell)
    expect(projected.aFar).toBeLessThan(projected.aNear)
    expect(projected.aNear).toBeLessThanOrEqual(90)
    expect(projectCell({ ...cell, x: 0, y: 0 }).aNear).toBe(90)
    expect(altitudeOf(1.5, 10)).toBeGreaterThan(altitudeOf(1.5, 20))
    expect(groundRangeAt(1.5, 0)).toBeCloseTo(149.33, 1)
    expect(altitudeOf(1.5, 150)).toBeLessThan(0)
    expect(groundRangeAt(1.5, altitudeOf(1.5, 40))).toBeCloseTo(40)
  })

  it('keeps eye neighbourhoods bounded and warm queries within their budgets', () => {
    const field = fieldAt(0)
    expect(cellsAt(field, 'low', 0, 0).length).toBeLessThanOrEqual(25)
    cellsAround(field, 'low', 0, 0, 10)
    const averageMs = (work: () => unknown) => {
      const before = performance.now()
      for (let i = 0; i < 100; i++) work()
      return (performance.now() - before) / 100
    }
    expect(averageMs(() => fieldAt(0))).toBeLessThan(2.5)
    expect(averageMs(() => cellsAround(field, 'low', 0, 0, 10))).toBeLessThan(5)
  })
})
