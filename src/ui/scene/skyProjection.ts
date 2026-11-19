import { anglePx, SKY_PX } from '../../data/terrain/angleScale'
import { skyPoint, type ScenePoint } from './moonShape'
import type { Skyline } from './skyline'

/**
 * Scene px per unit of sin(altitude) in the sky's own (unstretched) part. Across, the sky follows the camera
 * (`domain/camera.ts`, 1.5 px a degree today). Up, every altitude goes through `anglePx` (`data/terrain/angleScale.ts`): the sky's sine scale
 * plus a stretch of the first few degrees, the same one the land of the horizon panorama is drawn with.
 */
export const ALT_PX = SKY_PX

/** The horizon a body's path stands on: a straight line from the ridge where it rises to the ridge where it sets. */
export interface HorizonLine {
  riseX: number
  riseY: number
  setX: number
  setY: number
}

/**
 * The horizon for a pass that rises and sets at these azimuths. Over a horizon panorama it is eye level itself (one
 * level line under the whole sky, which the land rises above at its true angles); over a stand-in drawing it runs from
 * the drawn ridge where the body rises to the drawn ridge where it sets.
 */
export function horizonLine(riseAzimuth: number, setAzimuth: number, skyline: Skyline): HorizonLine {
  const riseX = skyPoint(0, riseAzimuth).x
  const setX = skyPoint(0, setAzimuth).x
  if (skyline.horizon !== undefined) return { riseX, riseY: skyline.horizon, setX, setY: skyline.horizon }
  return { riseX, riseY: skyline(riseX), setX, setY: skyline(setX) }
}

/** The horizon's y at x: straight between the ends (one line, so the path never copies the bumps of the ridge). */
export function horizonAt(h: HorizonLine, x: number): number {
  const span = h.setX - h.riseX
  if (Math.abs(span) < 1e-3) return (h.riseY + h.setY) / 2
  const t = Math.min(1, Math.max(0, (x - h.riseX) / span))
  return h.riseY + (h.setY - h.riseY) * t
}

/**
 * Atmospheric refraction (deg) for a true altitude (deg): ~0.57° at the horizon, a tenth of that by 6°
 * (Sæmundsson's formula; held at its −1° value below that, where it only moves a hidden disc).
 */
export function refraction(altitude: number): number {
  const h = Math.max(-1, altitude)
  return 1.02 / Math.tan(((h + 10.3 / (h + 5.11)) * Math.PI) / 180) / 60
}

/** Where a body is seen: its true altitude lifted by refraction (the land's angles carry their own). */
export function apparentAltitude(altitude: number): number {
  return altitude + refraction(altitude)
}

/**
 * Where a body at its (apparent) altitude and true azimuth is drawn: across by its direction (through the camera:
 * today west left, south middle, east right), up from the horizon line by its altitude on the shared angle scale. Below the horizon it goes on down,
 * behind the land.
 */
export function projectSky(altitude: number, azimuth: number, h: HorizonLine): ScenePoint {
  const { x } = skyPoint(0, azimuth)
  return { x, y: horizonAt(h, x) - anglePx(altitude) }
}
