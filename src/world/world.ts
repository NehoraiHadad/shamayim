import { utcOf } from '../astro/utc'
import { mappedCropAreas } from '../data/landmarks/cropAreas'
import { hashId } from '../data/landmarks/hash'
import { anglePx, RELIEF } from '../data/terrain/angleScale'
import { SCENE_CAMERA } from '../domain/camera'
import { datePart } from '../domain/time'
import { skyLight } from '../theme/skyLight'
import { airOf } from './air'
import { moonBody, sunBody } from './bodies'
import { cloudLayers, layerCovers } from './clouds'
import { partKey } from './keys'
import type { LifeInput } from './life'
import { lightOf, visibleDay } from './light'
import { airDim, cloudDriftKm, hourBetween } from './livingLight'
import { nightOf } from './night'
import { nightSkyOf } from './nightSky'
import { opticsOf } from './optics'
import { rainFrom, rainingLayer, rainOf, snowFrom } from './rain'
import { smoothstep } from './ridgeLighting'
import { SCENE_W } from './sceneBox'
import { snowFall } from './snowLine'
import { landStatusOf } from './terrain'
import type { WorldInput, WorldState } from './types'
import { waterOf } from './water'
import { acrossOf, windOf } from './wind'
import { groundWet, hourKey, makeWorldMemos, shownAir, UNKNOWN, unknownPlace, wetBetween } from './worldParts'

export { groundWet, shownAir }

/**
 * A world builder that keeps each part while its own inputs stay the same object: a change of hour rebuilds the light,
 * air and weather, never the terrain, the place, the marks or same-UTC-day living-land state.
 */
export function makeWorldBuilder() {
  const m = makeWorldMemos()

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
    const skyline = m.skylineOf(terrain)
    const shown = shownAir(input)
    const hour = forecast.hours.find((h) => h.time === hourKey(at))
    const between = hourBetween(forecast.hours, at)
    const dayGiven = forecast.days.find((d) => d.date === datePart(at))
    const forced = input.forced ?? {}

    const placePartResult = status === 'ready' ? m.placePart(place, terrain, input.landmarks, input.seatCandidates, input.city,
      width, forecast.elevation, input.bounds, input.waterMask, input.cover) : unknownPlace(place, forecast.elevation)
    const drawn = m.drawnOf(terrain, placePartResult.nearLine)
    const farCities = m.farCitiesPart(place, terrain, status === 'ready' ? input.far : null, placePartResult.ownSkyline)
    const sunSkyline = status === 'ready' ? m.judgeOf(drawn, placePartResult.place3, placePartResult.marks, farCities.part, skyline) : skyline
    const day = dayGiven && status === 'ready' ? visibleDay(dayGiven, place, sunSkyline) : dayGiven
    const sun = sunBody(at, day, place, skyline, sunSkyline)
    const moon = moonBody(at, place, skyline, sun, sunSkyline)
    const { wind, sources: windSources } = windOf({ speedKmh: shown.windSpeed, gustKmh: shown.windGusts, shownFromDeg: shown.windDirection,
      hour, preview, forced: 'windDirection' in forced }, camera)
    const rate = rainOf(shown)
    const { covers: given, source: cloudSource } = input.forcedLayers ? { covers: input.forcedLayers, source: 'forced' as const }
      : layerCovers({ cloudCover: shown.cloudCover, thickCloud: shown.thickCloud, hour: between })
    const snow = snowFall(shown, forecast.elevation)
    const raining = rainingLayer(given, rate > 0 ? rate : snow?.falling ? Math.max(0.1, shown.snowfall) : 0)
    const covers = raining.covers
    const { air, source: visibilitySource } = airOf({ shown, hourVisibilityM: between?.visibility, preview, forcedVisibility: 'visibilityKm' in forced,
      mist: { sun, windMs: wind.ms, current: forecast.current, hour: between, forced, forcedLayers: input.forcedLayers, hours: forecast.hours, at } })
    const clouds = cloudLayers({ placeId: place.id, covers, temperature: shown.temperature, humidity: shown.humidity,
      sunAltitude: sun.altitude, wind, raining: raining.level, seen: preview ? [] : input.seenClouds ?? [] })
    const rain = rainFrom(clouds, rate, wind, shown.weatherCode, preview, hashId(`${place.id}:rain:${hourKey(at)}`))
    const snowfall = snowFrom(clouds, snow, wind, hashId(`${place.id}:snow:${hourKey(at)}`))
    const palette = skyLight({ altitude: shown.sunElevation, rising: shown.localHour < 12, cloudCover: shown.cloudCover,
      wet: Math.min(1, shown.precipitation / 0.8), pm10: shown.pm10, air: { visibilityKm: air.visibilityKm, dust: air.dust } })
    const light = lightOf({ at, day, site: place, camera, skyline, sunSkyline, sun, moon,
      aerosol: { visibilityKm: air.visibilityKm, dust: air.dust }, covers, cloudCover: shown.cloudCover,
      thickCloud: shown.thickCloud ?? null, farFade: air.farFade, palette })
    const water = waterOf(at, place, terrain, skyline, shown.cloudCover, camera, wind.ms, m.ripplesPart(terrain, place.id),
      light.shares.sun, sun.overLand)
    const night = nightOf(shown, covers)
    const lowMid = 1 - (1 - covers.low) * (1 - 0.8 * covers.mid)
    const clearSun = (sun.visible ?? 0) * airDim(sun.altitude, { visibilityKm: air.visibilityKm, dust: air.dust })
    const shadows = {
      cover: lowMid,
      strength: clearSun * smoothstep(0.04, 0.2, lowMid) * (1 - smoothstep(0.8, 0.97, lowMid)) * (1 - night.dark),
      driftKm: cloudDriftKm(forecast.hours, at, (fromDeg) => acrossOf(fromDeg, camera)),
      kmh: wind.aloft.low * 3.6 * wind.aloftAcross.low,
    }
    const ground = { wet: wetBetween(forecast.hours, at, rate), snowLineM: snow?.lineM ?? null }
    const horizonY = terrain.horizonY
    const env = m.envPart(place, input.cover, input.far, input.waterMask)
    const lifeInput: LifeInput = { placeId: place.id, lat: place.lat, lon: place.lon, at, timezone: place.timezone, camera,
      groundM: forecast.elevation, env, sun, direct: light.shares.sun, dark: night.dark,
      temperature: shown.temperature, covers, rainMmH: Math.max(rate, shown.precipitation), thunder: rain?.thunder ?? false,
      wind: { fromDeg: wind.fromDeg, towardDeg: wind.towardDeg, ms: wind.ms, gustMs: wind.gustMs }, hour, starsThrough: night.starsThrough, moon,
      visibilityKm: air.visibilityKm }
    const planes = m.planesOf(drawn, place.id)
    const life = m.lifeDays(input, at, lifeInput, { camera, env },
      status === 'ready' ? m.flightOf(terrain, forecast.elevation, sunSkyline, planes.near, camera, horizonY) : undefined,
      [place, forecast.hours, forecast.current, forecast.elevation, input.forced, input.forcedLayers, camera, env, sunSkyline])
    const nightSky = nightSkyOf({ at, timezone: place.timezone, lat: place.lat, lon: place.lon, placeId: place.id, sun, moon,
      starsThrough: night.starsThrough, visibilityKm: air.visibilityKm, glow: env.glow })
    const optics = opticsOf({ sun, direct: light.shares.sun, sunLights: light.source === 'sun', covers,
      rain: rain ? { rateMmH: rain.rateMmH, cells: rain.cells } : null, coin: air.dust ? air.farFade : 0 })
    const shownUtcDate = utcOf(at, place.timezone).toISOString().slice(0, 10)
    const land = m.landPart(
      place.lat, place.lon, forecast.elevation, datePart(at), shownUtcDate, camera, terrain,
      input.land?.cover ?? input.cover ?? null, input.land?.near ?? null, input.land?.far ?? null, input.land?.weather ?? null,
    )
    const bodies = { sun: { azimuth: sun.azimuth, altitude: sun.altitude, x: sun.x, y: sun.y, up: sun.up, overLand: sun.overLand,
      clearance: sun.clearance, visible: sun.visible }, moon }

    return {
      place, at, preview, seed, camera,
      relief: { scale: RELIEF, horizonY, y: (altitude: number) => horizonY - anglePx(altitude) },
      bodies, light, air, clouds, rain, snow, snowfall, wind,
      terrain: planes, water: { ...water, coastalSea: placePartResult.coastalSea },
      farCities: farCities.part, place3: placePartResult.place3, marks: placePartResult.marks, seatPool: placePartResult.seatPool, labels: placePartResult.labels,
      night, ground, env, life, nightSky, optics, shadows, land: land.part,
      cropAreas: input.cropAreas ?? mappedCropAreas(input.landmarks),
      sources: { cloudLayers: cloudSource, rainCloudRaised: raining.raised, windDirection: windSources.windDirection,
        windAloft: windSources.windAloft, visibility: visibilitySource, cruise: life.aircraft.cruise.source, glow: env.sources.glow },
      keys: {
        bodies: partKey(bodies, 2), light: partKey(light, 3), air: partKey(air, 3), clouds: partKey(clouds, 2),
        rain: partKey([rain, snowfall], 2), wind: partKey(wind, 2), terrain: `${status}:${m.terrainKey(drawn)}`,
        water: partKey({ ...water, ripples: undefined, coastalSea: placePartResult.placeKey }, 3),
        farCities: `${m.terrainKey(terrain)}:${farCities.key}`, place: placePartResult.placeKey, marks: placePartResult.marksKey,
        night: partKey(night, 2), ground: partKey(ground, 2), life: partKey(life, 2), nightSky: partKey(nightSky, 2),
        optics: partKey(optics, 2), land: land.key,
      },
    }
  }
}

/** One world, with no memory between calls (tests, one-off stills). */
export function buildWorld(input: WorldInput): WorldState {
  return makeWorldBuilder()(input)
}
