import { describe, expect, it } from 'vitest'
import { ROUTES } from '../../../worker/src/routes'
import { canonicalQuery } from '../../../worker/src/validate'
import { SHADMOT_MEHOLA } from '../../config/place'
import { recentWeatherUrl } from '../land/recentWeather'
import { airUrl, forecastUrl } from './request'

/** The Worker refuses any parameter it does not list; the app's real requests must pass it, or production breaks. */
describe('app requests pass the Worker allowlist', () => {
  const place = { ...SHADMOT_MEHOLA, lat: 31.4858455, lon: 35.1651529 }
  it.each([['/v1/forecast', forecastUrl(place)], ['/v1/air-quality', airUrl(place)],
    // The scene's hourly fields: the Worker in the repo knows them, so flipping ASK_SCENE_HOURLY is safe once it is deployed.
    ['/v1/forecast', forecastUrl(place, { sceneHourly: true })],
    // Living-land past precipitation (60 d) and soil moisture on its dedicated narrow route: gated behind ASK_LAND_WEATHER.
    ['/v1/land-weather', recentWeatherUrl(place)],
    // CAPE and the freezing level: listed in the repo Worker, asked once it is deployed (ASK_STORM_HOURLY).
    ['/v1/forecast', forecastUrl(place, { stormHourly: true })]] as const)('%s', (path, url) => {
    const result = canonicalQuery(ROUTES[path], new URL(url).searchParams)
    expect(result).toMatchObject({ ok: true })
  })
})
