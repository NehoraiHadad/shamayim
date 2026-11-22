import type { TerrainPlanes } from '../../world/types'
import { layerKey } from './keys'
import type { LayerOf, Pt, SceneBox } from './types'

export type ShadowPlane = LayerOf<'plane'>['plane']
export type ShadowTerrain = Pick<TerrainPlanes, 'horizonY' | 'sightAt' | 'back'> & Partial<Pick<TerrainPlanes, 'near' | 'far'>>
export type ShadowBox = Pick<SceneBox, 'width' | 'dpr' | 'landHeight'>
export interface ShadowBlob {
  cellId: string | number
  centre: Pt
  x: number
  y: number
  rx: number
  ry: number
  opticalDepth: number
  /** Horizontal wind advection in land pixels per second. */
  speed: number
}

export interface PlaneCloudShadow {
  plane: ShadowPlane
  /** Deck transmission already applied to the shared solar beam. */
  open: number
  blobs: ShadowBlob[]
}

// Match the cloud sheet's bounded carry. Use up to four cached poses, spaced
// by the largest visible displacement rather than by the display refresh rate.
const HOLD_SECONDS = 75
const MAX_POSES = 4
const POSE_PX = 1.5

export function shadowedPlane(plane: LayerOf<'plane'>, shadow: PlaneCloudShadow | undefined, from: number): LayerOf<'plane'> {
  if (!shadow || !plane.light.litField) return plane
  const travel = Math.max(...shadow.blobs.map((blob) => Math.abs(blob.speed))) * HOLD_SECONDS
  const count = travel < 0.75 ? 1 : Math.min(MAX_POSES, 1 + Math.ceil(travel / POSE_PX))
  const animated = count > 1 ? { mode: 'frames' as const, frames: { count, fps: (count - 1) / HOLD_SECONDS, from } } : undefined
  const key = layerKey(plane.light.key, JSON.stringify([shadow.open,
    shadow.blobs.map(({ x, y, rx, ry, opticalDepth, speed }) => [x, y, rx, ry, opticalDepth, speed])]))
  return { ...plane, cloudShadow: shadow, animated, light: { ...plane.light, key } }
}

/** Smooth approximate chord depth for the projected footprint, including a soft edge. */
function chord(d2: number) {
  return d2 >= 1 ? 0 : (1 - d2) ** 2
}

export function solarTransmission(shadow: PlaneCloudShadow | undefined, seconds: number) {
  if (!shadow) return undefined
  const footprints = shadow.blobs.map(({ x, y, rx, ry, opticalDepth, speed }) =>
    ({ x: x + speed * seconds, y, rx, ry, opticalDepth }))
  return (x: number, y: number) => {
    let tau = 0
    for (const blob of footprints) {
      const dy = (y - blob.y) / blob.ry
      if (Math.abs(dy) >= 1) continue
      const dx = (x - blob.x) / blob.rx
      tau += blob.opticalDepth * chord(dx * dx + dy * dy)
    }
    return Math.min(1, Math.exp(-tau) / shadow.open)
  }
}
