import { groundRangeAt, R_EFF_KM } from '../../world/field/project'
import { unit } from '../../world/field/genus'
import type { FieldLayer } from '../../world/field/types'
import { acrossSpeed, pxPerRadAt } from './advect'
import { scaleLight } from './tone'
import type { SkyGeom } from './sky'
import type { RGB } from './types'

const RAD = Math.PI / 180

// Two-stream diffuse transmission uses 3/4 of the transport depth.
// Water-cloud droplets have scattering asymmetry g ≈ 0.85.
export const DIFFUSE_EXTINCTION = 0.75 * (1 - 0.85)
export function sheetPathFactor(base: number, thickness: number, altitude: number, edge: number) {
  if (altitude >= 90) return 1
  const angle = altitude * RAD
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const curvature = 2 * cos * cos / R_EFF_KM
  const entry = groundRangeAt(base, altitude)
  const full = 2 / (Math.sqrt(sin * sin + curvature * base) + Math.sqrt(sin * sin + curvature * (base + thickness)))
  return Math.min(full, Math.max(0, edge - entry) / (cos * thickness))
}

export const sheetOpacity = (tau: number, slant: number) => -Math.expm1(-tau * slant)

// CIE standard overcast source: (1 + 2 sin altitude) / 3.
export const OVERCAST_HORIZON = 1 / 3

export function shadeAmount(body: RGB, shade: RGB, limb: number) {
  const channel = body.indexOf(Math.max(...body))
  const bright = body[channel], dark = shade[channel]
  if (bright <= dark) return limb
  const target = scaleLight(body, 1 - (1 - OVERCAST_HORIZON) * limb)[channel]
  // The painter interpolates sRGB endpoints. Encode the linear-light ramp
  // in the interpolation amount using the brightest channel.
  return unit((bright - target) / (bright - dark))
}

/**
 * Each row's carry across the view (px/s): the layer's wind across the view's mean direction over the row's slant range
 * (not its ground range, which vanishes overhead: the deck there moves at its wind over its height, never tears).
 */
export function rowSpeeds(geom: SkyGeom, vel: FieldLayer['vel'], east: readonly number[], north: readonly number[], slants: readonly number[]) {
  const look: [number, number] = [east.reduce((a, b) => a + b, 0) / east.length, north.reduce((a, b) => a + b, 0) / north.length]
  const perRad = pxPerRadAt(geom.azimuthAt, geom.width / 2)
  return slants.map((slant) => acrossSpeed(vel, look, slant, perRad))
}
