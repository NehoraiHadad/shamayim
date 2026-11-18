import type { SceneTerrain } from '../../data/terrain/terrain'
import { addMinutes, minutesBetween } from '../../domain/time'
import type { Forecast } from '../../domain/types'
import { skylineOf, withHorizon, type Skyline } from './skyline'
import { sunOverRidge, type SunSite } from './sunPath'

/** The skyline the scene draws for a terrain (the upper of its two ridges, with eye level when it is a panorama). */
export function sceneSkyline(terrain: SceneTerrain): Skyline {
  return withHorizon(skylineOf(terrain.farPoints, terrain.nearPoints), terrain.horizonY)
}

/**
 * The forecast with each day's visible sunrise and sunset: when the drawn sun comes over the land of the horizon panorama
 * and goes behind it. Unchanged until a panorama is known (the stand-in drawings say nothing about the real land).
 * The flat-horizon `sunrise`/`sunset` stay as they are; the sun's path is measured from them.
 */
export function withVisibleSun(forecast: Forecast, terrain: SceneTerrain, site: SunSite): Forecast {
  if (terrain.horizonY === undefined) return forecast
  const skyline = sceneSkyline(terrain)
  const days = forecast.days.map((day) => {
    const length = minutesBetween(day.sunrise, day.sunset)
    if (length <= 0) return day
    const rise = sunOverRidge(0, day.sunrise, day.sunset, site, skyline)
    const set = sunOverRidge(1, day.sunrise, day.sunset, site, skyline)
    return { ...day, visibleSunrise: addMinutes(day.sunrise, rise.t * length), visibleSunset: addMinutes(day.sunrise, set.t * length) }
  })
  return { ...forecast, days }
}
