import { SCENE_W } from '../../world/sceneBox'
import type { Plane } from '../../world/types'
import type { Pt } from './types'

const crests = new WeakMap<Plane, Map<number, Pt[]>>()

/** The same land-pixel ridge used for the plane outline and shadow clipping. */
export function planeCrest(plane: Plane, width: number): Pt[] {
  let sizes = crests.get(plane)
  if (!sizes) crests.set(plane, sizes = new Map())
  let crest = sizes.get(width)
  if (!crest) {
    const scale = width / SCENE_W
    crest = plane.points.map(([x, y]): Pt => [x * scale, y])
    if (sizes.size >= 8) sizes.clear()
    sizes.set(width, crest)
  }
  return crest
}
