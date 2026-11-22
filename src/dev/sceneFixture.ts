import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../test/scenePlaces'
import type { Place } from '../config/place'
import { unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { FLAT_ELEV_M, makeFlatPanorama } from '../test/bundledTerrain'

/** Explicit offline-only harness input for places with no recorded panorama; never used by the app. */
export function fixturePlace(params: URLSearchParams): Place | undefined {
  if (params.get('terrain') !== 'flat') return undefined
  const lat = Number(params.get('lat')), lon = Number(params.get('lon'))
  if (!params.has('lat') || !params.has('lon') || !Number.isFinite(lat + lon) || Math.abs(lat) > 90 ||
     Math.abs(lon) > 180) return undefined
  const id = params.get('place') ?? 'offline-fixture'
  return { id, usesOsm: id.startsWith('osm:'), nameHe: params.get('name') ?? 'Offline fixture',
    regionHe: '', timezone: 'Asia/Jerusalem', lat, lon, settlementType: 'village', featureCode: 'PPL' }
}

export function fixturePanorama(stored: StoredPanorama | undefined) {
  // Same stated 100 m datum as the bundled settlement audit, explicitly requested in the still URL and caption.
  if (new URLSearchParams(location.search).get('terrain') === 'flat') return makeFlatPanorama(FLAT_ELEV_M)
  return stored && unpackPanorama(stored)
}

export function harnessPlace(params: URLSearchParams) {
  const places = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...DATUM_PLACES]
  return places.find(place => place.id === (params.get('place') ?? 'shadmot-mehola')) ?? fixturePlace(params)
}
