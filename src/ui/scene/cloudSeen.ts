import type { WeightedSighting } from '../../domain/cloudSightings'
import { SCENE_CAMERA, type Camera } from '../../domain/camera'
import { skyPoint } from './moonShape'
import { SCENE_W } from './sceneBox'

/** Assumed height of a fair-weather cloud above the valley, km (Jordan Valley cumulus bases ~1.5–2.5 km). */
const CLOUD_KM = 2

export interface SeenPuff {
  /** Fraction of the scene width, 0 = west (left). */
  x: number
  /** Degrees above the horizon the cloud is seen at. */
  altitude: number
  /** Half-width as a fraction of the scene width. */
  half: number
  /** 0–1 */
  strength: number
}

/**
 * Where each cloud the satellite saw stands in the scene: across by its direction (the projection the sun and moon use),
 * up by how far it is (a near cloud stands high, a far one sits over the ridges), as wide as it looks from the place.
 * Clouds behind the viewer (north, off the picture) are left out.
 */
export function seenPuffs(list: WeightedSighting[], camera: Camera = SCENE_CAMERA): SeenPuff[] {
  // Scene px per degree of azimuth (the camera's, as the sun and moon).
  const PX_PER_DEG = camera.pxPerDeg
  const out: SeenPuff[] = []
  for (const s of list) {
    const { x } = skyPoint(0, s.azimuth, Object.assign(() => 0, { peak: 0, camera }))
    if (x < -0.05 || x > 1.05) continue
    const d = Math.max(1, s.distanceKm)
    const altitude = (Math.atan(CLOUD_KM / d) * 180) / Math.PI
    const degrees = (2 * Math.atan(s.widthKm / 2 / d) * 180) / Math.PI
    const half = Math.min(110, Math.max(16, (degrees * PX_PER_DEG) / 2)) / SCENE_W
    out.push({ x, altitude, half, strength: Math.min(1, Math.max(0, s.strength)) })
  }
  return out
}

/** The data attribute the air reads (`layout.ts`), or none. */
export function cloudSeenAttrs(list: WeightedSighting[] | null | undefined, camera: Camera = SCENE_CAMERA) {
  const puffs = list ? seenPuffs(list, camera) : []
  if (!puffs.length) return {}
  return {
    'data-cloud-seen': puffs.map((p) => [p.x.toFixed(3), p.altitude.toFixed(1), p.half.toFixed(3), p.strength.toFixed(2)].join(',')).join(';'),
  }
}
