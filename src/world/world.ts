import { airInput } from '../atmo/airInput'
import type { AirInput } from '../atmo/airTypes'
import { hashId } from '../data/landmarks/hash'
import { anglePx, RELIEF } from '../data/terrain/angleScale'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import { datePart } from '../domain/time'
import type { HourPoint, LocalTime } from '../domain/types'
import { skyLight } from '../theme/skyLight'
import { airOf } from './air'
import { moonBody, sunBody } from './bodies'
import { cloudLayers, layerCovers } from './clouds'
import { partKey } from './keys'
import { lightOf } from './light'
import { nightOf } from './night'
import { placeOf } from './place'
import { rainFrom, rainingLayer, rainOf } from './rain'
import { HORIZON_Y, SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { snowFall } from './snowLine'
import { terrainPlanes } from './terrain'
import type { WorldInput, WorldState } from './types'
import { sceneSkyline } from './visibleSun'
import { waterOf } from './water'
import { windOf } from './wind'

const hourKey = (at: LocalTime) => `${at.slice(0, 13)}:00`

/**
 * The air of the shown minute exactly as App reduces it for the SVG scene (`airInput`: a picked hour's rain, cloud, wind
 * and temperature, now's direction and visibility), with the satellite's single clouds and the dev overrides.
 */
export function shownAir(input: Pick<WorldInput, 'forecast' | 'now' | 'place' | 'selected' | 'seenClouds' | 'forced'>): AirInput {
  const { forecast, now, place, selected } = input
  return { ...airInput(forecast, now, place, selected), cloudsSeen: selected ? 0 : input.seenClouds?.length ?? 0, ...input.forced }
}

/**
 * How wet the ground is (0–1): the shown hour's rain, and the rain of the three hours before it, fading as it dries
 * (0.8 mm/h counts as soaked).
 */
export function groundWet(hours: readonly HourPoint[], at: LocalTime, shownRate: number): number {
  const index = hours.findIndex((h) => h.time === hourKey(at))
  let wet = Math.min(1, shownRate / 0.8)
  for (let k = 1; k <= 3 && index - k >= 0; k++) wet = Math.max(wet, Math.min(1, hours[index - k].precipitation / 0.8) * (1 - k / 4))
  return wet
}

/** Remembers its last result while every argument is the same object or value. */
function memoOne<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; result: R } | null = null
  return (...args: A) => {
    if (last && last.args.length === args.length && last.args.every((a, i) => Object.is(a, args[i]))) return last.result
    const result = fn(...args)
    last = { args, result }
    return result
  }
}

/**
 * A world builder that keeps each part while its own inputs stay the same object: a change of hour rebuilds the light,
 * air and weather, never the terrain, the place or the marks.
 */
export function makeWorldBuilder() {
  const skylineOf = memoOne((terrain: SceneTerrain): Skyline => sceneSkyline(terrain))
  const sunSkylineOf = memoOne((terrain: SceneTerrain): Skyline => sceneSkyline(terrain))
  const planesOf = memoOne(terrainPlanes)
  const placePart = memoOne((place: WorldInput['place'], terrain: SceneTerrain, landmarks: WorldInput['landmarks'],
    city: WorldInput['city'], width: number, elevation: number) => {
    const part = placeOf({ place, terrain, landmarks, city, width, elevation })
    return { ...part, placeKey: partKey([part.place3, part.labels], 1), marksKey: partKey(part.marks, 1) }
  })
  const terrainKey = memoOne((terrain: SceneTerrain) => partKey([terrain.nearPoints, terrain.farPoints, terrain.horizonY, terrain.water], 2))

  return function buildWorld(input: WorldInput): WorldState {
    const { place, forecast, now, selected, terrain } = input
    const at = selected ?? now
    const preview = selected !== null
    const camera = terrain.camera ?? SCENE_CAMERA
    const width = input.width ?? SCENE_W
    const seed = hashId(place.id)
    const skyline = skylineOf(terrain)
    const sunSkyline = input.sunTerrain ? sunSkylineOf(input.sunTerrain) : skyline
    const shown = shownAir(input)
    const hour = forecast.hours.find((h) => h.time === hourKey(at))
    const day = forecast.days.find((d) => d.date === datePart(at))
    const forced = input.forced ?? {}

    const sun = sunBody(at, day, place, skyline, sunSkyline)
    const moon = moonBody(at, place, skyline, sun)
    const { air, source: visibilitySource } = airOf({ shown, hourVisibilityM: hour?.visibility, preview,
      forcedVisibility: 'visibilityKm' in forced })
    const { wind, sources: windSources } = windOf({ speedKmh: shown.windSpeed, gustKmh: shown.windGusts, shownFromDeg: shown.windDirection,
      hour, preview, forced: 'windDirection' in forced }, camera)
    const rate = rainOf(shown)
    const { covers: given, source: cloudSource } = layerCovers({ cloudCover: shown.cloudCover, thickCloud: shown.thickCloud, hour })
    const raining = rainingLayer(given, rate)
    const covers = raining.covers
    const clouds = cloudLayers({ placeId: place.id, covers, temperature: shown.temperature, humidity: shown.humidity,
      sunAltitude: sun.altitude, wind, raining: raining.level, seen: preview ? [] : input.seenClouds ?? [] })
    const rain = rainFrom(clouds, rate, wind, shown.weatherCode, preview, hashId(`${place.id}:rain:${hourKey(at)}`))
    const snow = snowFall(shown, forecast.elevation)
    const palette = skyLight({ altitude: shown.sunElevation, rising: shown.localHour < 12, cloudCover: shown.cloudCover,
      wet: Math.min(1, shown.precipitation / 0.8), pm10: shown.pm10, air: { visibilityKm: air.visibilityKm, dust: air.dust } })
    const light = lightOf({ at, day, site: place, camera, skyline, sunSkyline, sun, moon,
      aerosol: { visibilityKm: air.visibilityKm, dust: air.dust }, covers, cloudCover: shown.cloudCover,
      thickCloud: shown.thickCloud ?? null, farFade: air.farFade, palette })
    const water = waterOf(at, place, terrain, skyline, shown.cloudCover, camera, wind.ms)
    const night = nightOf(shown, covers)
    const ground = { wet: groundWet(forecast.hours, at, rate), snowLineM: snow?.lineM ?? null }
    const placePartResult = placePart(place, terrain, input.landmarks, input.city, width, forecast.elevation)
    const horizonY = terrain.horizonY ?? HORIZON_Y
    const bodies = { sun: { azimuth: sun.azimuth, altitude: sun.altitude, x: sun.x, y: sun.y, up: sun.up, overLand: sun.overLand }, moon }

    return {
      place, at, preview, seed, camera,
      relief: { scale: RELIEF, horizonY, y: (altitude: number) => horizonY - anglePx(altitude) },
      bodies, light, air, clouds, rain, snow, wind,
      terrain: planesOf(terrain, place.id),
      water,
      place3: placePartResult.place3,
      marks: placePartResult.marks,
      labels: placePartResult.labels,
      night, ground,
      sources: { cloudLayers: cloudSource, rainCloudRaised: raining.raised, windDirection: windSources.windDirection,
        windAloft: windSources.windAloft, visibility: visibilitySource },
      keys: {
        bodies: partKey(bodies, 2),
        light: partKey(light, 3),
        air: partKey(air, 3),
        clouds: partKey(clouds, 2),
        rain: partKey(rain, 2),
        wind: partKey(wind, 2),
        terrain: terrainKey(terrain),
        water: partKey(water, 3),
        place: placePartResult.placeKey,
        marks: placePartResult.marksKey,
        night: partKey(night, 2),
        ground: partKey(ground, 2),
      },
    }
  }
}

/** One world, with no memory between calls (tests, one-off stills). */
export function buildWorld(input: WorldInput): WorldState {
  return makeWorldBuilder()(input)
}
