import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { airInput } from '../atmo/airInput'
import { utcOf } from '../astro/utc'
import { withForecastRefresh } from '../domain/forecastRefresh'
import { addMinutes } from '../domain/minutes'
import type { Forecast, LocalTime } from '../domain/types'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../test/sceneWorld'
import type { WorldInput } from './types'
import { makeWorldBuilder } from './world'

/** The scene is a function of the data and the minute, not of which way the data came: the network or the device's store. */
const HAIFA = SCENE_PLACES.find((place) => place.id === 'haifa')!
/** The recorded storm: the reading and the hours disagree (11 against 2.8 mm/h), so the reading's weight shows. */
const RECEIPT = '2026-03-15T12:00'
const stamp = (at: LocalTime) => utcOf(at, HAIFA.timezone).getTime()
const later = (minutes: number) => addMinutes(RECEIPT, minutes)
/** What a reload reads back of what the first load stored (`data/cache.ts`). */
const reloaded = (forecast: Forecast) => JSON.parse(JSON.stringify(forecast)) as Forecast
const shown = (forecast: Forecast, now: LocalTime) => airInput(forecast, now, HAIFA, null)
let input: WorldInput

beforeAll(async () => {
  stubPublicFetch()
  input = worldInput((await loadPlaces([HAIFA])).get(HAIFA.id)!, RECEIPT)
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

describe('the way a forecast reached the scene', () => {
  it.each([0, 3, 5, 10])('a first load and a reload show one weather, %i min after receipt', (minutes) => {
    const first = withForecastRefresh(input.forecast, null, stamp(RECEIPT))
    expect(shown(first, later(minutes))).toEqual(shown(reloaded(input.forecast), later(minutes)))
  })

  it('a first load and a reload build one world', () => {
    const world = (forecast: Forecast) => {
      const { light, air, clouds, rain, wind, ground, night, optics } = makeWorldBuilder()({ ...input, forecast })
      return { light, air, clouds, rain, wind, ground, night, optics }
    }
    const first = world(withForecastRefresh(input.forecast, null, stamp(RECEIPT)))
    const reload = world(reloaded(input.forecast))
    expect(JSON.stringify(first)).toBe(JSON.stringify(reload))
  })

  it('shows the reading of a place switched to as the place opened directly does', () => {
    const elsewhere = { ...input.forecast, placeId: 'elsewhere' }
    expect(shown(withForecastRefresh(input.forecast, elsewhere, stamp(RECEIPT)), RECEIPT)).toEqual(shown(input.forecast, RECEIPT))
  })

  it('a refetch that brings the same data changes nothing at any minute of its ease', () => {
    const refetched = withForecastRefresh(input.forecast, reloaded(input.forecast), stamp(RECEIPT))
    for (let minute = 0; minute <= 10; minute++) {
      const before = shown(input.forecast, later(minute)), during = shown(refetched, later(minute))
      for (const key of ['cloudCover', 'rainMmH', 'visibilityKm', 'temperature', 'windSpeed', 'thunderWeight'] as const) {
        expect(during[key], `${key} at +${minute}`).toBeCloseTo(before[key]!, 9)
      }
    }
  })
})
