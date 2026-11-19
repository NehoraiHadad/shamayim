//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { Box, Dot, Gully, Path, Pt, SceneBox } from './types'

/**
 * The ground of a plane in the box (the form canvas): the world's gullies, terraces and scrub (`world/land.ts`, placed
 * from the terrain data), kept out of the text and dot zones (`clear`): a gully stops where it meets one, a terrace is
 * cut round it, a bush in it is left out. Scene px at the box's width.
 */
export interface GroundForm { gullies: Gully[]; terraces: Path[]; scrub: Dot[] }

export function groundForm(world: WorldState, box: SceneBox, name: 'near' | 'far', clear: readonly Box[]): GroundForm {
  const land = world.terrain.land[name]
  const sx = box.width / SCENE_W
  // The zones in reference px, with a margin.
  const zones = clear.map((b) => ({ x0: b.x / sx - 2, x1: (b.x + b.w) / sx + 2, y0: b.y - 2, y1: b.y + b.h + 2 }))
  const blocked = (x: number, y: number, r = 0) => y > box.landHeight - 0.5
    || zones.some((z) => x + r > z.x0 && x - r < z.x1 && y + r > z.y0 && y - r < z.y1)
  const scale = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [x * sx, y])

  const gullies = land.gullies.flatMap((gully): Gully[] => {
    const kept: Pt[] = []
    for (const p of gully.points) {
      if (blocked(p[0], p[1], 1)) break
      kept.push(p)
    }
    return kept.length >= 2 && kept.at(-1)![1] - kept[0][1] >= 2.5 ? [{ ...gully, points: scale(kept) }] : []
  })
  const terraces = land.terraces.flatMap((run) => {
    const pieces: Pt[][] = [[]]
    for (const p of run) {
      if (blocked(p[0], p[1], 1)) pieces.push([])
      else pieces.at(-1)!.push(p)
    }
    return pieces.filter((piece) => piece.length >= 2).map(scale)
  })
  const scrub = land.scrub.filter((d) => !blocked(d.x, d.y, d.r + 0.5)).map((d) => ({ ...d, x: d.x * sx }))
  return { gullies, terraces, scrub }
}
