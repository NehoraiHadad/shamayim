import { airInput } from '../atmo/airInput'
import type { AirInput } from '../atmo/airTypes'
import { hashId } from '../data/landmarks/hash'
import type { LandData } from '../data/land/types'
import { anglePx } from '../data/terrain/angleScale'
import type { SceneTerrain } from '../data/terrain/terrain'
import { xOf } from '../domain/camera'
import type { HourPoint, LocalTime } from '../domain/types'
import { drawnSkyline } from './drawnSkyline'
import { farCitiesOf } from './farCities'
import { flightTerrain } from './flightTerrain'
import { partKey } from './keys'
import { livingLandOf } from './landLiving'
import { livingLandKey } from './landRays'
import { makeLifeDays } from './lifeDay'
import { altitudeOver, type FlightContext } from './lifeSchedule'
import { drawnTerrain } from './outside'
import { placeOf } from './place'
import { placeEnvOf } from './placeEnv'
import { SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { terrainPlanes, unknownLand } from './terrain'
import type { WorldInput, WorldLabels, WorldState } from './types'
import { sceneSkyline } from './visibleSun'
import { ripplesOf } from './water'

export const hourKey = (at: LocalTime) => `${at.slice(0, 13)}:00`

/** The air of the shown minute as App reduces it (`airInput`), plus satellite single clouds and dev overrides. */
export function shownAir(input: Pick<WorldInput, 'forecast' | 'now' | 'place' | 'selected' | 'seenClouds' | 'forced'>): AirInput {
  const { forecast, now, place, selected } = input
  return { ...airInput(forecast, now, place, selected), cloudsSeen: selected ? 0 : input.seenClouds?.length ?? 0, ...input.forced }
}

/** How wet the ground is (0–1): the shown hour's rain, and the three hours before it, fading as it dries. */
export function groundWet(hours: readonly HourPoint[], at: LocalTime, shownRate: number): number {
  const index = hours.findIndex((h) => h.time === hourKey(at))
  let wet = Math.min(1, shownRate / 0.8)
  for (let k = 1; k <= 3 && index - k >= 0; k++) wet = Math.max(wet, Math.min(1, hours[index - k].precipitation / 0.8) * (1 - k / 4))
  return wet
}

/** `groundWet` read straight between the shown minute's hour and the next, never a step on the hour. */
export function wetBetween(hours: readonly HourPoint[], at: LocalTime, shownRate: number): number {
  const f = Number(at.slice(14, 16)) / 60
  const floor = `${at.slice(0, 13)}:00` as LocalTime
  const index = hours.findIndex((h) => h.time === floor)
  const next = hours[index + 1]
  if (index < 0 || !next || f <= 0) return groundWet(hours, at, shownRate)
  const a = groundWet(hours, floor, hours[index].precipitation), b = groundWet(hours, next.time, next.precipitation)
  return Math.max(Math.min(1, shownRate / 0.8), a + (b - a) * f)
}

/** The land the world stands on while the place's own is not known (C8): one object per status. */
export const UNKNOWN = { loading: unknownLand('loading'), offline: unknownLand('offline') } as const

/** The place while its land is not known (C8): nothing placed on a guessed ridge. */
export function unknownPlace(place: WorldInput['place'], elevation: number) {
  const rounded = Math.round(elevation)
  const labels: WorldLabels = {
    height: { text: `${rounded < 0 ? `−${Math.abs(rounded)}` : rounded} מ׳`, below: elevation < 0, x: SCENE_W / 2, y: 0 },
    notes: [],
  }
  const dot = { x: SCENE_W / 2, y: UNKNOWN.loading.horizonY }
  return {
    place3: { kind: 'unknown' as const, dot, reachKm: 0, seed: hashId(place.id) },
    marks: [], labels, ownSkyline: false, coastalSea: null, nearLine: null, placeKey: 'unknown', marksKey: 'unknown',
  }
}

/** Remembers its last result while every argument is the same object or value. */
export function memoOne<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; result: R } | null = null
  return (...args: A) => {
    if (last && last.args.length === args.length && last.args.every((a, i) => Object.is(a, args[i]))) return last.result
    const result = fn(...args)
    last = { args, result }
    return result
  }
}

/** Creates the per-builder memoized part factories so hour scrubs never rebuild static terrain, place or land parts. */
export function makeWorldMemos() {
  return {
    skylineOf: memoOne((terrain: SceneTerrain): Skyline => sceneSkyline(terrain)),
    judgeOf: memoOne(drawnSkyline),
    lifeDays: makeLifeDays(),
    flightOf: memoOne((terrain: SceneTerrain, groundM: number, judge: Skyline, near: WorldState['terrain']['near'],
      camera: WorldState['camera'], horizonY: number): FlightContext => ({
      terrain: flightTerrain(terrain, groundM),
      drawnTop: (azimuth: number) => altitudeOver(judge(xOf(azimuth, camera) / SCENE_W), (altitude) => horizonY - anglePx(altitude)),
      nearKm: (azimuth: number) => {
        const x = xOf(azimuth, camera), pts = near.points
        if (!pts.length) return Infinity
        const i = Math.max(0, Math.min(pts.length - 1, Math.round((x / SCENE_W) * (pts.length - 1))))
        return near.distanceKm[i] ?? Infinity
      },
    })),
    planesOf: memoOne(terrainPlanes),
    placePart: memoOne((place: WorldInput['place'], terrain: SceneTerrain, landmarks: WorldInput['landmarks'],
      city: WorldInput['city'], width: number, elevation: number, bounds: WorldInput['bounds'], waterMask: WorldInput['waterMask'],
      cover: WorldInput['cover']) => {
      const part = placeOf({ place, terrain, landmarks, city, width, elevation, bounds, waterMask, cover })
      return { ...part, placeKey: partKey([part.place3, part.labels], 1), marksKey: partKey(part.marks, 1) }
    }),
    farCitiesPart: memoOne((place: WorldInput['place'], terrain: SceneTerrain, far: WorldInput['far'], ownSkyline: boolean) => {
      const part = farCitiesOf(place, terrain, far, ownSkyline)
      return { part, key: partKey([part.patches.length, part.towers.length, part.fromKm, far ? 1 : 0], 1) }
    }),
    ripplesPart: memoOne((terrain: SceneTerrain, placeId: string) => ripplesOf(terrain.water ?? [], placeId)),
    envPart: memoOne((place: WorldInput['place'], cover: WorldInput['cover'], far: WorldInput['far'], waterMask: WorldInput['waterMask']) =>
      placeEnvOf(place, { cover, far, waterMask })),
    // Keyed strictly by coordinates, elevation, shown local/UTC dates, camera, terrain and data sources (never place name/id).
    landPart: memoOne((
      lat: number, lon: number, elevationM: number, shownDate: string, shownUtcDate: string,
      camera: WorldState['camera'], terrain: SceneTerrain,
      cover: LandData['cover'], near: LandData['near'], far: LandData['far'], weather: LandData['weather'],
    ) => {
      const part = livingLandOf({ lat, lon, elevationM, shownDate, shownUtcDate, camera, terrain, data: { cover, near, far, weather } })
      return { part, key: livingLandKey(part) }
    }),
    terrainKey: memoOne((terrain: SceneTerrain) => partKey([terrain.nearPoints, terrain.farPoints, terrain.horizonY, terrain.water], 2)),
    drawnOf: memoOne(drawnTerrain),
  }
}
