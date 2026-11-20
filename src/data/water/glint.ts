import { NEAR_KM } from '../terrain/panorama'
import type { WaterEdge, WaterSpan } from './waterInView'

/** The light over the water: the sun or the moon, its true azimuth and altitude (deg), and how bright it is (0–1). */
export interface WaterLight {
  azimuth: number
  altitude: number
  strength: number
}

/** The glitter path of the light on one water span, on the ray under the light (`world/water.ts` `glintsOf`). */
export interface Glint {
  /** Index of the span in the list it was found in. */
  span: number
  edge: WaterEdge
  /** Scene x of the light's azimuth. */
  x: number
  /** 0–1: the light's strength times how many wave facets can send it to the eye. */
  opacity: number
}

/** Which plane a span is drawn with: water beyond the near ridges lies on the far land, nearer water on the near. */
export const waterLayer = (span: WaterSpan): 'near' | 'far' => span.distanceKm > NEAR_KM ? 'far' : 'near'
