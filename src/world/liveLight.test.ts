import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { utcOf } from '../astro/utc'
import { withForecastRefresh } from '../domain/forecastRefresh'
import { addMinutes } from '../domain/minutes'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { sceneClock } from '../ui/useNow'
import { faceLight } from './livingLight'
import type { WorldState } from './types'
import { makeWorldBuilder, shownAir } from './world'

const JERUSALEM = SCENE_PLACES.find((place) => place.id === 'jerusalem')!
const START = '2026-11-17T12:30'
const READING = '2026-11-17T12:50'
const RECEIPT = '2026-11-17T13:10'
const times = Array.from({ length: 121 }, (_, minute) => addMinutes(START, minute))
const stamp = (at: LocalTime) => utcOf(at, JERUSALEM.timezone).getTime()
const lightReading = ({ light }: WorldState) => [light.direct, ...Object.values(faceLight(light.dir, light.direct))]
const fieldReading = (world: WorldState) => world.cloudField!.field.layers.map(({ d, vel, cover, form }) => ({ d, vel, cover, form }))
const difference = (a: number[], b: number[]) => Math.max(...a.map((value, i) => Math.abs(value - b[i])))
const maxStep = (readings: number[][]) => Math.max(...readings.slice(1).map((current, i) => difference(current, readings[i])))

let loaded: LoadedPlace
let bound: number
beforeAll(async () => {
  stubPublicFetch()
  loaded = (await loadPlaces([JERUSALEM])).get(JERUSALEM.id)!
  const input = worldInput(loaded, START)
  const build = makeWorldBuilder()
  const scrubMax = maxStep(times.map((at) => lightReading(build({ ...input, now: at, selected: at }))))
  bound = 2 * scrubMax + 0.01
  console.info('Jerusalem scrub baseline', { scrubMax, bound })
})
afterAll(() => vi.unstubAllGlobals())

function recentReading(base: Forecast): Forecast {
  return { ...base, observation: undefined, current: { ...(base.observation ?? base.current), time: READING,
    cloudCover: 88, thickCloud: 85, visibility: 15_000 },
    fetchedAt: stamp(READING) }
}

function refreshed(base: Forecast, changeHours = false): Forecast {
  return withForecastRefresh({
    ...base,
    fetchedAt: stamp(addMinutes(RECEIPT, -12)),
    current: { ...base.current, time: RECEIPT, cloudCover: 92, thickCloud: 89, visibility: 14_000, windDirection: 325 },
    hours: changeHours ? base.hours.map((h) => ({ ...h, visibility: 10_000 })) : base.hours,
  }, base, stamp(RECEIPT))
}

describe('live weather and light', () => {
  it('carries a fresh reading through the app rollover and eases in a refetch with an older provider timestamp', () => {
    const build = makeWorldBuilder()
    const input = worldInput(loaded, START)
    const baseline = recentReading(input.forecast)
    const sweep = (forecastAt: (at: LocalTime) => Forecast) => times.map((now) =>
      lightReading(build({ ...input, now, forecast: rollForward(forecastAt(now), now) })))

    const rollover = '2026-11-17T13:00'
    const beforeRollover = addMinutes(rollover, -1)
    const rolled = rollForward(baseline, rollover)
    expect(rolled.current.time).toBe(rollover)
    expect(rolled.observation?.time).toBe(READING)
    expect(shownAir({ ...input, now: rollover, forecast: rolled }).cloudCover).toBe(baseline.current.cloudCover)
    expect(shownAir({ ...input, now: beforeRollover, forecast: baseline }).cloudCover).toBe(baseline.current.cloudCover)
    const liveNow = build({ ...input, now: rollover, forecast: baseline })
    const scrubNow = build({ ...input, now: rollover, selected: rollover, forecast: rolled })
    expect(fieldReading(scrubNow)).toEqual(fieldReading(liveNow))
    expect(scrubNow.light).toEqual(liveNow.light)
    expect(scrubNow.rain).toEqual(liveNow.rain)

    const incoming = refreshed(baseline)
    const live = sweep(() => baseline)
    const refetched = sweep((at) => at < RECEIPT ? baseline : incoming)
    const rolloverIndex = times.indexOf(rollover)
    const receiptIndex = times.indexOf(RECEIPT)
    const rolloverStep = difference(live[rolloverIndex - 1], live[rolloverIndex])
    const liveMax = maxStep(live)
    const refetchMax = maxStep(refetched)
    const acrossRefetch = difference(refetched[receiptIndex - 1], refetched[receiptIndex + 1])
    console.info('Jerusalem live minute-step maxima', { rolloverStep, liveMax, refetchMax, acrossRefetch })
    // Measured with HEAD's builder and rollover on the same reading: 0.10574905, above the bound.
    expect(rolloverStep).toBeLessThan(bound)
    expect(liveMax).toBeLessThan(bound)
    expect(refetchMax).toBeLessThan(bound)
    expect(acrossRefetch).toBeLessThan(bound)
    expect(refetched[receiptIndex]).toEqual(live[receiptIndex])
    expect(difference(refetched[receiptIndex + 10], live[receiptIndex + 10])).toBeGreaterThan(0.001)

    const halfway = addMinutes(RECEIPT, 5)
    const visibility = (forecast: Forecast) => build({ ...input, now: halfway, forecast }).air.visibilityKm
    const hourlyVisibility = visibility(input.forecast)
    const incomingVisibility = (hourlyVisibility + incoming.current.visibility! / 1000) / 2
    expect(visibility(incoming)).toBeCloseTo((visibility(baseline) + incomingVisibility) / 2)
  })

  it.each(['2026-11-17T10:00', '2026-11-18T10:00'])('eases light through a refresh while scrub is held at %s', (selected) => {
    const input = worldInput(loaded, START, selected)
    const base = recentReading(input.forecast)
    const incoming = refreshed(base, true)
    const build = makeWorldBuilder()
    const render = (forecast: Forecast, now: LocalTime) => lightReading(build({ ...input, now, forecast: rollForward(forecast, now) }))
    const sweep = Array.from({ length: 12 }, (_, i) => addMinutes(RECEIPT, i - 1))
    const light = sweep.map((now) => render(now < RECEIPT ? base : incoming, now))
    const step = maxStep(light)
    console.info('Jerusalem held scrub maximum', { selected, step })
    expect(light[1]).toEqual(light[0])
    expect(step).toBeLessThan(bound)
    expect(difference(light[11], light[0])).toBeGreaterThan(bound)
  })

  it('keeps the outgoing light and air when a second refresh interrupts an active transition', () => {
    const input = worldInput(loaded, START)
    const base = recentReading(input.forecast)
    const first = refreshed(base, true)
    const second = addMinutes(RECEIPT, 4)
    const replacement = withForecastRefresh({ ...base, fetchedAt: stamp(second),
      hours: base.hours.map((h) => ({ ...h, cloudCover: 100, visibility: 5000, windDirection: 10 })),
    }, first, stamp(second))
    const build = makeWorldBuilder()
    const render = (forecast: Forecast, now: LocalTime) => build({ ...input, forecast: rollForward(forecast, now), now })
    const outgoing = render(first, second)
    const incoming = render(replacement, second)
    expect(lightReading(incoming)).toEqual(lightReading(outgoing))
    expect(incoming.air.visibilityKm).toBe(outgoing.air.visibilityKm)
    expect(incoming.wind).toEqual(outgoing.wind)
    expect(incoming.clouds).toEqual(outgoing.clouds)
    expect(fieldReading(incoming)).toEqual(fieldReading(outgoing))
    expect(incoming.light.eye).toBe(outgoing.light.eye)
    expect(incoming.rain).toEqual(outgoing.rain)
    expect(render(replacement, addMinutes(second, 35)).air.visibilityKm).toBeCloseTo(5)
  })

  it('keeps pinned weather time fixed and accepts data on its advancing receipt clock', () => {
    const input = worldInput(loaded, RECEIPT)
    const base = recentReading(input.forecast)
    const wallMs = Date.UTC(2026, 10, 22, 16)
    const atReceipt = sceneClock(JERUSALEM.timezone, RECEIPT, wallMs, wallMs)
    const settled = sceneClock(JERUSALEM.timezone, RECEIPT, wallMs, wallMs + 600_000)
    expect(atReceipt.arrivalMs).toBe(stamp(RECEIPT))
    expect(atReceipt.arrivalMs).toBeLessThan(wallMs)
    expect(settled.now).toBe(RECEIPT)
    const incoming = withForecastRefresh({
      ...base, fetchedAt: wallMs,
      current: { ...base.current, time: RECEIPT, visibility: 5000 },
    }, base, atReceipt.arrivalMs)
    const build = makeWorldBuilder()
    const original = build({ ...input, ...atReceipt, forecast: base })
    const firstFrame = build({ ...input, ...atReceipt, forecast: incoming })
    const afterRamp = build({ ...input, ...settled, forecast: incoming })
    expect(lightReading(firstFrame)).toEqual(lightReading(original))
    expect(afterRamp.air.visibilityKm).toBeCloseTo(5)
    expect(afterRamp.at).toBe(original.at)
    expect(difference(lightReading(afterRamp), lightReading(original))).toBeGreaterThan(0.01)
  })
})
