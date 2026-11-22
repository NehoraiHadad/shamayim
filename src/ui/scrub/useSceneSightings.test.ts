import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { airInput } from '../../atmo/airInput'
import { addMinutes } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'
import { makeForecast, TODAY } from '../../test/makeForecast'
import { useSceneSightings } from './useSceneSightings'

const at = `${TODAY}T14:00`
const site = { lat: 31.78, lon: 35.22, timezone: 'Asia/Jerusalem' }
const forecast = makeForecast([{ max: 25, min: 15 }, { max: 25, min: 15 }])
const sighting = { azimuth: 250, distanceKm: 8, widthKm: 6 }
const observation = { at: addMinutes(at, -15), cover: 5, sightings: [sighting] }

function readSightings(now: LocalTime, selected: LocalTime | null) {
  const weather = airInput(forecast, now, site, selected, null, { observedCloud: observation })
  let result: ReturnType<typeof useSceneSightings> | undefined
  function Probe() {
    result = useSceneSightings(weather, observation, now)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  return result
}

afterEach(() => vi.unstubAllGlobals())

it('keeps App sightings and the count off until the selection is cleared', () => {
  vi.stubGlobal('window', { location: { search: '' } })
  for (const offset of [-1, 0, 1]) {
    expect(readSightings(addMinutes(at, offset), at)).toEqual({ seenClouds: [], cloudsSeen: 0 })
  }
  expect(readSightings(at, null)).toEqual({ seenClouds: [{ ...sighting, strength: 1 }], cloudsSeen: 1 })
})

it('applies the same mode to dev-pinned sightings', () => {
  vi.stubGlobal('window', { location: { search: '?seen=95:20:4' } })
  expect(readSightings(at, at)).toEqual({ seenClouds: [], cloudsSeen: 0 })
  expect(readSightings(at, null)).toEqual({
    seenClouds: [{ azimuth: 95, distanceKm: 20, widthKm: 4, strength: 1 }], cloudsSeen: 1,
  })
})
