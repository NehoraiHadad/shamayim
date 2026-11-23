import { smoothstep } from '../../world/field/genus'
import { DOME_ALT, type SkyGeom } from './sky'

/** Mean altitude scale divided by the panorama's azimuth scale. */
export function sceneStretch(geom: SkyGeom, pxPerDeg: number): number {
  return Math.max(1, (geom.dome(0) - geom.dome(90)) / 90 / pxPerDeg)
}

/** Use the true column aspect on the relief. Give the projected top more weight
 * as the column rises above the join, over the projected angular height of the column. */
export function shapeOf(aspect: number, top: number, heightDeg: number, projected: number) {
  return aspect + Math.max(0, projected - aspect) * smoothstep(DOME_ALT, DOME_ALT + heightDeg, top)
}

export const towerAspect = (height: number, radius: number, share: number) =>
  height * Math.sqrt(share) / (2 * radius)
