import type { WorldState } from '../../world/types'
import type { SkyGeom } from './sky'
import type { Pt } from './types'

/*
 * The sky's local tangent frame (C10 fixes): the scene's sky is cylindrical across (px per degree of azimuth) and stretched
 * up (the relief low down, the dome above), so a shape traced on the sphere through that projection is bent: a circle
 * round the sun becomes a loop or a teardrop, a great circle overhead an arch. Optics and contrails are drawn instead in
 * the frame tangent to the sky at one direction (their centre), with the same px per degree across and up, anchored where
 * the projection puts that centre: a circle stays round and a great circle stays straight, and both stand where the sun's
 * and the moon's geometry puts them near their centre.
 */

const RAD = Math.PI / 180

export interface SkyDir { azimuth: number; altitude: number }
type V3 = [number, number, number]

/** The unit vector of a direction (east, north, up). */
export function unitOf(d: SkyDir): V3 {
  const a = d.altitude * RAD, z = d.azimuth * RAD
  return [Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z), Math.sin(a)]
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/**
 * Px per degree of arc in the frame at an altitude: the sky's own scale across at that height (the camera's px per degree
 * of azimuth over cos h, as a body's x moves there), held from growing past 1/0.6 of it near the zenith.
 */
export function tangentScale(world: WorldState, geom: SkyGeom, altitude: number): number {
  return (world.camera.pxPerDeg * geom.s) / Math.max(0.6, Math.cos(altitude * RAD))
}

export interface TangentFrame {
  centre: SkyDir
  /** Where the centre is drawn (sky px) and the frame's px per degree. */
  at: Pt
  k: number
  /** +1 when the azimuth grows to the right on screen. */
  handed: 1 | -1
  c: V3
  /** Toward greater azimuth, and up toward the zenith, tangent to the sky at the centre. */
  e: V3
  u: V3
}

export function tangentFrame(centre: SkyDir, at: Pt, k: number, handed: 1 | -1): TangentFrame {
  const c = unitOf(centre)
  const z = centre.azimuth * RAD
  const e: V3 = [Math.cos(z), -Math.sin(z), 0]
  return { centre, at, k, handed, c, e, u: cross(e, c) }
}

/** The frame's px for a bearing `theta` (rad, 0 up toward the zenith, + toward greater azimuth) at `degrees` from the centre. */
export function frameAt(f: TangentFrame, degrees: number, theta: number): Pt {
  return [f.at[0] + f.handed * f.k * degrees * Math.sin(theta), f.at[1] - f.k * degrees * Math.cos(theta)]
}

/** The bearing (rad, as `frameAt`'s) of a screen angle `phi` (rad, canvas: atan2(dy, dx), y down) round the frame's centre. */
export function bearingOfScreen(f: TangentFrame, phi: number): number {
  return Math.atan2(f.handed * Math.cos(phi), -Math.sin(phi))
}

/**
 * The gnomonic projection (a great circle is a straight line), or null more than ~75° from the centre. Used for what is
 * straight on the sky: a contrail.
 */
export function gnomonic(f: TangentFrame, d: SkyDir): Pt | null {
  const v = unitOf(d)
  const w = dot(v, f.c)
  if (w < 0.26) return null
  return [f.at[0] + (f.handed * f.k * dot(v, f.e)) / w / RAD, f.at[1] - (f.k * dot(v, f.u)) / w / RAD]
}

/** The direction a frame point stands for (inverse gnomonic). */
export function gnomonicInverse(f: TangentFrame, p: Pt): SkyDir {
  const a = ((p[0] - f.at[0]) * f.handed * RAD) / f.k, b = (-(p[1] - f.at[1]) * RAD) / f.k
  const v: V3 = [f.c[0] + a * f.e[0] + b * f.u[0], f.c[1] + a * f.e[1] + b * f.u[1], f.c[2] + a * f.e[2] + b * f.u[2]]
  const n = Math.hypot(...v)
  return { azimuth: ((Math.atan2(v[0], v[1]) / RAD) % 360 + 360) % 360, altitude: Math.asin(v[2] / n) / RAD }
}
