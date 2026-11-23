import fs from 'node:fs'
import type { Place } from '../config/place'
import type { CoverSource, LandCover } from '../data/land/landData'
import type { FarLandGrid, LandData, NearLandGrid, RecentLandWeather } from '../data/land/types'
import { toUtm, utmZoneOf } from '../data/land/utm'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import type { SceneTerrain } from '../data/terrain/terrain'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import { withVisibleSun } from '../world/visibleSun'
import type { WorldInput } from '../world/types'

/**
 * Offline, synthetic living-land inputs shared by the `landLiving` tests and `scripts/land/benchWorld.ts`.
 * Uniform grids over the recorded Shadmot Mehola panorama; values are plausible, not observed.
 */
export const SHADMOT: Place = { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }
/** The same coordinates under another id and name: the land must not change (data-only rule). */
export const ALIAS: Place = { id: 'completely-different-place', nameHe: 'שם אחר', regionHe: 'אזור אחר', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }

const panorama = unpackPanorama(JSON.parse(fs.readFileSync('src/test/fixtures/scene/shadmot-mehola.panorama.json', 'utf8')) as StoredPanorama)!
export const SHADMOT_TERRAIN: SceneTerrain = terrainFromPanorama(panorama)
const layers: unknown = JSON.parse(fs.readFileSync('src/test/fixtures/forecast-layers-2026-11-17.json', 'utf8'))

export interface NearOpts {
  date?: string; rgbDate?: string; ndviDate?: string; snow?: number
  rgb?: [number, number, number]; ndvi?: number; size?: number; stepM?: number
}

/** A near Sentinel-2 grid (default 20×20 at 500 m, or production 100×100 at 100 m) over ±5 km. */
export function makeNear(opts: NearOpts = {}): NearLandGrid {
  const date = opts.date ?? '2026-11-15', rgbDate = opts.rgbDate ?? date, ndviDate = opts.ndviDate ?? date
  const size = opts.size ?? 20, stepM = opts.stepM ?? (10_000 / size), reachM = (size * stepM) / 2
  const utmZone = utmZoneOf(SHADMOT.lon), c = toUtm(SHADMOT.lat, SHADMOT.lon, utmZone, false), n = size * size
  const rgbVal = opts.rgb ?? [135, 148, 92]
  const rgb = new Uint8Array(n * 3)
  for (let i = 0; i < n; i++) rgb.set(rgbVal, i * 3)
  const acquisitions = [{ date }, ...(rgbDate !== date ? [{ date: rgbDate }] : []), ...(ndviDate !== date && ndviDate !== rgbDate ? [{ date: ndviDate }] : [])]
  const acqOf = (d: string) => acquisitions.findIndex((a) => a.date === d)
  return {
    date, source: `s2:${date}`, fetchedAt: 0, lat: SHADMOT.lat, lon: SHADMOT.lon,
    utmZone, utmSouth: false, originE: c.e - reachM, originN: c.n + reachM, reachM, stepM, size, rgb,
    ndvi: new Float32Array(n).fill(opts.ndvi ?? 0.58), ndsi: new Float32Array(n).fill(-0.2), snow: new Float32Array(n).fill(opts.snow ?? 0.4),
    valid: new Float32Array(n).fill(0.95), rgbValid: new Float32Array(n).fill(0.95),
    ndviValid: new Float32Array(n).fill(0.95), ndsiValid: new Float32Array(n).fill(0.95),
    acquisitions,
    acqIndex: new Uint8Array(n).fill(acqOf(rgbDate)),
    ndviAcqIndex: new Uint8Array(n).fill(acqOf(ndviDate)),
    ndsiAcqIndex: new Uint8Array(n),
    snowAcqIndex: new Uint8Array(n),
  }
}

export interface FarOpts {
  date?: string; rgbDate?: string; rgb?: [number, number, number]; ndvi?: number; size?: number; stepKm?: number
}

/** A far GIBS grid (default 20×20 at 6 km, or production 60×60 at 2 km) over ±60 km. */
export function makeFar(opts: FarOpts | string = {}): FarLandGrid {
  const o: FarOpts = typeof opts === 'string' ? { date: opts, rgbDate: opts } : opts
  const date = o.date ?? '2026-11-15', rgbDate = o.rgbDate ?? '2026-11-01'
  const size = o.size ?? 20, stepKm = o.stepKm ?? (120 / size), reachKm = (size * stepKm) / 2
  const rgbVal = o.rgb ?? [155, 138, 102]
  const rgb = new Uint8Array(size * size * 3)
  for (let i = 0; i < rgb.length; i += 3) rgb.set(rgbVal, i)
  return {
    date, source: `gibs:${date}`, rgbDate, rgbSource: `gibs:${rgbDate}`, fetchedAt: 0,
    lat: SHADMOT.lat, lon: SHADMOT.lon, reachKm, stepKm, size, ndvi: new Float32Array(size * size).fill(o.ndvi ?? 0.28), rgb,
  }
}

export const WEATHER: RecentLandWeather = {
  date: '2026-11-15', source: 'open-meteo:2026-11-15', fetchedAt: 0,
  precip14dMm: 2, precip30dMm: 5, precip60dMm: 10, precipCoverage14d: 1, precipCoverage30d: 1, precipCoverage60d: 1,
  snowfall14dCm: 0, daysSinceRain: 12, soilMoistureTop: 0.08, soilMoistureRoot: 0.12,
}

export const typedCover = (cls: number, source: CoverSource): LandCover => ({
  coverAt: () => cls,
  coverWithSourceAt: () => (cls > 0 ? { cover: cls, source } : { cover: null, source: 'unknown' }),
})

/** Every living-land source present (cover class 4 = cropland). */
export const fullLandData = (): LandData => ({
  cover: typedCover(4, 'worldcover-2021:local-50m'), near: makeNear(), far: makeFar(), weather: WEATHER,
})

/** Production-sized living-land bundle (100×100 100 m near S2 + 60×60 2 km far GIBS). */
export const prodLandData = (): LandData => ({
  cover: typedCover(4, 'worldcover-2021:local-50m'),
  near: makeNear({ size: 100, stepM: 100 }),
  far: makeFar({ size: 60, stepKm: 2 }),
  weather: WEATHER,
})

/** A world input over the recorded forecast and panorama for `place` at `now` (and an optional selected hour). */
export function makeWorldInput(place: Place, now: LocalTime, land: LandData | null, selected: LocalTime | null = null): WorldInput {
  const base: Forecast = { ...mapForecast(layers), placeId: place.id, air: null, nowcast: null, normals: null, fetchedAt: 0, source: 'fixture', models: [] }
  return { place, forecast: withVisibleSun(rollForward(base, now), SHADMOT_TERRAIN, place), now, selected, terrain: SHADMOT_TERRAIN, landmarks: [], city: null, land }
}
