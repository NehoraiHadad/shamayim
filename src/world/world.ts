import { airInput } from '../atmo/airInput'
import type { AirInput } from '../atmo/airTypes'
import { hashId } from '../data/landmarks/hash'
import { anglePx, RELIEF } from '../data/terrain/angleScale'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import { datePart } from '../domain/time'
import type { HourPoint, LocalTime } from '../domain/types'
import { heightText } from '../text/isolate'
import { skyLight } from '../theme/skyLight'
import { airOf } from './air'
import { moonBody, sunBody } from './bodies'
import { cloudLayers, layerCovers } from './clouds'
import { farCitiesOf } from './farCities'
import { partKey } from './keys'
import { lightOf, visibleDay } from './light'
import { hourBetween } from './livingLight'
import { cloudFieldAt } from './cloudField'
import { nightOf } from './night'
import { placeOf } from './place'
import { drawnTerrain } from './outside'
import { rainFrom, rainingLayer, rainOf, snowFrom } from './rain'
import { SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { snowFall } from './snowLine'
import { landStatusOf, terrainPlanes, unknownLand } from './terrain'
import type { WorldInput, WorldLabels, WorldState } from './types'
import { sceneSkyline } from './visibleSun'
import { ripplesOf, waterOf } from './water'
import { windOf } from './wind'
import type { LifeInput } from './life'
import { makeLifeDays } from './lifeDay'
import { flightTerrain } from './flightTerrain'
import { altitudeOver, type FlightContext } from './lifeSchedule'
import { drawnSkyline } from './drawnSkyline'
import { xOf } from '../domain/camera'
import { nightSkyOf } from './nightSky'
import { opticsOf } from './optics'
import { placeEnvOf } from './placeEnv'

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

/** `groundWet` read straight between the shown minute's hour and the next (their own rain), never a step on the hour. */
function wetBetween(hours: readonly HourPoint[], at: LocalTime, shownRate: number): number {
  const f = Number(at.slice(14, 16)) / 60
  const floor = `${at.slice(0, 13)}:00` as LocalTime
  const index = hours.findIndex((h) => h.time === floor)
  const next = hours[index + 1]
  if (index < 0 || !next || f <= 0) return groundWet(hours, at, shownRate)
  const a = groundWet(hours, floor, hours[index].precipitation), b = groundWet(hours, next.time, next.precipitation)
  // The shown rate is already read between the two; the wet of the hours before eases from one hour's to the next's.
  return Math.max(Math.min(1, shownRate / 0.8), a + (b - a) * f)
}

/** The land the world stands on while the place's own is not known (C8): one object per status, so the parts keep. */
const UNKNOWN = { loading: unknownLand('loading'), offline: unknownLand('offline') } as const

/**
 * The place while its land is not known (C8): nothing placed (no houses, no marks, no notes: they stand on the land),
 * so nothing is built on a guessed ridge; the scene shows the mist and keeps its labels back until the land arrives.
 */
function unknownPlace(place: WorldInput['place'], elevation: number) {
  const rounded = Math.round(elevation)
  const labels: WorldLabels = { height: { text: heightText(rounded), below: elevation < 0, x: SCENE_W / 2,
    y: 0 }, notes: [] }
  const dot = { x: SCENE_W / 2, y: UNKNOWN.loading.horizonY }
  return { place3: { kind: 'unknown' as const, dot, reachKm: 0, seed: hashId(place.id) }, marks: [], seatPool: [], labels, ownSkyline: false, coastalSea: null,
  nearLine: null, placeKey: 'unknown', marksKey: 'unknown' }
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
  // The sun, the moon and the light are judged on the drawn land (`drawnSkyline.ts`): the near land as drawn, the far land,
  // the place's rows and towers, the marks; kept while those are the same objects.
  const judgeOf = memoOne(drawnSkyline)
  const fieldOf = memoOne(cloudFieldAt)
  const lifeDays = makeLifeDays()
  /**
   * The land the sky's life flies over and is seen against (`lifeSchedule.ts` `FlightContext`): the true ground and sight
   * lines (`flightTerrain.ts`), the drawn land's top (deg) and the drawn near land's distance in each direction.
   */
  const flightOf = memoOne((terrain: SceneTerrain, groundM: number, judge: Skyline, near: WorldState['terrain']['near'],
    camera: WorldState['camera'], horizonY: number): FlightContext => ({
    terrain: flightTerrain(terrain, groundM),
    drawnTop: (azimuth: number) => altitudeOver(judge(xOf(azimuth, camera) / SCENE_W), (altitude) => horizonY - anglePx(altitude)),
    nearKm: (azimuth: number) => {
      const x = xOf(azimuth, camera), pts = near.points
      if (!pts.length) return Infinity
      const i = Math.max(0, Math.min(pts.length - 1, Math.round((x / SCENE_W) * (pts.length - 1))))
      return near.distanceKm[i] ?? Infinity
    },
  }))
  const planesOf = memoOne(terrainPlanes)
  const placePart = memoOne((place: WorldInput['place'], terrain: SceneTerrain, landmarks: WorldInput['landmarks'],
    seatCandidates: WorldInput['seatCandidates'], city: WorldInput['city'], width: number, elevation: number,
    bounds: WorldInput['bounds'], waterMask: WorldInput['waterMask'], cover: WorldInput['cover']) => {
    const part = placeOf({ place, terrain, landmarks, seatCandidates, city, width, elevation, bounds, waterMask, cover })
    return { ...part, placeKey: partKey([part.place3, part.labels], 1), marksKey: partKey([part.marks, part.seatPool], 1) }
  })
  const farCitiesPart = memoOne((place: WorldInput['place'], terrain: SceneTerrain, far: WorldInput['far'], ownSkyline: boolean) => {
    const part = farCitiesOf(place, terrain, far, ownSkyline)
    return { part, key: partKey([part.patches.length, part.towers.length, part.fromKm, far ? 1 : 0], 1) }
  })
  const ripplesPart = memoOne((terrain: SceneTerrain, placeId: string) => ripplesOf(terrain.water ?? [], placeId))
  const envPart = memoOne((place: WorldInput['place'], cover: WorldInput['cover'], far: WorldInput['far'], waterMask: WorldInput['waterMask']) =>
    placeEnvOf(place, { cover, far, waterMask }))
  const terrainKey = memoOne((terrain: SceneTerrain) => partKey([terrain.nearPoints, terrain.farPoints, terrain.horizonY, terrain.water], 2))
  // The land as drawn (owner decision 14's follow-up): the near ridge within the place's span is the place's own near land
  // (`outside.ts` `nearLineOf`), the panorama's beyond it. The sun and moon still set behind the panorama's own skyline.
  const drawnOf = memoOne(drawnTerrain)

  return function buildWorld(input: WorldInput): WorldState {
    const { place, forecast, now, selected } = input
    // Until the place's land is known (C8) the world stands on no land: no ridge, a guessed eye level, nothing placed.
    const status = landStatusOf(input.terrain)
    const terrain = status === 'ready' ? input.terrain : UNKNOWN[status]
    const at = selected ?? now
    const preview = selected !== null
    const camera = terrain.camera ?? SCENE_CAMERA
    const width = input.width ?? SCENE_W
    const seed = hashId(place.id)
    const skyline = skylineOf(terrain)
    const shown = shownAir(input)
    const hour = forecast.hours.find((h) => h.time === hourKey(at))
    // The living light: the hour's layers and visibility read straight between this hour and the next, as the cover is
    // (they stepped on the hour: a minute's scrub across it turned the light at once).
    const between = hourBetween(forecast.hours, at)
    const dayGiven = forecast.days.find((d) => d.date === datePart(at))
    const forced = input.forced ?? {}

    const placePartResult = status === 'ready' ? placePart(place, terrain, input.landmarks, input.seatCandidates, input.city,
      width, forecast.elevation, input.bounds, input.waterMask, input.cover) : unknownPlace(place, forecast.elevation)
    const drawn = drawnOf(terrain, placePartResult.nearLine)
    // The far towns are the far land's: placed on the panorama's own terrain (its eye's view), drawn behind the near land.
    const farCities = farCitiesPart(place, terrain, status === 'ready' ? input.far : null, placePartResult.ownSkyline)
    // Everything in the sky is hidden by the land and structures drawn in front of it: its top is the line the sun and the
    // moon rise and set on, for the picture and the light alike (the owner's report of 2026-11-20).
    const sunSkyline = status === 'ready' ? judgeOf(drawn, placePartResult.place3, placePartResult.marks, farCities.part, skyline) : skyline
    const day = dayGiven && status === 'ready' ? visibleDay(dayGiven, place, sunSkyline) : dayGiven
    const sun = sunBody(at, day, place, skyline, sunSkyline)
    const moon = moonBody(at, place, skyline, sun, sunSkyline)
    const { air, source: visibilitySource } = airOf({ shown, hourVisibilityM: between?.visibility, preview,
      forcedVisibility: 'visibilityKm' in forced })
    const { wind, sources: windSources } = windOf({ speedKmh: shown.windSpeed, gustKmh: shown.windGusts, shownFromDeg: shown.windDirection,
      hour, preview, forced: 'windDirection' in forced }, camera)
    const rate = rainOf(shown)
    // A dev moment may pin the layers themselves (the harness's C10 moments: a veil of cirrostratus alone).
    const { covers: given, source: cloudSource } = input.forcedLayers ? { covers: input.forcedLayers, source: 'forced' as const }
      : layerCovers({ cloudCover: shown.cloudCover, thickCloud: shown.thickCloud, hour: between })
    const snow = snowFall(shown, forecast.elevation)
    // Falling snow needs a cloud to fall from, as the rain does (C7): the same layer rule, from the snowfall.
    const raining = rainingLayer(given, rate > 0 ? rate : snow?.falling ? Math.max(0.1, shown.snowfall) : 0)
    const covers = raining.covers
    const clouds = cloudLayers({ placeId: place.id, covers, temperature: shown.temperature, humidity: shown.humidity,
      sunAltitude: sun.altitude, wind, raining: raining.level, seen: preview ? [] : input.seenClouds ?? [] })
    const cloudField = fieldOf(forecast.hours, place.id, forecast.elevation)(at, covers, shown, sun.altitude,
      { speedKmh: wind.ms * 3.6, fromDeg: wind.fromDeg }, raining.level ? { level: raining.level, rate } : undefined, forced.weatherCode !== undefined)
    const eyeM = terrain.eyeM ?? forecast.elevation + 2
    const groundAboveEyeKm = (x: number, y: number) => {
      const sx = xOf(Math.atan2(x, y) * 180 / Math.PI, camera) * SCENE_W / camera.width
      const local = terrain.heightNear?.(x, y)
      if (local != null) return (local - eyeM) / 1000
      return (terrain.groundAt?.(sx, Math.hypot(x, y)) ?? forecast.elevation - eyeM) / 1000
    }
    const rain = rainFrom(cloudField, rate, wind, shown.weatherCode, preview, shown.humidity, groundAboveEyeKm)
    const snowfall = snowFrom(clouds, snow, wind, hashId(`${place.id}:snow:${hourKey(at)}`))
    const palette = skyLight({ altitude: shown.sunElevation, rising: shown.localHour < 12, cloudCover: shown.cloudCover,
      wet: Math.min(1, shown.precipitation / 0.8), pm10: shown.pm10, air: { visibilityKm: air.visibilityKm, dust: air.dust } })
    const light = lightOf({ at, day, site: place, camera, skyline, sunSkyline, sun, moon,
      aerosol: { visibilityKm: air.visibilityKm, dust: air.dust }, covers, cloudField, farFade: air.farFade, palette })
    const water = waterOf(at, place, terrain, skyline, shown.cloudCover, camera, wind.ms, ripplesPart(terrain, place.id),
      light.shares.sun, sun.overLand)
    const night = nightOf(shown, covers)
    // The ground's wetness read straight between the hour's and the next's (it stepped on the hour).
    const ground = { wet: wetBetween(forecast.hours, at, rate), snowLineM: snow?.lineM ?? null }
    const horizonY = terrain.horizonY
    // C10: the life of the sky, its true night objects and its optics, from the same state.
    const env = envPart(place, input.cover, input.far, input.waterMask)
    const lifeInput: LifeInput = { placeId: place.id, lat: place.lat, lon: place.lon, at, timezone: place.timezone, camera,
      groundM: forecast.elevation, env, sun, direct: light.shares.sun, dark: night.dark,
      temperature: shown.temperature, covers, rainMmH: Math.max(rate, shown.precipitation), thunder: rain?.thunder ?? false,
      wind: { fromDeg: wind.fromDeg, towardDeg: wind.towardDeg, ms: wind.ms, gustMs: wind.gustMs }, hour, starsThrough: night.starsThrough, moon,
      visibilityKm: air.visibilityKm }
    // The life is a process in time (`lifeSchedule.ts`): the day's events drawn once per place, day and inputs, and shown
    // where each one's path has brought it at this minute.
    const planes = planesOf(drawn, place.id)
    const life = lifeDays(input, at, lifeInput, { camera, env },
      status === 'ready' ? flightOf(terrain, forecast.elevation, sunSkyline, planes.near, camera, horizonY) : undefined,
      [place, forecast.hours, forecast.current, forecast.elevation, input.forced, input.forcedLayers, camera, env, sunSkyline])
    const nightSky = nightSkyOf({ at, timezone: place.timezone, lat: place.lat, lon: place.lon, placeId: place.id, sun, moon,
      starsThrough: night.starsThrough, visibilityKm: air.visibilityKm, glow: env.glow })
    const optics = opticsOf({ sun, direct: light.meanBeam.sun, eye: light.eye, sunLights: light.source === 'sun', covers,
      rain: rain ? { rateMmH: rain.rateMmH, cells: rain.cells } : null, coin: air.dust ? air.farFade : 0 })
    const bodies = { sun: { azimuth: sun.azimuth, altitude: sun.altitude, x: sun.x, y: sun.y, up: sun.up, overLand: sun.overLand, clearance: sun.clearance,
      visible: sun.visible }, moon }

    return {
      place, at, preview, seed, camera,
      relief: { scale: RELIEF, horizonY, y: (altitude: number) => horizonY - anglePx(altitude) },
      bodies, light, air, clouds, cloudField, rain, snow, snowfall, wind,
      terrain: planes,
      water: { ...water, coastalSea: placePartResult.coastalSea },
      farCities: farCities.part,
      place3: placePartResult.place3,
      marks: placePartResult.marks, seatPool: placePartResult.seatPool,
      labels: placePartResult.labels,
      night, ground, env, life, nightSky, optics,
      sources: { cloudLayers: cloudSource, rainCloudRaised: raining.raised, windDirection: windSources.windDirection,
        windAloft: windSources.windAloft, visibility: visibilitySource, cruise: life.aircraft.cruise.source, glow: env.sources.glow },
      keys: {
        bodies: partKey(bodies, 2),
        light: partKey(light, 3),
        air: partKey(air, 3),
        clouds: partKey(clouds, 2),
        rain: partKey([rain, snowfall], 2),
        wind: partKey(wind, 2),
        terrain: `${status}:${terrainKey(drawn)}`,
        water: partKey({ ...water, ripples: undefined, coastalSea: placePartResult.placeKey }, 3),
        farCities: `${terrainKey(terrain)}:${farCities.key}`,
        place: placePartResult.placeKey,
        marks: placePartResult.marksKey,
        night: partKey(night, 2),
        ground: partKey(ground, 2),
        life: partKey(life, 2),
        nightSky: partKey(nightSky, 2),
        optics: partKey(optics, 2),
      },
    }
  }
}

/** One world, with no memory between calls (tests, one-off stills). */
export function buildWorld(input: WorldInput): WorldState {
  return makeWorldBuilder()(input)
}
