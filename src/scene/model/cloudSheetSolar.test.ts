import { expect, it } from 'vitest'
import { frame, neutral, percentile } from '../../test/cloudSheetFrame'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { transmitAlong } from '../../world/field/transmit'
import { cloudSheetOf, sheetPathFactor } from './cloudSheet'

it.each(['jerusalem', 'haifa', 'tiberias'])('compares sheet and light transmission in %s', place => {
  const at = frame(place, '2026-11-17T12:00')
  const sun = at.world.bodies.sun.azimuth
  const direction = { ...at.geom, azimuthAt: (x: number) => at.geom.azimuthAt(x) - at.geom.azimuthAt(0) + sun }
  const errors: number[] = []
  for (const { lattice } of at.field.layers) {
    if (lattice === 'tower') continue
    const snapshot = layerSnapshot(at.field, lattice, 0, 0, RANGES[lattice][1])
    const sheet = cloudSheetOf(at.world, direction, snapshot, neutral)!
    const row = sheet.ys.findIndex(y => direction.domeAltitudeAt(y) <= 40)
    const altitude = direction.domeAltitudeAt(sheet.ys[row])
    expect(altitude).toBeGreaterThan(25)
    const world = { ...at.world, bodies: { ...at.world.bodies, sun: { ...at.world.bodies.sun, altitude } } }
    const solarSheet = cloudSheetOf(world, direction, snapshot, neutral)!
    // Check the rendered solar node against independent 20 m column quadrature.
    const light = transmitAlong(at.field, [snapshot], sun, altitude, at.field.t, 0.02)
    const transmission = 1 - solarSheet.alpha[row * solarSheet.xs.length]
    const error = Math.abs(transmission - light)
    console.info(place, lattice, { altitude, sheet: transmission, light, error })
    errors.push(error)
    expect.soft(error, lattice).toBeLessThanOrEqual(0.20)
  }
  console.info(place, { max: percentile(errors, 1), p95: percentile(errors, 0.95), nodes: errors.length })
  expect(sheetPathFactor(1, 0.3, 90, 100)).toBe(1)
})
