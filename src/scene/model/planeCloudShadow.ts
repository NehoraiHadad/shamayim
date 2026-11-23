import type { RGB, TerrainPlanes } from '../../world/types'
import { EXPOSURE_GAMMA, linearLuminance, srgbRgbToLinear } from './landRadiance'
import { toSrgb } from './tone'
import type { Box, LayerOf, Pt, SceneBox } from './types'
import { shadowEdgeWidth } from './cloudShadowEdge'

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
  edge?: { lobes: readonly number[]; penumbraX: number; penumbraY: number }
  diffuseView?: number
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
  /** Ratio of the neutral scattered beam to the incident solar irradiance. */
  neutralBeam?: number
  coreDiffuse?: number
}

export const SHADOW_DEPTH_STEPS = 64
const WATER_TRANSPORT = (1 - .85) * .75
export const diffuseTransmission = (tau: number) => 1 / (1 + WATER_TRANSPORT * Math.max(0, tau))
/** The short paths through sunlit lobes fill part of the underside's view.
 * Keep that light in the same partition of the removed solar beam. */
export const cloudScatter = (tau: number) => .75 * diffuseTransmission(tau) + .25 * diffuseTransmission(tau / 4)

export function shadowRadii({ rx, ry, edge }: ShadowBlob): Pt {
  if (!edge) return [rx, ry]
  const reach = 1 + Math.max(0, ...edge.lobes)
  return [rx * reach + shadowEdgeWidth(rx * reach, edge.penumbraX) / 2,
    ry * reach + shadowEdgeWidth(ry * reach, edge.penumbraY) / 2]
}

export const SHADOW_CARRY_SECONDS = 75

export function shadowSeconds(shadow: ReceiverShadow, phase: number, still: boolean) {
  return still || !shadow.speed ? 0 : Math.max(0, Math.min(SHADOW_CARRY_SECONDS, phase - shadow.from))
}

const stagger: Record<ShadowPlane, number> = { back: 0, far: 1 / 3, near: 2 / 3 }

/** One device pixel of carry, with different update boundaries on each plane. */
export function shadowStep(shadow: ReceiverShadow, phase: number, still: boolean, ratio: number) {
  return Math.floor(shadowSeconds(shadow, phase, still) * shadow.speed * ratio + stagger[shadow.plane])
}

export function receiverBlobs(shadow: PlaneCloudShadow, bounds: Box, animate: boolean) {
  const blobs = shadow.blobs.filter((blob) => {
    const atEnd = blob.x + (animate ? blob.speed * SHADOW_CARRY_SECONDS : 0)
    const [rx, ry] = shadowRadii(blob)
    return blob.y + ry >= bounds.y && blob.y - ry <= bounds.y + bounds.h
      && Math.max(blob.x, atEnd) + rx >= bounds.x && Math.min(blob.x, atEnd) - rx <= bounds.x + bounds.w
  })
  return blobs.length && blobs.reduce((depth, blob) => depth + blob.opticalDepth, 0) > -Math.log(shadow.open) ? blobs : undefined
}

export function shadowedPlane(plane: LayerOf<'plane'>, shadow: PlaneCloudShadow | undefined, from: number, animate = true): LayerOf<'plane'> {
  if (!shadow) return plane
  const blobs = receiverBlobs(shadow, plane.bounds, animate)
  if (!blobs) return plane
  const { grid, eSun, eSky, eMoon, hazeLin, yHorizon } = plane.light.litField
  let sun = 0, sky = 0, moon = 0, haze = 0, lit = 0
  for (let i = 0; i < grid.length; i += 4) {
    if (!grid[i]) continue
    lit++
    haze += grid[i + 3]
    sun += grid[i]; moon += grid[i + 1]; sky += grid[i + 2]
  }
  const beam = sun * linearLuminance(eSun)
  if (!beam) return plane
  // Moon is part of the beam-removed endpoint. Cloud footprints modulate the solar term only.
  const ambient = Math.max(0.001, sky * linearLuminance(eSky) + moon * linearLuminance(eMoon))
  const neutralAlbedo = linearLuminance(srgbRgbToLinear(plane.fill))
  const skyDisplay = yHorizon * (neutralAlbedo * ambient / (lit * 255)) ** EXPOSURE_GAMMA
  let area = 0, view = 0, maxDepth = 0
  for (const blob of blobs) {
    const weight = blob.rx * blob.ry
    area += weight
    view += weight * (blob.diffuseView ?? 1)
    maxDepth = Math.max(maxDepth, blob.opticalDepth)
  }
  const neutral = Math.min(...eSun) * (area ? view / area : 0)
  const neutralBeam = neutral / linearLuminance(eSun)
  // All receivers on the plane interpolate to the same deep-shadow endpoint.
  // The alpha table handles the stronger diffuse transmission through thinner cloud.
  const coreDiffuse = Math.round(256 * cloudScatter(maxDepth)) / 256
  const diffuse = coreDiffuse * neutral
  const cloudDiffuse: RGB = [diffuse, diffuse, diffuse]
  const light = { ...plane.light, litField: { ...plane.light.litField, cloudDiffuse } }
  const speed = animate ? Math.max(...blobs.map((blob) => Math.abs(blob.speed))) : 0
  return { ...plane, light, cloudShadow: { ...shadow, blobs, from, speed, beamOverSky: beam / ambient, skyDisplay, neutralBeam, coreDiffuse,
    hazeShare: haze / (lit * 255), hazeY: linearLuminance(hazeLin) } }
}

export type ShadowExposure = Pick<ReceiverShadow, 'open' | 'beamOverSky' | 'skyDisplay' | 'hazeShare' | 'hazeY' | 'neutralBeam' | 'coreDiffuse'>

export function shadowTransport(tau: number, open: number, coreDiffuse: number) {
  const direct = Math.min(1, Math.exp(-tau) / open)
  // Redistribute only light removed here. The deck has already changed the
  // incident beam and sky. Use the additional depth through this cell.
  const scattered = (1 - direct) * Math.max(coreDiffuse, cloudScatter(tau + Math.log(open)))
  return { direct, scattered }
}

/** Approximate the change of displayed luminance with a single sRGB alpha between the two painted endpoints. */
export function shadowAlphaTable({ open, beamOverSky, skyDisplay, hazeShare, hazeY, neutralBeam = 0, coreDiffuse = 0 }: ShadowExposure) {
  // Use representative luminance and mean path haze to look up the encoded interpolation weight.
  // The two receiver images still carry the exact local material, colour and haze.
  const encode = (t: number) => toSrgb((1 - hazeShare) * skyDisplay * (1 + beamOverSky * t) ** EXPOSURE_GAMMA + hazeShare * hazeY)
  const full = encode(1), span = full - encode(neutralBeam * coreDiffuse)
  const alpha = new Uint8Array((neutralBeam ? 96 : 16) * SHADOW_DEPTH_STEPS + 1)
  if (!(span > 0)) return alpha
  for (let i = 0; i < alpha.length; i++) {
    const { direct, scattered } = shadowTransport(i / SHADOW_DEPTH_STEPS, open, coreDiffuse)
    const weight = Math.round(255 * (full - encode(direct + neutralBeam * scattered)) / span)
    if (weight === 255) {
      alpha.fill(255, i)
      break
    }
    alpha[i] = weight
  }
  return alpha
}
