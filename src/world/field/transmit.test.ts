import { expect, it } from 'vitest'
import { altitudeOf } from './project'
import { transmitAlong } from './transmit'
import { buildField } from './field'
import { layerSnapshot } from './density'

it('dims the disc behind a seeded cell and leaves an uncovered direction clear', () => {
  const field = buildField({ placeId: 'disc-test', hours: [], at: '2026-11-17T12:00',
    covers: { low: 0.25, mid: 0, high: 0 }, lowBaseKm: 1.1, elevationKm: 0,
    weatherCode: 0, sunAltitude: 30, wind10: { speedKmh: 0, fromDeg: 0 } })
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
