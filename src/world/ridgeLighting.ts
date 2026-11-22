import { clearanceOf } from './sceneLight'
import { smoothstep } from '../domain/smoothstep'

export { smoothstep } from '../domain/smoothstep'

type Point = readonly [number, number]

/** How much taller the drawn ridges are than true scale (24 km across 375 px against a few hundred metres of relief). */
export const EXAGGERATION = 3

/**
 * Light direction in drawn space (east, up). The side comes from the drawn disc (`lateral`: −1 at the setting point,
 * +1 at the rising point), so the lit flank always agrees with the sun the user sees; the height comes from the true
 * altitude, steepened by the drawing's vertical exaggeration, so a low sun grazes the land and leaves a terminator.
 */
export function ridgeLightRay(lateral: number, altitude: number): [number, number] {
  const rise = Math.tan(Math.max(.5, Math.min(80, altitude)) * Math.PI / 180) * EXAGGERATION
  return [Math.max(-1, Math.min(1, lateral)), rise]
}

interface Lighting {
  ray: Point | null
  /**
   * The light's direction at each x, when it is not one for the whole line: a turning view's strip, where each column
   * looks its own way, so the sun's side is the sun's turn from that column (`useRidgeLighting`).
   */
  rayAt?: (x: number) => Point
  depth: number
}

/** Depth gained per px away from a band's end, so each band tapers to a point instead of ending in a cut. */
const TAPER = .25

/** Caps each band's depth by its distance from the nearest unlit sample (slope scales with `depth` to preserve taper width). */
function taperEnds(samples: { x: number; amount: number }[], depth: number) {
  const taper = Math.max(TAPER, depth / 64)
  const pass = (order: number[]) => order.reduce((reach, i, k) => {
    const sample = samples[i]
    sample.amount = Math.min(sample.amount, reach)
    const next = samples[order[k + 1]]
    return next ? sample.amount + taper * Math.abs(next.x - sample.x) : reach
  }, Infinity)
  const forward = samples.map((_, i) => i)
  pass(forward)
  pass(forward.reverse())
}

export interface RidgeSample { x: number; y: number; clearance: number; facing: number; amount: number }

/**
 * The ridge lighting per profile point: how squarely the face below it turns to the light (`facing`, −1…1), how high the
 * land toward the light stands over it (`clearance`, negative in another ridge's shadow) and the lit band's depth below
 * the crest (`amount`, tapered at each band's ends): the scene's lit faces (`scene/model/planeLight.ts`).
 */
export function ridgeLightSamples(profile: readonly Point[], { ray, rayAt, depth }: Lighting): RidgeSample[] {
  const points = profile.filter(([x, y], i) =>
    Number.isFinite(x) && Number.isFinite(y) && (!i || x > profile[i - 1][0]))
  const unit = (r: Point): [number, number] => { const length = Math.hypot(...r); return length ? [r[0] / length, r[1] / length] : [0, 1] }
  const unitRay = ray ? unit(ray) : [0, 1] as [number, number]
  const samples = points.map(([x, y], i) => {
    const [east, up] = rayAt && ray ? unit(rayAt(x)) : unitRay
    const [left, right] = [points[i - 1] ?? points[i], points[i + 1] ?? points[i]]
    const slope = (left[1] - right[1]) / (right[0] - left[0] || 1)
    const facing = (up - slope * east) / Math.hypot(1, slope)
    const clearance = clearanceOf(points, x, y, [east, up])
    // Pure Lambertian facing: low sun creates crisp lit/shade flanks; high noon sun naturally lights all flanks evenly.
    const strength = Math.max(0, facing)
    return { x, y, clearance, facing, amount: ray ? depth * strength * smoothstep(0, 1, clearance) : 0 }
  })
  taperEnds(samples, depth)
  return samples
}
