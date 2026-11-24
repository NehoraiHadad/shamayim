import { expect, it } from 'vitest'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import { addMinutes } from '../../domain/minutes'
import type { HourPoint, LocalTime } from '../../domain/types'
import layers from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { buildField } from './field'
import { airFrames } from './handover'

const { hours } = mapForecast(layers)
/** A wind that turns by 50° and changes its speed at every hour. */
const turning = hours.map((hour, i): HourPoint => ({ ...hour, windSpeed: 10 + 12 * (i % 3), windDirection: 50 * i % 360, windAloft: null }))

const fieldAt = (of: HourPoint[], at: LocalTime) => buildField({
  placeId: 'haifa', at, hours: of, covers: { low: 0.6, mid: 0.6, high: 0.6 }, lowBaseKm: 1.1, elevationKm: 0.05, weatherCode: 2,
  sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
})
const START = '2026-11-17T20:00' as LocalTime, MINUTES = 8 * 60, MIDNIGHT = 4 * 60
/** The most an air may show (its share) when it comes or goes: at the half-window's first minute. */
const FAINT = 0.001

it.each([['the recorded wind', hours], ['a wind turning every hour', turning]])(
  'carries each air by the integral of the wind, through every hour and across midnight, in %s', (_, of) => {
    let before = fieldAt(of, START)
    for (let minute = 1; minute <= MINUTES; minute++) {
      const now = fieldAt(of, addMinutes(START, minute))
      now.layers.forEach((layer, i) => {
        const last = before.layers[i]
        const old = airFrames(last, before.t), frames = airFrames(layer, now.t)
        expect(frames.length, `${minute}`).toBe(Math.abs(minute - MIDNIGHT) < 30 ? 2 : 1)
        expect(frames.reduce((sum, { weight }) => sum + weight, 0)).toBeCloseTo(1, 12)
        // The wind between two hours is linear, so a minute of it is the mean of its ends.
        const step = [0, 1].map((k) => (last.vel[k] + layer.vel[k]) / 2)
        const carried = ({ d }: typeof old[number]) => frames.find((frame) =>
          step.every((v, k) => Math.abs(frame.d[k] - d[k] - v) < 1e-6))
        const met = old.map(carried)
        // An air that ends, or begins, does it unseen.
        old.forEach((frame, k) => { if (!met[k]) expect(frame.weight, `${minute}`).toBeLessThan(FAINT) })
        for (const frame of frames) if (!met.includes(frame)) expect(frame.weight, `${minute}`).toBeLessThan(FAINT)
        for (const [k, frame] of met.entries()) if (frame) expect(Math.abs(frame.weight - old[k].weight)).toBeLessThan(0.03)
      })
      before = now
    }
  })