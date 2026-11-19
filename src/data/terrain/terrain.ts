import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import type { Camera } from '../../domain/camera'
import type { Sight } from '../landmarks/project'
import type { SeenPoint } from './visibility'
import { waterAround, type WaterLookup, type WaterSpan } from '../water/waterInView'
import { loadWaterMask, type WaterMask } from '../water/waterMask'
import { terrainFromPanorama } from './panoramaTerrain'
import { fetchPanorama } from './fetchPanorama'
import {
  packPanorama, unpackPanorama, type Panorama,
  type StoredPanorama,
} from './panorama'
import { gentleHillsPath, mirrorPath, ridgePoints } from './profile'

export { terrainFromPanorama } from './panoramaTerrain'
export { fetchPanorama, inRift } from './fetchPanorama'

type Pt = [number, number]

export interface SceneTerrain {
  near: string
  far: string
  centerLeft: string
  centerY: number
  seaY: number
  /** The sea (not a lake) is in view, on this side (`water`). */
  seaInView: boolean
  seaSide: 'west' | 'east' | null
  /** Large water really in view, at its true bearing and distance (panorama only, once the water mask is known). */
  water?: WaterSpan[]
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
  /**
   * Ground height (m above sea level) at km east / north of the place, in every direction (north too), within the
   * panorama's local grid (`LocalGround`, ~6 km); null beyond it or for a panorama stored without it.
   */
  heightNear?: (dx: number, dy: number) => number | null
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

const SHADMOT_FAR_DRAWN = 'M0 128V38C34 28 70 32 104 48S160 80 190 86S236 76 262 52S326 16 375 20V128Z'
const SHADMOT_NEAR_DRAWN = 'M0 128V50C30 44 60 48 90 62S134 90 150 96L200 97Q212 103 222 98L236 96C256 82 272 58 296 44S348 30 375 32V128Z'
const GENERIC_FAR_DRAWN = 'M0 128V54C52 32 102 44 148 62S236 76 284 48S344 38 375 50V128Z'
/**
 * The stand-ins were drawn for the old mirrored scene (east on the right); the scene now faces south as an eye does
 * (east on the left), so they are turned round across.
 */
const turned = (d: string) => mirrorPath(d)
const SHADMOT_FAR = turned(SHADMOT_FAR_DRAWN)
const SHADMOT_NEAR = turned(SHADMOT_NEAR_DRAWN)
const GENERIC_FAR = turned(GENERIC_FAR_DRAWN)

/** The hand-drawn Jordan Valley at Shadmot Mehola: shown until its panorama has loaded (and if it never can). */
const SHADMOT: SceneTerrain = {
  far: SHADMOT_FAR,
  near: SHADMOT_NEAR,
  centerLeft: '52.5%',
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
  near: turned(gentleHillsPath()),
  centerLeft: '50%',
  centerY: 74,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  nearPoints: ridgePoints(turned(gentleHillsPath())),
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

export function terrainForPlace(placeId: string, panorama: Panorama | null, water: WaterLookup | null = null): SceneTerrain {
  if (panorama) return terrainFromPanorama(panorama, { water })
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
  // The water mask is one small file for every place: the land is drawn at once, its water when the mask is in.
  const [water, setWater] = useState<WaterMask | null>(null)
  useEffect(() => {
    let live = true
    loadWaterMask().then((mask) => { if (live) setWater(mask) }).catch(() => undefined)
    return () => { live = false }
  }, [])
  return useMemo(() => terrainForPlace(place.id, panorama, water && waterAround(place, water)), [place, panorama, water])
}
