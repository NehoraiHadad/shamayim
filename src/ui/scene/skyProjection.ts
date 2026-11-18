import { skyPoint, type ScenePoint } from './moonShape'
import type { Skyline } from './skyline'

const RAD = Math.PI / 180
/**
 * Scene px per unit of sin(altitude). Across, the sky is 135 px per 90° of azimuth (1.5 px a degree); up, the same
 * 1.5 px a degree at the horizon, so a body rises and sets at its true angle (~58° in Israel), never straight up.
 * Higher up the sine eases it (cylindrical equal-area projection); the zenith stands ~86 px above the horizon.
 */
export const ALT_PX = (135 / 90) / RAD

/** The horizon a body's path stands on: a straight line from the ridge where it rises to the ridge where it sets. */
export interface HorizonLine {
  riseX: number
  riseY: number
  setX: number
  setY: number
}

/** The horizon for a pass that rises and sets at these azimuths (the line meets the drawn ridge at both ends). */
export function horizonLine(riseAzimuth: number, setAzimuth: number, skyline: Skyline): HorizonLine {
  const riseX = skyPoint(0, riseAzimuth).x
  const setX = skyPoint(0, setAzimuth).x
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
 * Where a body at its true altitude and azimuth is drawn: across by its direction (west left, south middle, east right),
 * up from the horizon line by its altitude. Below the horizon it goes on down, behind the ridge.
 */
export function projectSky(altitude: number, azimuth: number, h: HorizonLine): ScenePoint {
  const { x } = skyPoint(0, azimuth)
  return { x, y: horizonAt(h, x) - ALT_PX * Math.sin(altitude * RAD) }
}
