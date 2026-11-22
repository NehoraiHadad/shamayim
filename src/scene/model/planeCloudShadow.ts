import type { TerrainPlanes } from '../../world/types'
import { EXPOSURE_GAMMA, linearLuminance, srgbRgbToLinear } from './landRadiance'
import { toSrgb } from './tone'
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
  skyDisplay: number
  hazeShare: number
  hazeY: number
}

const HOLD_SECONDS = 75

export function shadowSeconds(shadow: ReceiverShadow, phase: number, still: boolean) {
  return still || !shadow.speed ? 0 : Math.max(0, Math.min(HOLD_SECONDS, phase - shadow.from))
}

const stagger: Record<ShadowPlane, number> = { back: 0, far: 1 / 3, near: 2 / 3 }

/** One device pixel of carry, with different update boundaries on each plane. */
export function shadowStep(shadow: ReceiverShadow, phase: number, still: boolean, ratio: number) {
  return Math.floor(shadowSeconds(shadow, phase, still) * shadow.speed * ratio + stagger[shadow.plane])
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
  const { grid, eSun, eSky, eMoon, hazeLin, yHorizon } = plane.light.litField
  let sun = 0, sky = 0, moon = 0, haze = 0, lit = 0
  for (let i = 0; i < grid.length; i += 4) {
    haze += grid[i + 3]
    if (!grid[i]) continue
    lit++
    sun += grid[i]; moon += grid[i + 1]; sky += grid[i + 2]
  }
  const beam = sun * linearLuminance(eSun)
  if (!beam) return plane
  // Moon is part of the beam-removed endpoint. Cloud footprints modulate the solar term only.
  const ambient = Math.max(0.001, sky * linearLuminance(eSky) + moon * linearLuminance(eMoon))
  const neutralAlbedo = linearLuminance(srgbRgbToLinear(plane.fill))
  const skyDisplay = yHorizon * (neutralAlbedo * ambient / (lit * 255)) ** EXPOSURE_GAMMA
  const speed = animate ? Math.max(...blobs.map((blob) => Math.abs(blob.speed))) : 0
  return { ...plane, cloudShadow: { ...shadow, blobs, from, speed, beamOverSky: beam / ambient, skyDisplay,
    hazeShare: haze / (grid.length / 4 * 255), hazeY: linearLuminance(hazeLin) } }
}

/** Approximate the change of displayed luminance with a single sRGB alpha between the two painted endpoints. */
export function shadowAlphaTable({ open, beamOverSky, skyDisplay, hazeShare, hazeY }: ReceiverShadow) {
  // Use representative luminance and mean path haze to look up the encoded interpolation weight.
  // The two receiver images still carry the exact local material, colour and haze.
  const encode = (t: number) => toSrgb((1 - hazeShare) * skyDisplay * (1 + beamOverSky * t) ** EXPOSURE_GAMMA + hazeShare * hazeY)
  const full = encode(1), span = full - encode(0)
  const alpha = new Uint8Array(1025)
  if (!(span > 0)) return alpha
  for (let i = 0; i < alpha.length; i++) {
    const transmission = Math.min(1, Math.exp(-i / 64) / open)
    alpha[i] = Math.round(255 * (full - encode(transmission)) / span)
  }
  return alpha
}
