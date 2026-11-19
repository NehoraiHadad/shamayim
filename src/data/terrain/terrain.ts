import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import type { Camera } from '../../domain/camera'
import type { Sight } from '../landmarks/project'
import type { SeenPoint } from './visibility'
import { terrainFromPanorama } from './panoramaTerrain'
import { fetchPanorama } from './fetchPanorama'
import {
  packPanorama, unpackPanorama, type Panorama,
  type StoredPanorama,
} from './panorama'
import { gentleHillsPath, ridgePoints } from './profile'

export { terrainFromPanorama } from './panoramaTerrain'
export { fetchPanorama, inRift } from './fetchPanorama'

type Pt = [number, number]

export interface SceneTerrain {
  near: string
  far: string
  centerLeft: string
  centerY: number
  seaY: number
  seaInView: boolean
  seaSide: 'west' | 'east' | null
  nearPoints: Pt[]
  farPoints: Pt[]
  /** Height (m) of the ridge crest at each of the points' x, evenly across the scene (sampled terrain only). */
  nearElevations?: number[]
  farElevations?: number[]
  /**
   * y of eye level (0°) when the land is the horizon panorama, drawn on the sky's own vertical scale: the sun and moon
   * stand on this line, so they hide behind the land exactly when the real land hides them. Absent for the stand-in
   * drawings (loading, offline), where a body stands on the drawn ridge instead.
   */
  horizonY?: number
  seenAt?: (x: number, km: number, heightM?: number) => SeenPoint | null
  /** DEM height in metres relative to the eye, including ground in front of the near ridge. */
  groundAt?: (x: number, km: number) => number | null
  angleY?: (angle: number) => number
  /** Where snow above `lineM` reaches down to on each layer, as points west to east (panorama only). */
  snowEdge?: (layer: 'near' | 'far', lineM: number) => Pt[]
  /**
   * What the land is like in the direction at scene x (panorama only): how far the near ridge and the far horizon are
   * (km), and whether the far horizon shows above the near ridge there. Landmarks use it to stand on the ridge in their
   * own direction, or to be left out when the land in front hides them.
   */
  sightAt?: (x: number) => Sight
  /** The camera the land is drawn for (`domain/camera.ts`); everything placed on it by direction asks the same one. */
  camera?: Camera
  /** The hand-drawn valley (its village sits on the drawn floor, its snow line is scaled from the place's depth). */
  drawn?: boolean
}

const SHADMOT_FAR = 'M0 128V38C34 28 70 32 104 48S160 80 190 86S236 76 262 52S326 16 375 20V128Z'
const SHADMOT_NEAR = 'M0 128V50C30 44 60 48 90 62S134 90 150 96L200 97Q212 103 222 98L236 96C256 82 272 58 296 44S348 30 375 32V128Z'
const GENERIC_FAR = 'M0 128V54C52 32 102 44 148 62S236 76 284 48S344 38 375 50V128Z'

/** The hand-drawn Jordan Valley at Shadmot Mehola: shown until its panorama has loaded (and if it never can). */
const SHADMOT: SceneTerrain = {
  far: SHADMOT_FAR,
  near: SHADMOT_NEAR,
  centerLeft: '47.5%',
  centerY: 96,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  // Sampled from the drawn paths, so marks stand on the line you see (a few hand-picked corners missed the curves).
  nearPoints: ridgePoints(SHADMOT_NEAR),
  farPoints: ridgePoints(SHADMOT_FAR),
  drawn: true,
}

export const GENERIC_TERRAIN: SceneTerrain = {
  far: GENERIC_FAR,
  near: gentleHillsPath(),
  centerLeft: '50%',
  centerY: 74,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  nearPoints: ridgePoints(gentleHillsPath()),
  farPoints: ridgePoints(GENERIC_FAR),
}

function horizonKey(placeId: string): string {
  return `shamayim:horizon:v3:${placeId}`
}

export function readPanorama(placeId: string): Panorama | null {
  try {
    return unpackPanorama(JSON.parse(localStorage.getItem(horizonKey(placeId)) ?? 'null') as StoredPanorama | null)
  } catch {
    return null
  }
}

function writePanorama(placeId: string, panorama: Panorama): void {
  try {
    localStorage.setItem(horizonKey(placeId), JSON.stringify(packPanorama(panorama)))
    // The old west–east cross-section is no longer read.
    localStorage.removeItem(`shamayim:terrain:v1:${placeId}`)
  } catch {
    // The panorama gracefully remains memory-only when storage is unavailable.
  }
}

export function terrainForPlace(placeId: string, panorama: Panorama | null): SceneTerrain {
  if (panorama) return terrainFromPanorama(panorama)
  return placeId === 'shadmot-mehola' ? SHADMOT : GENERIC_TERRAIN
}

export function useTerrain(place: Place): SceneTerrain {
  const [loaded, setLoaded] = useState<{ placeId: string; panorama: Panorama | null }>(() => ({
    placeId: place.id,
    panorama: readPanorama(place.id),
  }))
  const panorama = loaded.placeId === place.id ? loaded.panorama : readPanorama(place.id)
  useEffect(() => {
    if (readPanorama(place.id)) return
    const controller = new AbortController()
    fetchPanorama(place, controller.signal).then((next) => {
      writePanorama(place.id, next)
      setLoaded({ placeId: place.id, panorama: next })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [place])
  return useMemo(() => terrainForPlace(place.id, panorama), [place.id, panorama])
}
