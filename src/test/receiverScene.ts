import { anglePx } from '../data/terrain/angleScale'
import { SCENE_CAMERA, xOf } from '../domain/camera'
import { HORIZON_Y } from '../world/sceneBox'
import { townLightsOf } from '../world/townLights'
import type { WorldState } from '../world/types'

/** The facts a building receiver reads, for a sun at an azimuth and altitude and an open share of sky. */
export function receiverScene(azimuth = 190, altitude = 38, open = 1) {
  const x = xOf(azimuth), y = (alt: number) => HORIZON_Y - anglePx(alt)
  return {
    camera: SCENE_CAMERA, ground: { wet: 0 }, night: { dark: 0, litShare: 1 }, clouds: [],
    relief: { horizonY: HORIZON_Y, y }, townLights: townLightsOf({ lat: 0, lon: 0 }, null, 0),
    light: { palette: { horizon: '#b4c3d0', mid: '#6f88b0', top: '#56769d' }, ambient: [.57, .62, .71],
      afterglow: { x, altitude, rgb: [1, .68, .29] }, diffuse: 1 - open, clear: open,
      glow: { side: azimuth < 180 ? 'east' : 'west', x, y: y(0), opacity: .34 },
      shares: { sun: open, moon: 0 } },
    bodies: { sun: { azimuth, altitude, x, y: y(altitude) }, moon: { azimuth: 30, altitude: -8 } },
    air: { haze: [.61, .68, .78], visibilityKm: 25, dustWeight: 0, farFade: 0, heat: 0,
      horizonBand: { rgb: [.61, .68, .78], alpha: 0 }, fade: (km: number) => 1 - Math.exp(-3.912 * km / 25) },
    land: { local: [{ sample: { cover: 30, albedo: [.45, .41, .37] } }] },
  } as unknown as WorldState
}
