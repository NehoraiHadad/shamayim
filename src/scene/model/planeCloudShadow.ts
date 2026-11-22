import type { TerrainPlanes } from '../../world/types'
import { EXPOSURE_GAMMA, linearLuminance } from './landRadiance'
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

export interface ReceiverShadow extends PlaneCloudShadow {
  from: number
  /** Maximum projected speed, in land pixels per second. */
  speed: number
  /** Neutral-albedo irradiance ratio for the display mask. */
  beamOverSky: number
}

const HOLD_SECONDS = 75

export function shadowSeconds(shadow: ReceiverShadow, phase: number, still: boolean) {
  return still || !shadow.speed ? 0 : Math.max(0, Math.min(HOLD_SECONDS, phase - shadow.from))
}

export function shadowedPlane(plane: LayerOf<'plane'>, shadow: PlaneCloudShadow | undefined, from: number, animate = true): LayerOf<'plane'> {
  if (!shadow) return plane
  const bounds = plane.bounds
  const blobs = shadow.blobs.filter((blob) => {
    const atEnd = blob.x + (animate ? blob.speed * HOLD_SECONDS : 0)
    return blob.y + blob.ry >= bounds.y && blob.y - blob.ry <= bounds.y + bounds.h
      && Math.max(blob.x, atEnd) + blob.rx >= bounds.x && Math.min(blob.x, atEnd) - blob.rx <= bounds.x + bounds.w
  })
  if (!blobs.length || blobs.reduce((depth, blob) => depth + blob.opticalDepth, 0) <= -Math.log(shadow.open)) return plane
  const { grid, eSun, eSky, eMoon } = plane.light.litField
  let sun = 0, sky = 0, moon = 0
  for (let i = 0; i < grid.length; i += 4) {
    sun += grid[i]; moon += grid[i + 1]; sky += grid[i + 2]
  }
  const beam = sun * linearLuminance(eSun)
  if (!beam) return plane
  const ambient = sky * linearLuminance(eSky) + moon * linearLuminance(eMoon)
  const speed = animate ? Math.max(...blobs.map((blob) => Math.abs(blob.speed))) : 0
  return { ...plane, cloudShadow: { ...shadow, blobs, from, speed, beamOverSky: beam / Math.max(0.001, ambient) } }
}

/** Approximate the change of displayed luminance with a single sRGB alpha between the two painted endpoints. */
export function shadowAlphaTable({ open, beamOverSky }: ReceiverShadow) {
  // Scalar reflectance cancels in the endpoint ratio, as does the shared path haze in linear light.
  // Canvas interpolates encoded RGB. Use a 2.2 power transfer and the plane's mean neutral incidence
  // for the alpha mapping. Local material colours and the exact hazed, compressed endpoints stay in the bitmaps.
  const exponent = EXPOSURE_GAMMA / 2.2
  const lift = (beam: number) => (1 + beamOverSky * beam) ** exponent - 1
  const full = lift(1)
  const alpha = new Uint8Array(1025)
  for (let i = 0; i < alpha.length; i++) {
    const transmission = Math.min(1, Math.exp(-i / 64) / open)
    alpha[i] = Math.round(255 * (1 - lift(transmission) / full))
  }
  return alpha
}
