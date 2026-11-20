import { inShadow } from './sceneLight'
import { SCENE_W } from './sunPath'

type Point = readonly [number, number]

export const STEP = 3
/** How deep below the surface the shadow reads, like the light wash on the sunny side (drawn units). */
export const DEPTH = 16

/** The x runs (drawn units) of ground standing in the shadow of the land toward the sun. */
export function shadowRuns(points: readonly Point[], ray: Point): [number, number][] {
  const runs: [number, number][] = []
  for (let x = 0; x <= SCENE_W; x += STEP) {
    if (!inShadow(points, ray, x)) continue
    const last = runs.at(-1)
    if (last && last[1] >= x - STEP) last[1] = x
    else runs.push([x, x])
  }
  return runs
}
