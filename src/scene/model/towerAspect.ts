import { smoothstep } from '../../world/field/genus'
import { DOME_ALT, type SkyGeom } from './sky'

/** Mean altitude scale divided by the panorama's azimuth scale. */
export function sceneStretch(geom: SkyGeom, pxPerDeg: number): number {
  return Math.max(1, (geom.dome(0) - geom.dome(90)) / 90 / pxPerDeg)
}

// Retain the existing portrait stretch exponent once the top reaches 60°, two thirds of the way to zenith.
export function shapeOf(aspect: number, stretch: number, top: number): number {
  const raised = raisedAspect(aspect, stretch)
  const relief = Math.max(aspect, Math.min(1, raised))
  return relief + (raised - relief) * smoothstep(DOME_ALT, 60, top)
}

export const raisedAspect = (aspect: number, stretch: number) => aspect * stretch ** 0.55
