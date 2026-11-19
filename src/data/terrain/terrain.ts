import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import type { Camera } from '../../domain/camera'
import type { Sight } from '../landmarks/project'
import type { SeenPoint } from './visibility'
import { waterAround, type WaterLookup, type WaterSpan } from '../water/waterInView'
import { loadWaterMask, type WaterMask } from '../water/waterMask'
import { MIDDLE_Y, terrainFromPanorama } from './panoramaTerrain'
import { fetchPanorama } from './fetchPanorama'
import {
  packPanorama, unpackPanorama, type Panorama,
  type StoredPanorama,
} from './panorama'

export { terrainFromPanorama } from './panoramaTerrain'
export { fetchPanorama, inRift } from './fetchPanorama'

type Pt = [number, number]

/**
 * Where the place's land stands (C8): `ready` once its panorama is in (from storage or fetched), `loading` while it is
 * being fetched, `offline` when the fetch failed and none is stored (no land data, ever, until the network returns). The
 * scene draws a mist in the land's place until it is `ready` (`scene/model/loading.ts`).
 */
export type LandStatus = 'ready' | 'loading' | 'offline'

export interface SceneTerrain {
  centerLeft: string
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
   * y of eye level (0°), on the sky's own vertical scale: the sun and moon stand on this line, so they hide behind the
   * land exactly when the real land hides them. While the land is unknown, a guess (`UNKNOWN_EYE_Y`).
   */
  horizonY: number
  seenAt?: (x: number, km: number, heightM?: number) => SeenPoint | null
  /**
   * Ground height (m above sea level) at km east / north of the place, in every direction (north too), within the
   * panorama's local grid (`LocalGround`, ~6 km); null beyond it or for a panorama stored without it.
   */
  heightNear?: (dx: number, dy: number) => number | null
  /** DEM height in metres relative to the eye, including ground in front of the near ridge. */
  groundAt?: (x: number, km: number) => number | null
  angleY?: (angle: number) => number
  /** The eye's height (m above sea level) the panorama was drawn for (panorama only). */
  eyeM?: number
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
  /** Whether the land is known yet (`useTerrain`); absent: known (a panorama). */
  status?: LandStatus
}

/**
 * Eye level while the land is unknown (C8): where the panorama puts it when the near ridge due south stands at eye level
 * (`MIDDLE_Y`), the middle of the places' range (66–105 over the baseline and still places). The sky stands on it until the
 * land arrives, then settles to the land's own (`scene/model/loading.ts`, the glide).
 */
export const UNKNOWN_EYE_Y = MIDDLE_Y

/**
 * The land the world stands on while the place's own is not known (loading, or offline with none stored): no ridge,
 * eye level at `UNKNOWN_EYE_Y`, so the sun and moon set at their true horizon (0°) and nothing is placed on a guessed
 * shape. Nothing is drawn of it: the scene shows a mist in its place (C8).
 */
export function unknownLand(status: Exclude<LandStatus, 'ready'>): SceneTerrain {
  const flat: Pt[] = [[0, UNKNOWN_EYE_Y], [375, UNKNOWN_EYE_Y]]
  return { centerLeft: '50%', seaY: UNKNOWN_EYE_Y, seaInView: false, seaSide: null, nearPoints: flat, farPoints: flat,
    horizonY: UNKNOWN_EYE_Y, status }
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

/** The place's land: its panorama once known, else the unknown land of its status (C8). */
export function terrainForPlace(panorama: Panorama | null, status: Exclude<LandStatus, 'ready'>, water: WaterLookup | null = null): SceneTerrain {
  return panorama ? { ...terrainFromPanorama(panorama, { water }), status: 'ready' } : unknownLand(status)
}

export function useTerrain(place: Place): SceneTerrain {
  const [loaded, setLoaded] = useState<{ placeId: string; panorama: Panorama | null; failed: boolean }>(() => ({
    placeId: place.id,
    panorama: readPanorama(place.id),
    failed: false,
  }))
  const mine = loaded.placeId === place.id
  const panorama = mine ? loaded.panorama : readPanorama(place.id)
  const failed = mine && loaded.failed
  // A failed fetch (offline, no stored panorama) is tried again when the network comes back.
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!failed) return
    const retry = () => setAttempt((n) => n + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [failed])
  useEffect(() => {
    if (readPanorama(place.id)) return
    const controller = new AbortController()
    fetchPanorama(place, controller.signal).then((next) => {
      writePanorama(place.id, next)
      setLoaded({ placeId: place.id, panorama: next, failed: false })
    }).catch(() => {
      if (!controller.signal.aborted) setLoaded({ placeId: place.id, panorama: null, failed: true })
    })
    return () => controller.abort()
  }, [place, attempt])
  // The water mask is one small file for every place: the land is drawn at once, its water when the mask is in.
  const [water, setWater] = useState<WaterMask | null>(null)
  useEffect(() => {
    let live = true
    loadWaterMask().then((mask) => { if (live) setWater(mask) }).catch(() => undefined)
    return () => { live = false }
  }, [])
  const status = failed ? 'offline' : 'loading'
  return useMemo(() => terrainForPlace(panorama, status, water && waterAround(place, water)), [place, panorama, water, status])
}
