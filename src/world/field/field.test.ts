import { unionOf } from '../cloudsCover'
import { expect, it } from 'vitest'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { layerCovers } from '../clouds'
import { steeringTimeline, wallMinutes } from './advect'
import { coverageEvaluator } from './calibration.test-helper'
import { cellsAround, RANGES } from './cells'

import { buildField } from './field'
import { COVER_KNOTS, splitLowCover } from './occupancy'
import { altitudeOf, groundRangeAt, projectCell } from './project'
import type { FieldInput, Lattice } from './types'

const forecast = mapForecast(fixture)
const { hours } = forecast
const input: FieldInput = {
  placeId: 'shadmot-mehola', hours, at: '2026-11-17T00:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}
const start = wallMinutes(input.at)
const timestamp = (minute: number) => new Date((start + minute) * 60_000).toISOString().slice(0, 16)
const fieldAt = (minute: number) => buildField({ ...input, at: timestamp(minute) })

it('calibrates held-out cover across the original and intermediate knots (cover >= 0.98 is the floor rule)', () => {
  for (const layer of fieldAt(0).layers) {
    const evaluate = coverageEvaluator(layer, true)
    for (const cover of COVER_KNOTS) {
      const result = evaluate(cover)
      expect(Math.abs(result - cover), `${layer.lattice} at ${cover}: ${result}`).toBeLessThanOrEqual(0.04)
      if (cover === 1) expect(result).toBe(1)
    }
  }
  const { low, tower } = splitLowCover(0.8, 0.6)
  expect(1 - (1 - low) * (1 - tower)).toBeCloseTo(0.8)
}, 15_000)

it('changes visible directions over three hours and one day', () => {
  const directions = (field: ReturnType<typeof fieldAt>, lattice: Lattice) =>
    cellsAround(field, lattice, 0, 0, RANGES[lattice][0]).map(cell => {
      const { az, aNear, aFar } = projectCell(cell)
      const a = (aNear + aFar) * Math.PI / 360
      const b = az * Math.PI / 180
      return { id: cell.id, x: Math.cos(a) * Math.sin(b), y: Math.cos(a) * Math.cos(b), z: Math.sin(a) }
    })
  type Direction = ReturnType<typeof directions>[number]
  const matches = (a: Direction, b: Direction) => a.x * b.x + a.y * b.y + a.z * b.z >= Math.cos(Math.PI / 180)
  const field = fieldAt(480)
  const unrelated = buildField({ ...input, at: timestamp(480), placeId: 'unrelated-directions' })
  for (const { lattice } of field.layers) {
    const original = directions(field, lattice)
    expect(original.length, lattice).toBeGreaterThan(0)
    const reference = directions(unrelated, lattice)
    const baseline = original.filter(a => reference.some(b => matches(a, b))).length / original.length
    for (const dt of [180, 1440]) {
      const later = directions(fieldAt(480 + dt), lattice)
      const similar = original.filter(a => later.some(b => matches(a, b))).length / original.length
      const byId = original.filter(a => later.some(b => a.id === b.id && matches(a, b))).length / original.length
      expect(similar, `${lattice} after ${dt} min`).toBeLessThanOrEqual(baseline + 0.05)
      expect(byId, `${lattice} after ${dt} min`).toBeLessThan(0.2)
    }
  }
})

it('integrates meteorological vectors from the midnight anchor', () => {
  const first = { time: '2026-11-17T23:00', windSpeed: 60, windDirection: 270,
    windAloft: { low: { speed: 120, fromDeg: 180 }, mid: null, high: null } }
  const second = { ...first, time: '2026-11-18T00:00', windSpeed: 120 }
  const timeline = steeringTimeline([first, second], ['surface', 'aloft'], () => ({
    surface: 0.51, aloft: (0.51 + 1.46) / 2,
  }), 0.5)
  expect(timeline.date).toBe('2026-11-18')
  const v = timeline.at(1, wallMinutes(first.time), [0, 0]).vel
  expect(v[0]).toBeCloseTo(0.5)
  expect(v[1]).toBeCloseTo(1)
  const { d, vel } = timeline.at(0, wallMinutes('2026-11-17T23:30'), [500, 0])
  expect(d[0]).toBeCloseTo(447.5)
  expect(vel[0]).toBeCloseTo(1.5)
})

it('closes the forecast layers smoothly from 98% to 100% total cover', () => {
  const hour = { cloudLow: 80, cloudMid: 50, cloudHigh: 25 }
  const coversAt = (step: number) => layerCovers({ hour, cloudCover: 98 + step / 10 }).covers
  const initial = coversAt(0)
  let previous = initial
  for (let step = 1; step <= 20; step++) {
    const covers = coversAt(step)
    for (const level of ['low', 'mid', 'high'] as const) {
      expect(Math.abs(covers[level] - previous[level]), level).toBeLessThanOrEqual(0.03)
    }
    previous = covers
  }
  expect(unionOf(previous)).toBeGreaterThanOrEqual(0.999)
  expect(Math.abs(previous.mid - initial.mid)).toBeLessThanOrEqual(0.05)
  expect(Math.abs(previous.high - initial.high)).toBeLessThanOrEqual(0.05)
})
it('projects all near cells monotonically from zenith to 300 km', () => {
  const field = fieldAt(0)
  for (const { lattice } of field.layers) {
    for (const cell of cellsAround(field, lattice, 0, 0, RANGES[lattice][0])) {
      let far = Infinity
      let near = 90
      for (let d = 0; d <= 300; d++) {
        const projected = projectCell({ ...cell, x: d, y: 0 })
        if (!(projected.aFar < far && projected.aNear <= near && projected.aFar < projected.aNear)) {
          throw new Error(`Non-monotone projection for ${cell.id} at ${d} km`)
        }
        far = projected.aFar
        near = projected.aNear
      }
    }
  }
  expect(groundRangeAt(1.5, 0)).toBeCloseTo(149.33, 1)
  expect(altitudeOf(1.5, 150)).toBeLessThan(0)
  expect(groundRangeAt(1.5, altitudeOf(1.5, 40))).toBeCloseTo(40)
})
