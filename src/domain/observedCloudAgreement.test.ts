import { describe, expect, it } from 'vitest'
import { makeForecast } from '../test/makeForecast'
import { correctCloudCover, withObservedCloud, type CloudObservation } from './observedCloud'
import type { Forecast } from './types'

const AT = '2026-11-24T16:30', NOW = '2026-11-24T16:50'
/** The cover at 16:50 of a model that says `model` all evening, by the satellite's covers of 16:30, 16:15 and 16:00. */
const coverNow = (model: number, [cover, ...before]: number[], rest: Partial<CloudObservation> = {}) =>
  correctCloudCover({ at: AT, cover, before, daylight: 1, ...rest }, NOW, undefined, model, () => model)
/** As one slot alone is taken, whatever came before it. */
const capped = (model: number, [cover]: number[]) => coverNow(model, [cover])

describe('slots that agree', () => {
  it('clear a sky the model clouds, and cloud one it clears', () => {
    expect(coverNow(53, [0, 0, 0], { daylight: 0 })).toBe(0)
    expect(coverNow(53, [1, 0, 2])).toBeCloseTo(1)
    expect(coverNow(95, [0, 0, 0])).toBe(0)
    expect(coverNow(20, [100, 99, 100])).toBe(100)
  })
  it('leave the cap alone unless they are three', () => {
    expect(coverNow(53, [0])).toBe(13)
    expect(coverNow(53, [0, 0])).toBe(13)
    expect(coverNow(53, [0, 0, 0, 80])).toBe(0)
  })
  it('leave a partly cloudy sky as it was', () => {
    for (const series of [[30, 30, 30], [12, 20, 15], [85, 80, 88], [50, 0, 100]]) {
      for (const model of [0, 40, 53, 80, 100]) expect(coverNow(model, series)).toBe(capped(model, series))
    }
  })
  it('do not let a single wrong slot, clear or cloudy, pass the cap', () => {
    expect(coverNow(80, [0, 60, 55])).toBe(40)
    expect(coverNow(80, [0, 0, 60])).toBe(40)
    expect(coverNow(80, [0, 60, 0])).toBe(40)
    expect(coverNow(10, [100, 20, 0])).toBe(50)
  })
  it('pass from the cap to none without a jump, however the slots and the model change', () => {
    const walk = (steps: number, sky: (share: number) => number) => {
      const covers = Array.from({ length: steps + 1 }, (_, k) => sky(k / steps))
      return Math.max(...covers.slice(1).map((cover, k) => Math.abs(cover - covers[k])))
    }
    expect(walk(1000, (s) => coverNow(90, [0, 0, 20 * s]))).toBeLessThan(0.3)
    expect(walk(1000, (s) => coverNow(90, [20 * s, 0, 0]))).toBeLessThan(0.3)
    expect(walk(1000, (s) => coverNow(100 * s, [0, 0, 0], { daylight: 0 }))).toBeLessThan(0.6)
    expect(walk(1000, (s) => coverNow(95, [0, 0, 0], { daylight: s }))).toBeLessThan(0.2)
  })
  it('keep the clouds of a model in order: more of them never leaves fewer', () => {
    for (const daylight of [0, 0.5, 1]) {
      const left = Array.from({ length: 101 }, (_, model) => coverNow(model, [0, 0, 0], { daylight }))
      left.slice(1).forEach((cover, k) => expect(cover).toBeGreaterThanOrEqual(left[k]))
    }
  })
})

describe('fog at dawn', () => {
  it('stays when the models are sure of it and the mask, which can miss it without the sun, is clear', () => {
    expect(coverNow(97, [0, 0, 0], { daylight: 0 })).toBe(57)
    expect(coverNow(97, [0, 0, 0], { daylight: undefined })).toBe(57)
    expect(coverNow(100, [0, 0, 0], { daylight: 0 })).toBe(60)
  })
  it('goes once the sun is up and the mask still sees none', () => {
    expect(coverNow(97, [0, 0, 0], { daylight: 1 })).toBe(0)
  })
})

describe('time and receipt', () => {
  const clear: CloudObservation = { at: AT, cover: 0, before: [0, 0], daylight: 0 }
  it('fade an agreed clear sky back to the model as any correction', () => {
    const at = (minute: string) => correctCloudCover(clear, minute, undefined, 53, () => 53)
    expect(at('2026-11-24T16:29')).toBe(53)
    expect(at('2026-11-24T17:10')).toBe(0)
    expect(at('2026-11-24T18:05')).toBeCloseTo(53 / 2)
    expect(at('2026-11-24T19:00')).toBe(53)
  })
  it('ease into it from what one slot said', () => {
    const received = 1_000_000
    const next: CloudObservation = { ...clear, receivedAt: received, previous: { at: '2026-11-24T16:15', cover: 0 } }
    const after = (minutes: number) => correctCloudCover(next, NOW, received + minutes * 60_000, 53, () => 53)
    expect(after(0)).toBe(13)
    expect(after(5)).toBeCloseTo(6.5)
    expect(after(10)).toBe(0)
  })
  it('clear the card of the evening at Shadmot Mehola', () => {
    const hours = [['16:00', 28], ['17:00', 33], ['18:00', 30]].map(([time, cloudCover]) => ({ time: `2026-11-24T${time}`,
      temperature: 20, precipProb: 0, precipitation: 0, weatherCode: 1, cloudCover: cloudCover as number, windSpeed: 5,
      windGusts: 9, humidity: 60, snowDepth: 0 }))
    const forecast: Forecast = { ...makeForecast([]), hours, current: { time: '2026-11-24T16:45', temperature: 20, feelsLike: 20,
      isDay: false, weatherCode: 2, cloudCover: 53, windSpeed: 5, windGusts: 9, windDirection: 270, precipitation: 0,
      snowfall: 0, visibility: null, humidity: 60 } }
    const card = (obs: CloudObservation) => withObservedCloud(forecast, obs, NOW).current
    expect(card({ at: AT, cover: 0 })).toMatchObject({ cloudCover: 13, weatherCode: 0 })
    expect(card(clear)).toMatchObject({ cloudCover: 0, weatherCode: 0 })
  })
})

describe('short-range satellite persistence', () => {
  const sample: CloudObservation = { at: AT, cover: 0, before: [0, 0], daylight: 0, calibratedPersistence: true }
  const at = '2026-11-24T17:30'

  it('keeps a repeatedly clear sky closer to the observed sky at an hour of lead', () => {
    const model = () => 53
    const previous = correctCloudCover({ ...sample, calibratedPersistence: false }, at, undefined, 53, model)
    const corrected = correctCloudCover(sample, at, undefined, 53, model)
    expect(corrected).toBeLessThan(previous / 2)
    expect(correctCloudCover(sample, '2026-11-24T16:29', undefined, 53, model)).toBe(53)
    expect(correctCloudCover(sample, '2026-11-24T18:15', undefined, 53, model))
      .toBe(correctCloudCover({ ...sample, calibratedPersistence: false }, '2026-11-24T18:15', undefined, 53, model))
  })

  it('needs both prior frames and respects the limits of a dark or rapidly changing sky', () => {
    const model = () => 53
    const oneGap = { ...sample, before: [0] }
    expect(correctCloudCover(oneGap, at, undefined, 53, model))
      .toBe(correctCloudCover({ ...oneGap, calibratedPersistence: false }, at, undefined, 53, model))
    expect(correctCloudCover(sample, at, undefined, 97, () => 97))
      .toBe(correctCloudCover({ ...sample, calibratedPersistence: false }, at, undefined, 97, () => 97))
    expect(correctCloudCover({ ...sample, daylight: 1 }, at, undefined, 90, () => 0)).toBe(90)
  })
})
