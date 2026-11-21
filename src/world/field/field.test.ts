import { hourBetween } from '../livingLight'
import { expect, it } from 'vitest'
import { hashId, seeded } from '../../data/landmarks/hash'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { layerCovers, lowBaseM } from '../clouds'
import { displacement, steeringWind, wallMinutes } from './advect'
import { coverageEvaluator } from './calibration.test-helper'
import { cellsAround, RANGES } from './cells'

import { buildField } from './field'
import { COVER_KNOTS, splitLowCover } from './occupancy'
import { altitudeOf, groundRangeAt, projectCell } from './project'
import type { FieldInput } from './types'

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

const hoursByKey = new Map(hours.map(hour => [hour.time, hour]))

function fixtureField(minute: number) {
  const at = timestamp(minute)
  const hour = hourBetween(hours, at) ?? hours[0]
  const next = hoursByKey.get(timestamp(Math.floor(minute / 60) * 60 + 60)) ?? hour
  const f = Number(at.slice(14, 16)) / 60
  const lerp = (a: number, b: number) => a + (b - a) * f
  const cloudCover = lerp(hour.cloudCover, next.cloudCover)
  const thickCloud = hour.thickCloud == null || next.thickCloud == null ? hour.thickCloud
    : Math.min(cloudCover, lerp(hour.thickCloud, next.thickCloud))
  const { covers } = layerCovers({ hour, cloudCover, thickCloud })
  const humidity = hour.humidity == null || next.humidity == null ? hour.humidity : lerp(hour.humidity, next.humidity)
  return buildField({ ...input, at, covers, weatherCode: (f < 0.5 ? hour : next).weatherCode,
    lowBaseKm: lowBaseM(lerp(hour.temperature, next.temperature), humidity) / 1000, wind10: {
      speedKmh: lerp(hour.windSpeed, next.windSpeed), fromDeg: forecast.current.windDirection ?? 270,
    } })
}

it('advects and fades continuously through fixture hour boundaries and two midnights', () => {
  const rng = seeded(hashId('continuity-minutes'))
  const minutes = new Set(Array.from({ length: 100 }, () => Math.floor(rng() * 2880)))
  for (let h = 0; h <= 48; h++) {
    minutes.add(h * 60 - 1)
    minutes.add(h * 60)
  }
  for (const midnight of [1440, 2880]) {
    minutes.add(midnight - 1)
    minutes.add(midnight)
  }
  let moveErrorKm = 0
  let shareChange = 0
  let newShare = 0
  for (const minute of minutes) {
    const before = fixtureField(minute)
    const after = fixtureField(minute + 1)
    for (const [i, layer] of after.layers.entries()) {
      const oldLayer = before.layers[i]
      const radius = [3, 12, 12, 25][i]
      const old = new Map(cellsAround(before, layer.lattice, 0, 0, radius + 250 / 60).map(cell => [cell.id, cell]))
      const speed = Math.max(Math.hypot(...oldLayer.vel), Math.hypot(...layer.vel))
      const dx = (oldLayer.vel[0] + layer.vel[0]) / 2
      const dy = (oldLayer.vel[1] + layer.vel[1]) / 2
      for (const cell of cellsAround(after, layer.lattice, 0, 0, radius)) {
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
  }
  expect(moveErrorKm).toBeLessThanOrEqual(0.001)
  expect(shareChange).toBeLessThanOrEqual(0.15)
  expect(newShare).toBeLessThanOrEqual(0.15)
})

it('changes visible directions over three hours and one day', () => {
  const directions = (minute: number) => {
    const field = fieldAt(minute)
    return field.layers.flatMap(({ lattice }) =>
      cellsAround(field, lattice, 0, 0, RANGES[lattice][0]).map(cell => {
        const { az, aNear, aFar } = projectCell(cell)
        const a = (aNear + aFar) * Math.PI / 360
        const b = az * Math.PI / 180
        return [Math.cos(a) * Math.sin(b), Math.cos(a) * Math.cos(b), Math.sin(a)]
      }))
  }
  const original = directions(480)
  for (const dt of [180, 1440]) {
    const later = directions(480 + dt)
    const threshold = Math.cos(Math.PI / 180)
    const similar = original.filter(a => later.some(b => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] >= threshold))
    expect(original.length).toBeGreaterThan(10)
    expect(similar.length / original.length).toBeLessThan(0.2)
  }
})

it('integrates meteorological vectors from the midnight anchor', () => {
  const first = { time: '2026-11-17T23:00', windSpeed: 60, windDirection: 270,
    windAloft: { low: { speed: 120, fromDeg: 180 }, mid: null, high: null } }
  const second = { ...first, time: '2026-11-18T00:00', windSpeed: 120 }
  const v = steeringWind(first, (0.51 + 1.46) / 2, 0.5)
  expect(v[0]).toBeCloseTo(0.5)
  expect(v[1]).toBeCloseTo(1)
  const { d, vel } = displacement([first, second], '2026-11-17T23:30', 0.01, [500, 0])
  expect(d[0]).toBeCloseTo(447.5)
  expect(vel[0]).toBeCloseTo(1.5)
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
