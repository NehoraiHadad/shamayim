import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { SCENE_CAMERA, type Camera } from '../../domain/camera'
import { fetchPanorama } from '../terrain/fetchPanorama'
import { packPanorama, unpackPanorama, type Panorama } from '../terrain/panorama'
import { terrainFromPanorama } from '../terrain/panoramaTerrain'
import type { SceneTerrain } from '../terrain/terrain'
import { stageAt, STAGE_HORIZON_Y } from './stage'
import { computeWorld, viewPanorama, WORLD_STEP } from './world'

const key = (placeId: string) => `shamayim:world:v1:${placeId}`
const worldAzimuth = (i: number) => i * WORLD_STEP

function readWorld(placeId: string): Panorama | null {
  try {
    return unpackPanorama(JSON.parse(localStorage.getItem(key(placeId)) ?? 'null'), worldAzimuth)
  } catch {
    return null
  }
}

function writeWorld(placeId: string, world: Panorama) {
  try { localStorage.setItem(key(placeId), JSON.stringify(packPanorama(world))) } catch { /* Memory only is fine. */ }
}

/** A place's whole horizon (every 1.25°), from storage or the DEM tiles; null until it is known. */
export function useWorld(place: Place, enabled: boolean): Panorama | null {
  const [loaded, setLoaded] = useState<{ placeId: string; world: Panorama | null }>(() =>
    ({ placeId: place.id, world: enabled ? readWorld(place.id) : null }))
  const world = loaded.placeId === place.id ? loaded.world : enabled ? readWorld(place.id) : null
  useEffect(() => {
    if (!enabled || readWorld(place.id)) return
    const controller = new AbortController()
    fetchPanorama(place, controller.signal, computeWorld).then((next) => {
      writeWorld(place.id, next)
      setLoaded({ placeId: place.id, world: next })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [place, enabled])
  return world
}

/** The camera of a turning view: a true camera (azimuth grows to the right), on the world's 1.25° grid. */
export function turningCamera(heading: number): Camera {
  const snapped = ((Math.round(heading / WORLD_STEP) * WORLD_STEP) % 360 + 360) % 360
  return { ...SCENE_CAMERA, heading: snapped, handed: 1 }
}

/**
 * The land for a turning view: what the camera sees of the world, with the place on its stage in front, and the land
 * the sun is judged against (the south slice, which holds the sun's whole path), both at the one eye level.
 */
export function useTurningView(world: Panorama | null, heading: number): { terrain: SceneTerrain; sunTerrain: SceneTerrain } | null {
  const sunTerrain = useMemo(() => world && terrainFromPanorama(viewPanorama(world, SCENE_CAMERA), { horizonY: STAGE_HORIZON_Y }), [world])
  const camera = turningCamera(heading)
  const terrain = useMemo(() => world && terrainFromPanorama(viewPanorama(world, camera),
    { camera, horizonY: STAGE_HORIZON_Y, stage: stageAt(STAGE_HORIZON_Y) }),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the camera is fully given by its heading
  [world, camera.heading])
  return world && terrain && sunTerrain ? { terrain, sunTerrain } : null
}
