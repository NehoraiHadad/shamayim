import fs from 'node:fs'
import path from 'node:path'
import { vi } from 'vitest'
import type { Place } from '../config/place'
import { loadCity } from '../data/city/cityData'
import { loadFar, type FarData } from '../data/city/farData'
import type { CityResult } from '../data/city/types'
import { loadIsrael } from '../data/landmarks/israelData'
import type { CropArea } from '../data/landmarks/cropAreas'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import type { Landmark } from '../data/landmarks/types'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import type { SceneTerrain } from '../data/terrain/terrain'
import { waterAround } from '../data/water/waterInView'
import { waterMask, type WaterMask, type WaterMaskFile } from '../data/water/waterMask'
import type { BoundsFile } from '../data/city/bounds'
import { loadLandCover, type LandCover } from '../data/land/landData'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import { withVisibleSun } from '../world/visibleSun'
import type { WorldInput } from '../world/types'
import layersFixture from './fixtures/forecast-layers-2026-11-17.json'
import { SCENE_PLACES } from './scenePlaces'

/**
 * The baseline places loaded for the canvas scene's tests: recorded panoramas, the bundled landmark, city and water
 * data (fetched from `public/`, no network), and the synthetic forecast with the scene's hourly fields.
 */
const root = path.resolve(__dirname, '../..')

export interface LoadedPlace { place: Place; terrain: SceneTerrain; landmarks: Landmark[]; seatCandidates?: Landmark[]
  cropAreas?: readonly CropArea[]; city: CityResult | null; far: FarData | null; waterMask?: WaterMask | null; bounds?: BoundsFile | null
  cover?: LandCover | null }

export function stubPublicFetch() {
  vi.stubGlobal('document', { hidden: false })
  vi.stubGlobal('fetch', async (url: string) => {
    const file = path.join(root, 'public', url.replace(/^\//, ''))
    return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 })
  })
}

export async function loadPlaces(places: readonly Place[] = SCENE_PLACES): Promise<Map<string, LoadedPlace>> {
  const mask = waterMask(JSON.parse(fs.readFileSync(path.join(root, 'public/data/land/water.json'), 'utf8')) as WaterMaskFile)
  const signal = new AbortController().signal
  const out = new Map<string, LoadedPlace>()
  const far = await loadFar()
  const bounds = JSON.parse(fs.readFileSync(path.join(root, 'public/data/city/bounds.json'), 'utf8')) as BoundsFile
  for (const place of places) {
    const stored = JSON.parse(fs.readFileSync(path.join(root, `src/test/fixtures/scene/${place.id}.panorama.json`), 'utf8')) as StoredPanorama
    const terrain = terrainFromPanorama(unpackPanorama(stored)!, { water: waterAround(place, mask) })
    const source = await loadLandmarkSource(place, signal, { israel: loadIsrael })
    out.set(place.id, { place, terrain, landmarks: withPlaceHomes(place, source.sceneMarks), seatCandidates: source.seatCandidates,
      cropAreas: source.cropAreas, city: await loadCity(place, signal), far, waterMask: mask, bounds, cover: await loadLandCover(place, signal, 6) })
  }
  return out
}

export function worldInput(loaded: LoadedPlace, now: LocalTime, selected: LocalTime | null = null): WorldInput {
  const { place, terrain, landmarks, seatCandidates, cropAreas, city, far, waterMask, bounds, cover } = loaded
  const base: Forecast = { ...mapForecast(layersFixture), placeId: place.id, air: null, nowcast: null, normals: null,
    fetchedAt: 0, source: 'fixture', models: [] }
  return { place, forecast: withVisibleSun(rollForward(base, now), terrain, place), now, selected, terrain, landmarks,
    seatCandidates, cropAreas, city, far, waterMask, bounds, cover }
}
