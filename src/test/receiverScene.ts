import { SCENE_CAMERA, xOf } from '../domain/camera'
import { anglePx } from '../data/terrain/angleScale'
import type { WorldState } from '../world/types'

/** The facts a building receiver reads, for a sun at an azimuth and altitude and an open share of sky. */
export function receiverScene(azimuth = 190, altitude = 38, open = 1) {
  const horizonY = 390 // Reference eye level for the receiver fixtures.
  const visibilityKm = 25
  const fade = (km: number) => 1 - Math.exp(-3.912 * km / visibilityKm)
  const x = xOf(azimuth)
  return {
    camera: SCENE_CAMERA, ground: { wet: 0 }, night: { dark: 0 },
    relief: { horizonY },
    light: { palette: { horizon: '#b4c3d0', mid: '#6f88b0', top: '#56769d' }, ambient: [.57, .62, .71],
      afterglow: { x, altitude, rgb: [1, .68, .29] }, clear: open, diffuse: 1 - open,
      shares: { sun: open, moon: 0 } },
    bodies: { sun: { azimuth, altitude, x, y: horizonY - anglePx(altitude) }, moon: { azimuth: 30, altitude: -8 } },
    // At 25 km with no rain, the clear-air far-veil ramp in airParts reaches zero.
    air: { haze: [.61, .68, .78], visibilityKm, dustWeight: 0, heat: 0, farFade: 0, fade },
    land: { local: [{ sample: { cover: 30, albedo: [.45, .41, .37] } }] },
  } as unknown as WorldState
}
