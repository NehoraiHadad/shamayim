import { SCENE_CAMERA, xOf, type Camera } from '../../domain/camera'
import { NEAR_KM } from '../terrain/panorama'
import type { WaterEdge, WaterSpan } from './waterInView'

/** The light over the water: the sun or the moon, its true azimuth and altitude (deg), and how bright it is (0–1). */
export interface WaterLight {
  azimuth: number
  altitude: number
  strength: number
}

/** The glitter path of the light on one water span, on the ray under the light. */
export interface Glint {
  /** Index of the span in the list it was found in. */
  span: number
  edge: WaterEdge
  /** Scene x of the light's azimuth. */
  x: number
  /** 0–1: the light's strength times how many wave facets can send it to the eye. */
  opacity: number
}

/**
 * How much of the light the water sends to the eye at a depression `downDeg` below eye level, with the light at
 * `altitudeDeg`: a wave facet must tilt by half the angle between the two to reflect it, and the share of facets that
 * tilt that far falls off as Cox and Munk measured (slope variance 0.003 + 0.00512 × wind in m/s). So the path is bright
 * under a low sun and fades as it climbs: at noon only facets far steeper than the waves have point it at a far shore.
 */
export function glitter(altitudeDeg: number, downDeg: number, windMs = 5): number {
  const tilt = ((altitudeDeg + downDeg) / 2) * (Math.PI / 180)
  const variance = 0.003 + 0.00512 * windMs
  return Math.exp(-(Math.tan(tilt) ** 2) / variance)
}

/** Below this the path is not drawn. */
const MIN_GLINT = 0.04

/**
 * The light's glitter path on the water in view: on the span the light's azimuth stands over, when the light is up and
 * not behind the land (`lit`, decided by the caller against the drawn land). Physically: the path lies straight under
 * the light, from the water's far edge toward the eye.
 */
export function waterGlints(spans: readonly WaterSpan[], light: WaterLight | null, lit: boolean,
  camera: Camera = SCENE_CAMERA, windMs = 5): Glint[] {
  if (!light || !lit || light.altitude <= 0 || light.strength <= 0) return []
  const x = xOf(light.azimuth, camera)
  return spans.flatMap((span, index) => {
    if (x < span.from || x > span.to) return []
    const edge = span.edges.reduce((best, e) => Math.abs(e.x - x) < Math.abs(best.x - x) ? e : best)
    const sendsBack = Math.max(glitter(light.altitude, -edge.farAngle, windMs), glitter(light.altitude, -edge.nearAngle, windMs))
    const opacity = light.strength * sendsBack
    return opacity >= MIN_GLINT ? [{ span: index, edge, x, opacity }] : []
  })
}

/** Which plane a span is drawn with: water beyond the near ridges lies on the far land, nearer water on the near. */
export const waterLayer = (span: WaterSpan): 'near' | 'far' => span.distanceKm > NEAR_KM ? 'far' : 'near'
