import fs from 'node:fs'
import path from 'node:path'
import { boundsForPlace, boundsHoldKm, type BoundsFile } from '../data/city/bounds'
import { loadCity } from '../data/city/cityData'
import { loadFar } from '../data/city/farData'
import { isOwnSpot } from '../data/city/outsideView'
import { loadLandCover } from '../data/land/landData'
import { withIcons } from '../data/landmarks/curated'
import { loadIsrael } from '../data/landmarks/israelData'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import { portraitReach } from '../data/landmarks/portrait'
import { offsetKm } from '../data/landmarks/project'
import { isSettlementMark } from '../data/landmarks/settlement'
import type { Landmark } from '../data/landmarks/types'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { unpackPanorama, type Panorama, type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import { waterAround } from '../data/water/waterInView'
import { waterMask, type WaterMaskFile } from '../data/water/waterMask'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import type { OutsideView } from '../world/types'
import { withVisibleSun } from '../world/visibleSun'
import { buildWorld } from '../world/world'
import layersFixture from './fixtures/forecast-layers-2026-11-17.json'
import type { Place } from '../config/place'
import { classify, makeFlatPanorama, FLAT_ELEV_M } from './bundledTerrain'

export { FLAT_ELEV_M } from './bundledTerrain'
const AT: LocalTime = '2026-11-17T12:00'
export interface BundledEntry { place: Place; source: 'scenePlaces' | 'karmei-tzur' | 'cityCluster' }

export async function bundledWorldLoader(root: string) {
  const mask = waterMask(JSON.parse(fs.readFileSync(path.join(root, 'public/data/land/water.json'),
    'utf8')) as WaterMaskFile)
  const boundsFile = JSON.parse(fs.readFileSync(path.join(root, 'public/data/city/bounds.json'), 'utf8')) as BoundsFile
  const far = await loadFar()
  const flatPano = makeFlatPanorama(FLAT_ELEV_M)
  const signal = new AbortController().signal
  const mappedForecastBase = mapForecast(layersFixture)
  return async ({ place, source }: BundledEntry, heights: Readonly<Record<string, number>> = {}) => {
    const panoPath = path.join(root, `src/test/fixtures/scene/${place.id}.panorama.json`)
    const hasRecorded = source === 'scenePlaces' && fs.existsSync(panoPath)
    let terrainKind: 'recorded' | 'flat'
    let pano: Panorama
    let elevM: number
    if (hasRecorded) {
      terrainKind = 'recorded'
      const stored = JSON.parse(fs.readFileSync(panoPath, 'utf8')) as StoredPanorama
      pano = unpackPanorama(stored)!
      elevM = pano.groundM
    } else {
      terrainKind = 'flat'
      pano = flatPano
      elevM = FLAT_ELEV_M
    }

    const terrain = terrainFromPanorama(pano, { water: waterAround(place, mask) })
    const [rawIsrael, city, cover] = await Promise.all([
      loadIsrael(place, signal),
      loadCity(place, signal),
      loadLandCover(place, signal, 6),
    ])
    for (const mark of rawIsrael ?? []) {
      if (heights[mark.id] !== undefined) mark.heightM = heights[mark.id]
    }
    const landmarkSource = await loadLandmarkSource(place, signal, {
      israel: async () => rawIsrael,
      overpass: async () => [],
    })

    const allLandmarks = withIcons(place, rawIsrael ?? [])
    const landmarkById = new Map<string, Landmark>(allLandmarks.map((m) => [m.id, m]))
    for (const m of [...landmarkSource.sceneMarks, ...landmarkSource.seatCandidates]) {
      if (!landmarkById.has(m.id)) landmarkById.set(m.id, m)
    }

    const baseForecast: Forecast = {
      ...mappedForecastBase,
      elevation: elevM,
      placeId: place.id,
      air: null, nowcast: null, normals: null,
      fetchedAt: 0, source: 'fixture', models: [],
    }
    const input = {
      place,
      forecast: withVisibleSun(rollForward(baseForecast, AT), terrain, place),
      now: AT,
      selected: null,
      terrain,
      landmarks: withPlaceHomes(place, landmarkSource.sceneMarks),
      seatCandidates: landmarkSource.seatCandidates,
      city,
      far,
      waterMask: mask,
      bounds: boundsFile,
      cover,
    }

    const world = buildWorld(input)
    const view = world.place3 as OutsideView
    const reachKm = portraitReach(city?.clusters, place.nameHe)
    const pb = boundsForPlace(place, city?.clusters, boundsFile, reachKm)
    const lie = pb ? { inPlace: (dx: number, dy: number) => boundsHoldKm(pb, place, dx, dy) } : {}
    const hasRaster = Boolean(city?.raster)

    // Classify place from ALL bundled Israel landmarks using exact isOwnSpot / boundsForPlace ownership
    const ownCounts = { synagogue: 0, minaret: 0, church: 0 }
    const boundsCounts = { synagogue: 0, minaret: 0, church: 0 }
    for (const m of rawIsrael ?? []) {
      if (m.kind !== 'synagogue' && m.kind !== 'minaret' && m.kind !== 'church') continue
      const { dx, dy } = offsetKm(place, m)
      const inOwn = isOwnSpot(view.frame, lie, dx, dy, hasRaster && isSettlementMark(m) ? 0 : 1)
      if (inOwn) ownCounts[m.kind]++
      if (pb?.contains(m.lat, m.lon)) boundsCounts[m.kind]++
    }
    const placeClass = classify(ownCounts)

    return { place, source, terrainKind, elevM, terrain, input, world, view, landmarkById, pb, lie, hasRaster,
      ownCounts, boundsCounts, placeClass }
  }
}
export type BundledContext = Awaited<ReturnType<Awaited<ReturnType<typeof bundledWorldLoader>>>>
