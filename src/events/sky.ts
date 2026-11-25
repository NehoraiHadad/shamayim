import { moonPosition } from '../astro/moon'
import { sunPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import type { Place } from '../config/place'
import type { FarData } from '../data/city/farData'
import type { LandCover } from '../data/land/landData'
import { israelRegionHe } from '../data/region/israelRegion'
import type { SceneTerrain } from '../data/terrain/terrain'
import { fractionOf } from '../domain/camera'
import { addMinutes } from '../domain/minutes'
import type { Forecast, HourPoint, LocalTime } from '../domain/types'
import { layerCovers } from '../world/clouds'
import { placeEnvOf } from '../world/placeEnv'
import { apparentAltitude } from '../world/skyProjection'
import { sceneSkyline } from '../world/visibleSun'
import type { EventSky } from './types'

const HOUR = 3_600_000
/** A body closer to the horizon than this (deg) is lost in its haze. */
const LOWEST = 0.5

export interface EventSurroundings { cover?: LandCover | null; far?: FarData | null }

let lastGlow: { place: Place; cover: EventSurroundings['cover']; far: EventSurroundings['far']; glow: number } | undefined
function glowOf(place: Place, data: EventSurroundings): number {
  if (lastGlow?.place === place && lastGlow.cover === data.cover && lastGlow.far === data.far) return lastGlow.glow
  const far = data.far && israelRegionHe(place.lat, place.lon) ? data.far : null
  const glow = placeEnvOf(place, { cover: data.cover, far }).glow
  lastGlow = { place, cover: data.cover, far: data.far, glow }
  return glow
}

/** The land as the scene knows it: the ridge in view; beyond the view (the north), and with no land known, the horizon. */
function clearOf(terrain: SceneTerrain): EventSky['clear'] {
  const { angleY, camera } = terrain
  const skyline = angleY ? sceneSkyline(terrain) : null
  return ({ azimuth, altitude }) => {
    if (altitude < LOWEST) return false
    if (!skyline || !angleY) return true
    const x = fractionOf(azimuth, camera)
    return x < 0 || x > 1 || angleY(altitude) < skyline(x)
  }
}

/** The sky from `now` to the next sunrise; null while the land is on its way or the forecast does not hold the days. */
export function eventSky(place: Place, forecast: Forecast, now: LocalTime, terrain: SceneTerrain, surroundings: EventSurroundings = {}): EventSky | null {
  if (terrain.status === 'loading') return null
  const today = forecast.days.findIndex((d) => d.date === now.slice(0, 10))
  if (today < 0) return null
  const evening = now < forecast.days[today].sunrise ? today - 1 : today
  const dusk = forecast.days[evening]?.sunset, dawn = forecast.days[evening + 1]?.sunrise
  if (!dawn) return null
  const { lat, lon, timezone } = place
  const ms = (at: LocalTime) => utcOf(at, timezone).getTime()
  const to = ms(dawn)
  const hours = new Map<number, HourPoint>()
  // The forecast's hours need not be whole hours of UT.
  const whole = ms(`${now.slice(0, 10)}T00:00`) % HOUR
  const hourOf = (at: number) => Math.round((at - whole) / HOUR)
  const first = addMinutes(now, -60), last = addMinutes(dawn, 60)
  for (const hour of forecast.hours) if (hour.time >= first && hour.time <= last) hours.set(hourOf(ms(hour.time)), hour)
  const hourAt = (at: number) => hours.get(hourOf(at)) ?? null
  const body = (position: typeof sunPosition | typeof moonPosition) => (at: number) => {
    const { altitude, azimuth } = position(new Date(at), lat, lon)
    return { azimuth, altitude: apparentAltitude(altitude) }
  }
  return {
    place: { lat, lon, timezone, elevation: place.elevation ?? forecast.elevation }, from: ms(now), to,
    night: { from: dusk ? ms(dusk) : to - 12 * HOUR, to }, glow: glowOf(place, surroundings), hourAt,
    coversAt: (at) => {
      const hour = hourAt(at)
      return hour && layerCovers({ cloudCover: hour.cloudCover, thickCloud: hour.thickCloud, hour }).covers
    },
    clear: clearOf(terrain), sunAt: body(sunPosition), moonAt: body(moonPosition),
  }
}
