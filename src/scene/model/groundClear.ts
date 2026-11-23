//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import type { Box, SceneBox } from './types'
import type { Footprint } from './vegFootprint'

/** Caches and paint keys use the same geometry the builders use. */
export const groundClearKey = (clear: readonly Box[]) => clear.map(({ x, y, w, h }) => `${x},${y},${w},${h}`).join(';')

export function groundBlocker(box: SceneBox, clear: readonly Box[]) {
  const sx = box.width / SCENE_W
  const zones = clear.map(({ x, y, w, h }) => ({ left: x / sx - 2, right: (x + w) / sx + 2, top: y - 2, bottom: y + h + 2 }))
  return ([left, top, right, bottom]: Footprint) => bottom > box.landHeight - 0.5
    || zones.some((z) => right > z.left && left < z.right && bottom > z.top && top < z.bottom)
}
