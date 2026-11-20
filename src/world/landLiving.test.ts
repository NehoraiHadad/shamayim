import fs from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../config/place'
import type { FarLandGrid, LandData, NearLandGrid, RecentLandWeather } from '../data/land/types'
import { toUtm, utmZoneOf } from '../data/land/utm'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { RAY_DISTANCES, unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import { unknownLand, type SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import layersFixture from '../test/fixtures/forecast-layers-2026-11-17.json'
import { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS, livingLandOf } from './landLiving'
import { withVisibleSun } from './visibleSun'
import { buildWorld, makeWorldBuilder } from './world'

const SHADMOT: Place = { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }
const ALIAS: Place = { id: 'completely-different-place', nameHe: 'שם אחר', regionHe: 'אזור אחר', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }
const panorama = unpackPanorama(JSON.parse(fs.readFileSync('src/test/fixtures/scene/shadmot-mehola.panorama.json', 'utf8')) as StoredPanorama)!
const terrain: SceneTerrain = terrainFromPanorama(panorama)

function makeNear(opts: { date?: string; sunEl?: number; sunAz?: number; snow?: number } = {}): NearLandGrid {
  const date = opts.date ?? '2026-11-15', size = 20, reachM = 5000, stepM = 500
  const utmZone = utmZoneOf(SHADMOT.lon), c = toUtm(SHADMOT.lat, SHADMOT.lon, utmZone, false), n = size * size
  const rgb = new Uint8Array(n * 3)
  for (let i = 0; i < n; i++) rgb.set([135, 148, 92], i * 3)
  return {
    date, source: `s2:${date}`, fetchedAt: 0, lat: SHADMOT.lat, lon: SHADMOT.lon,
    utmZone, utmSouth: false, originE: c.e - reachM, originN: c.n + reachM, reachM, stepM, size, rgb,
    ndvi: new Float32Array(n).fill(0.58), ndsi: new Float32Array(n).fill(-0.2), snow: new Float32Array(n).fill(opts.snow ?? 0.4),
    valid: new Float32Array(n).fill(0.95), rgbValid: new Float32Array(n).fill(0.95),
    ndviValid: new Float32Array(n).fill(0.95), ndsiValid: new Float32Array(n).fill(0.95),
    acquisitions: [{ date, sunElevation: opts.sunEl, sunAzimuth: opts.sunAz }],
    acqIndex: new Uint8Array(n), ndviAcqIndex: new Uint8Array(n), ndsiAcqIndex: new Uint8Array(n), snowAcqIndex: new Uint8Array(n),
  }
}

function makeFar(date = '2026-11-15'): FarLandGrid {
  const size = 20, rgb = new Uint8Array(size * size * 3)
  for (let i = 0; i < rgb.length; i += 3) rgb.set([155, 138, 102], i)
  return {
    date, source: `gibs:${date}`, rgbDate: date, rgbSource: `gibs:${date}`, fetchedAt: 0,
    lat: SHADMOT.lat, lon: SHADMOT.lon, reachKm: 60, stepKm: 6, size, ndvi: new Float32Array(size * size).fill(0.28), rgb,
  }
}

const WEATHER: RecentLandWeather = {
  date: '2026-11-15', source: 'open-meteo:2026-11-15', fetchedAt: 0,
  precip14dMm: 2, precip30dMm: 5, precip60dMm: 10, precipCoverage14d: 1, precipCoverage30d: 1, precipCoverage60d: 1,
  snowfall14dCm: 0, daysSinceRain: 12, soilMoistureTop: 0.08, soilMoistureRoot: 0.12,
}

function makeInput(place: Place, now: LocalTime, land: LandData | null, selected: LocalTime | null = null) {
  const base: Forecast = { ...mapForecast(layersFixture), placeId: place.id, air: null, nowcast: null, normals: null, fetchedAt: 0, source: 'fixture', models: [] }
  return { place, forecast: withVisibleSun(rollForward(base, now), terrain, place), now, selected, terrain, landmarks: [], city: null, land }
}

afterEach(() => { vi.useRealTimers() })

describe('livingLandOf and WorldState.land integration', () => {
  it('samples panorama rays at RAY_DISTANCES (metres) and local ground, carrying source, date & de-lighting status', () => {
    const data: LandData = { cover: { coverAt: () => 4 }, near: makeNear({ sunEl: 38, sunAz: 165 }), far: makeFar(), weather: WEATHER }
    const res = livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate: '2026-11-15', camera: SCENE_CAMERA, terrain, data })
    expect(res.rays).toHaveLength(LIVING_LAND_RAYS)
    expect(res.local).toHaveLength(9)
    for (const dM of res.distancesM) expect(RAY_DISTANCES.some((km) => Math.abs(km * 1000 - dM) < 1e-6)).toBe(true)
    expect(res.distancesM).toEqual([...LIVING_LAND_DISTANCES_M])
    // Near S2 cell on same day (0 d): de-lit via Lambertian terrain normal, weather dryness, S2 snow
    expect(res.own).toMatchObject({
      cover: 4, albedoSource: 's2:2026-11-15', albedoDate: '2026-11-15', delit: 'lambert',
      ndviSource: 's2:2026-11-15', drynessSource: 'open-meteo:2026-11-15', snowSource: 's2:2026-11-15',
    })
    // Far band (20 km) uses GIBS RGB + NDVI with delit: 'none' and elevation-aware climatology snow
    const farBand = res.rays[20].bands.find((b) => b.distanceM === 20_000)!
    expect(farBand.sample).toMatchObject({ albedoSource: 'gibs:2026-11-15', ndviSource: 'gibs:2026-11-15', delit: 'none', snowSource: 'climatology' })
  })

  it('skips de-lighting and marks the source when sun geometry or terrain normal is missing', () => {
    const noSun: LandData = { cover: { coverAt: () => 3 }, near: makeNear({ sunEl: undefined, sunAz: undefined }), far: null, weather: null }
    const rNoSun = livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate: '2026-11-15', camera: SCENE_CAMERA, terrain, data: noSun })
    expect(rNoSun.own.delit).toBe('skipped-no-sun')
    expect(rNoSun.own.albedoSource).toBe('s2:2026-11-15:no-delight')

    const withSun: LandData = { cover: { coverAt: () => 3 }, near: makeNear({ sunEl: 38, sunAz: 165 }), far: null, weather: null }
    const rNoNormal = livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate: '2026-11-15', camera: SCENE_CAMERA, terrain: unknownLand('loading'), data: withSun })
    expect(rNoNormal.own.delit).toBe('skipped-no-normal')
    expect(rNoNormal.own.albedoSource).toBe('s2:2026-11-15:no-delight')
  })

  it('age-blends observations across 0 d, 10 d, 45 d, 120 d and takes season strictly from shownDate (not clock)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z')) // opposite season on system clock
    const data: LandData = { cover: { coverAt: () => 4 }, near: makeNear({ date: '2026-11-15', sunEl: 38, sunAz: 165, snow: 0.8 }), far: null, weather: WEATHER }
    const at = (d: string) => livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate: d, camera: SCENE_CAMERA, terrain, data })
    const d0 = at('2026-11-15'), d10 = at('2026-11-25'), d45 = at('2026-12-30'), d120 = at('2027-03-15')
    expect(d0.month).toBe(11); expect(d120.month).toBe(3)
    expect(d0.own.snow).toBeCloseTo(0.8, 3); expect(d0.own.snowSource).toBe('s2:2026-11-15')
    expect(d10.own.albedoSource).toBe('s2:2026-11-15+climatology')
    expect(d10.own.snow).toBeLessThan(0.25); expect(d10.own.snowSource).toBe('s2:2026-11-15+climatology')
    expect(d45.own.ndviSource).toBe('s2:2026-11-15+climatology'); expect(d45.own.snowSource).toBe('climatology'); expect(d45.own.drynessSource).toBe('climatology')
    expect(d120.own).toMatchObject({ albedoSource: 'climatology', ndviSource: 'climatology', drynessSource: 'climatology', snowSource: 'climatology', delit: 'none' })
  })

  it('derives land strictly from data (never place name/id), is structured-cloneable and never rebuilds on hour scrub', () => {
    const data: LandData = { cover: { coverAt: () => 4 }, near: makeNear({ sunEl: 38, sunAz: 165 }), far: makeFar(), weather: WEATHER }
    const wA = buildWorld(makeInput(SHADMOT, '2026-11-17T12:00', data))
    const wB = buildWorld(makeInput(ALIAS, '2026-11-17T12:00', data))
    expect(wB.land).toEqual(wA.land)
    expect(wB.keys.land).toBe(wA.keys.land)

    // Structured-cloneable (no LandCover.coverAt closure leaks into WorldState.land)
    const cloned = structuredClone(wA.land)
    expect(cloned).toEqual(wA.land)

    // Hour scrub on the same calendar date MUST reuse the exact same `world.land` reference
    const build = makeWorldBuilder()
    const base = makeInput(SHADMOT, '2026-11-17T06:00', data)
    const h06 = build(base)
    const h12 = build({ ...base, selected: '2026-11-17T12:00' })
    const h22 = build({ ...base, selected: '2026-11-17T22:00' })
    expect(h12.land).toBe(h06.land)
    expect(h22.land).toBe(h06.land)
    expect(h22.keys.land).toBe(h06.keys.land)

    // Crossing midnight to a new date rebuilds `world.land` for the new date
    const nextDay = build({ ...base, selected: '2026-11-18T02:00' })
    expect(nextDay.land).not.toBe(h06.land)
    expect(nextDay.land.date).toBe('2026-11-18')
  })
})
