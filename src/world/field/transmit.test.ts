import { expect, it } from 'vitest'
import type { FieldInput } from './types'
import { altitudeOf } from './project'
import { transmitAlong } from './transmit'
import { buildField } from './field'
import { layerSnapshot } from './density'

const input: FieldInput = { placeId: 'disc-test', hours: [], at: '2026-11-17T12:00',
    covers: { low: 0.25, mid: 0, high: 0 }, lowBaseKm: 1.1, elevationKm: 0,
    weatherCode: 0, sunAltitude: 30, wind10: { speedKmh: 0, fromDeg: 0 } }

it('dims the disc behind a seeded cell and leaves an uncovered direction clear', () => {
  const field = buildField(input)
  const snapshot = layerSnapshot(field, 'low', 0, 0, 50)
  const discs = snapshot.cells.filter(cell => cell.tau0 >= 10 && Math.hypot(cell.x, cell.y) <= 3)
  expect(discs.length).toBeGreaterThan(0)
  const transmission = transmitAlong(field, [snapshot], Math.atan2(discs[0].x, discs[0].y) * 180 / Math.PI,
    altitudeOf(discs[0].baseKm + discs[0].vKm / 2, Math.hypot(discs[0].x, discs[0].y)))
  expect(transmission).toBeLessThanOrEqual(0.1)
  const start = performance.now()
  const clear = Array.from({ length: 36 }, (_, i) => transmitAlong(field, [snapshot], i * 10, 40))
  const fiveRayMeanMs = (performance.now() - start) / clear.length
  console.info({ fiveRayMeanMs })
  if (process.env.FIELD_PERF === '1') expect(fiveRayMeanMs).toBeLessThanOrEqual(0.3)
  expect(Math.max(...clear)).toBeGreaterThanOrEqual(0.95)
})

it.each([0, 80, 95])('agrees with fine columns through all four lattices in weather %s', weatherCode => {
  const field = buildField({ ...input, weatherCode, covers: { low: 0.64, mid: 0.54, high: 0.74 } })
  const snapshot = field.layers.map(({ lattice }) => layerSnapshot(field, lattice, 0, 0, 120))
  let worst = { error: 0, exact: 0, fine: 0 }
  for (const alt of [5, 12, 20, 40, 65]) for (let az = 5; az < 360; az += 17) {
    const exact = transmitAlong(field, snapshot, az, alt)
    // Refine disputed columns where full-depth cell edges amplify quadrature error.
    const sampled = transmitAlong(field, snapshot, az, alt, field.t, 0.005)
    const fine = Math.abs(exact - sampled) > 0.03
      ? transmitAlong(field, snapshot, az, alt, field.t, 0.001) : sampled
    const error = Math.abs(exact - fine)
    if (error > worst.error) worst = { error, exact, fine }
  }
  console.info({ weatherCode, ...worst })
  expect(worst.error).toBeLessThanOrEqual(0.03)
})

it('keeps the eye beam continuous at six-second steps', () => {
  const moving = { ...input, wind10: { speedKmh: 8, fromDeg: 270 } }
  const start = buildField(moving)
  const sample = (offset: number) => {
    const field = { ...start, t: start.t + offset }
    const snapshot = [layerSnapshot(start, 'low', 0, 0, 50, field.t)]
    return Array.from({ length: 36 }, (_, i) => transmitAlong(field, snapshot, 10 * i, 30))
  }
  let previous = sample(0)
  let worst = 0, direction = 0, interval = 0
  for (let step = 1; step <= 20; step++) {
    const values = sample(step / 10)
    for (const [i, value] of values.entries()) {
      const change = Math.abs(value - previous[i])
      if (change > worst) {
        worst = change
        direction = i
        interval = step - 1
      }
    }
    previous = values
  }
  // Cell edges can cross the beam in a few seconds. Refining the steepest
  // six-second interval must resolve that change, rather than expose a jump.
  let previousBeam = sample(interval / 10)[direction]
  let refined = 0
  for (let step = 1; step <= 60; step++) {
    const beam = sample(interval / 10 + step / 600)[direction]
    refined = Math.max(refined, Math.abs(beam - previousBeam))
    previousBeam = beam
  }
  console.info({ sixSecondBeamStep: worst, refinedBeamStep: refined })
  expect(worst).toBeLessThan(0.7)
  expect(refined).toBeLessThan(worst / 2)
})
