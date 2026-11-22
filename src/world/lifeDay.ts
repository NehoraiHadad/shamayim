import { airInput } from '../atmo/airInput'
import { moonIllumination, moonPosition } from '../astro/moon'
import { sunPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import type { Camera } from '../domain/camera'
import { addMinutes } from '../domain/minutes'
import type { LocalTime } from '../domain/types'
import { airOf } from './air'
import { layerCovers } from './clouds'
import { cloudTransmit } from './light'
import type { LifeInput } from './life'
import { dayBefore, lifeAt, lifeSchedule, secondsOf, type FlightContext, type LifeSchedule } from './lifeSchedule'
import { nightOf } from './night'
import type { PlaceEnv } from './placeEnv'
import { rainingLayer, rainOf } from './rain'
import { smoothstep } from './ridgeLighting'
import { hazeDirect } from './sceneLight'
import type { SkyLife } from './life'
import type { WorldInput } from './types'
import { windOf } from './wind'

/*
 * The day's life schedule samples the same weather timeline and the sun and moon at each minute. Beyond the
 * forecast's hourly coverage it holds the nearest hour.
 */

const KMH = 3.6

/** The life input at a moment of the day, as the world builder makes it for the shown minute, from the hour's data. */
export function lifeInputAt(input: WorldInput, at: LocalTime, base: { camera: Camera; env: PlaceEnv }): LifeInput {
  const { forecast, place } = input
  const hours = forecast.hours
  // Held inside the forecast's hours, so nothing here depends on the clock.
  const first = hours[0]?.time, last = hours.at(-1)?.time
  const held = first && at < first ? first : last && at > `${last.slice(0, 13)}:59` ? last : at
  const forced = input.forced ?? {}
  const shown = airInput(forecast, input.now, place, held, forced, input)
  const hour = hours.find((h) => h.time === `${held.slice(0, 13)}:00`)
  const instant = utcOf(at, place.timezone)
  const sun = sunPosition(instant, place.lat, place.lon)
  const { air } = airOf({ shown, visibilitySource: shown.visibilitySource, forcedVisibility: 'visibilityKm' in forced })
  const { wind } = windOf({ speedKmh: shown.windSpeed, gustKmh: shown.windGusts, shownFromDeg: shown.windDirection,
    directionSource: shown.directionSource, aloft: shown.windAloft,
    forced: 'windDirection' in forced }, base.camera)
  const rate = rainOf(shown)
  const given = input.forcedLayers ?? ('cloudCover' in forced || 'thickCloud' in forced
    ? layerCovers({ cloudCover: shown.cloudCover, thickCloud: shown.thickCloud, hour }).covers : shown.covers)
  const covers = rainingLayer(given, Math.max(rate, shown.snowCloudRate)).covers
  const night = nightOf(shown, covers)
  const high = shown.windAloft.high
  const moon = moonPosition(instant, place.lat, place.lon)
  return {
    placeId: place.id, lat: place.lat, lon: place.lon, at, timezone: place.timezone, camera: base.camera, groundM: forecast.elevation,
    env: base.env, sun: { altitude: sun.altitude, azimuth: sun.azimuth },
    direct: smoothstep(-0.3, 1.7, sun.altitude) * hazeDirect(sun.altitude, air) * cloudTransmit(covers),
    dark: night.dark, temperature: shown.temperature, covers, rainMmH: rate, thunder: shown.thunderWeight,
    wind: { fromDeg: wind.fromDeg, towardDeg: wind.towardDeg, ms: wind.ms, gustMs: wind.gustMs },
    highWind: high ? { towardDeg: (high.fromDeg + 180) % 360, ms: high.speed / KMH } : { towardDeg: wind.towardDeg, ms: wind.aloft.high },
    hour, starsThrough: night.starsThrough, moon: { altitude: moon.altitude, illumination: moonIllumination(instant).fraction },
    visibilityKm: air.visibilityKm,
  }
}

/**
 * Keeps the day schedules of life (one per date) while their inputs stay the same objects: a scrub through the day (and
 * over midnight) evaluates them, never redraws them.
 */
export function makeLifeDays() {
  let parts: unknown[] = []
  const days = new Map<string, LifeSchedule>()
  return function lifeOf(input: WorldInput, at: LocalTime, shown: LifeInput, base: { camera: Camera; env: PlaceEnv },
    flight: FlightContext | undefined, keyParts: unknown[]): SkyLife {
    if (keyParts.length !== parts.length || keyParts.some((p, i) => !Object.is(p, parts[i]))) {
      parts = keyParts
      days.clear()
    }
    const schedule = (date: string) => {
      let s = days.get(date)
      if (!s) {
        s = lifeSchedule({ placeId: input.place.id, date, camera: base.camera, lat: input.place.lat, lon: input.place.lon, flight },
          (moment) => lifeInputAt(input, moment, base))
        if (days.size > 4) days.delete(days.keys().next().value!)
        days.set(date, s)
      }
      return s
    }
    // Move the schedule through local dates while the shown sky, light and weather stay at the selected minute.
    const lifeAtMinute = input.lifeOffsetMinutes ? addMinutes(at, input.lifeOffsetMinutes) : at
    const date = lifeAtMinute.slice(0, 10)
    return lifeAt([{ schedule: schedule(dayBefore(date)), offsetS: -86_400 }, { schedule: schedule(date), offsetS: 0 }], secondsOf(lifeAtMinute), shown,
      flight?.terrain.blockedKm)
  }
}
