import fs from 'node:fs'
import type { Place } from '../config/place'
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

/** A 20×20 near Sentinel-2 grid (500 m cells, ±5 km) of one acquisition with the given sun geometry. */
export function makeNear(opts: { date?: string; sunEl?: number; sunAz?: number; snow?: number } = {}): NearLandGrid {
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

/** A 20×20 far GIBS grid (6 km cells, ±60 km). */
export function makeFar(date = '2026-11-15'): FarLandGrid {
  const size = 20, rgb = new Uint8Array(size * size * 3)
  for (let i = 0; i < rgb.length; i += 3) rgb.set([155, 138, 102], i)
  return {
    date, source: `gibs:${date}`, rgbDate: date, rgbSource: `gibs:${date}`, fetchedAt: 0,
    lat: SHADMOT.lat, lon: SHADMOT.lon, reachKm: 60, stepKm: 6, size, ndvi: new Float32Array(size * size).fill(0.28), rgb,
  }
}

export const WEATHER: RecentLandWeather = {
  date: '2026-11-15', source: 'open-meteo:2026-11-15', fetchedAt: 0,
  precip14dMm: 2, precip30dMm: 5, precip60dMm: 10, precipCoverage14d: 1, precipCoverage30d: 1, precipCoverage60d: 1,
  snowfall14dCm: 0, daysSinceRain: 12, soilMoistureTop: 0.08, soilMoistureRoot: 0.12,
}

/** Every living-land source present (cover class 4 = cropland). */
export const fullLandData = (): LandData => ({ cover: { coverAt: () => 4 }, near: makeNear({ sunEl: 38, sunAz: 165 }), far: makeFar(), weather: WEATHER })

/** A world input over the recorded forecast and panorama for `place` at `now` (and an optional selected hour). */
export function makeWorldInput(place: Place, now: LocalTime, land: LandData | null, selected: LocalTime | null = null): WorldInput {
  const base: Forecast = { ...mapForecast(layers), placeId: place.id, air: null, nowcast: null, normals: null, fetchedAt: 0, source: 'fixture', models: [] }
  return { place, forecast: withVisibleSun(rollForward(base, now), SHADMOT_TERRAIN, place), now, selected, terrain: SHADMOT_TERRAIN, landmarks: [], city: null, land }
}
