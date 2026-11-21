//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { COVER_WATER } from './landPalette'
import type { Box, Gully, Path, Pt, SceneBox } from './types'
import { faceAtY, localFootY, sampleCellAtKm } from './vegSample'

/**
 * The terrain morphology of a plane in the box (the form canvas): gullies and stone terraces (`world/land.ts`, placed
 * from the terrain data), kept out of the text and dot zones (`clear`). Terraces are omitted on bare/desert and open-water
 * slopes (WorldCover 60 / 80) where soft geological strata replace agricultural terracing.
 */
export interface GroundForm { gullies: Gully[]; terraces: Path[] }

export function groundForm(world: WorldState, box: SceneBox, name: 'near' | 'far', clear: readonly Box[]): GroundForm {
  const land = world.terrain.land[name]
  const plane = world.terrain[name]
  const sx = box.width / SCENE_W
  const nRays = Math.max(1, world.land.rays.length - 1)
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
    if (!run.length) return []
    const mid = run[Math.floor(run.length / 2)]
    const cy = lineAt(plane.points, mid[0])
    const fy = localFootY(world, name, mid[0], cy, box.landHeight)
    const { km } = faceAtY(world, name, plane, mid[0], cy, fy, mid[1])
    const cover = sampleCellAtKm(world.land, (mid[0] / SCENE_W) * nRays, km).cover
    if (cover === 6 || cover === COVER_WATER) return []
    const pieces: Pt[][] = [[]]
    for (const p of run) {
      if (blocked(p[0], p[1], 1)) pieces.push([])
      else pieces.at(-1)!.push(p)
    }
    return pieces.filter((piece) => piece.length >= 2).map(scale)
  })
  return { gullies, terraces }
}
