//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { faceAtY, localFootY } from './faceProjection'
import { groundBlocker, groundClearKey } from './groundClear'
import { COVER_WATER } from './landPalette'
import { planeGeomOf } from './planeGeometry'
import type { Box, Gully, Path, Pt, SceneBox } from './types'
import { sampleCoverAtKm } from './vegSample'

/**
 * The terrain morphology of a plane in the box (the form canvas): gullies and stone terraces (`world/land.ts`, placed
 * from the terrain data), kept out of the text and dot zones (`clear`). Terraces are omitted on bare/desert and open-water
 * slopes (WorldCover 60 / 80) where soft geological strata replace agricultural terracing.
 * Memoised per `world.land` + form inputs so hour scrubs perform zero terrace projection or cover sampling.
 */
export interface GroundForm { gullies: Gully[]; terraces: Path[] }

const cache = new WeakMap<LivingLand, Map<string, GroundForm>>()

export function groundForm(world: WorldState, box: SceneBox, name: 'near' | 'far', clear: readonly Box[]): GroundForm {
  let byKey = cache.get(world.land)
  if (!byKey) cache.set(world.land, byKey = new Map())
  const plane = world.terrain[name]
  const geom = planeGeomOf(world, name, plane, box.landHeight)
  const key = `${name}:${geom.geomKey}:${box.width}:${box.landHeight}:${groundClearKey(clear)}`
  const hit = byKey.get(key)
  if (hit) return hit

  const land = world.terrain.land[name]
  const sx = box.width / SCENE_W
  const nRays = Math.max(1, world.land.rays.length - 1)
  const blocked = groundBlocker(box, clear)
  const scale = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [x * sx, y])

  const gullies = land.gullies.flatMap((gully): Gully[] => {
    const kept: Pt[] = []
    for (const p of gully.points) {
      if (blocked([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1])) break
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
    const cover = sampleCoverAtKm(world.land, (mid[0] / SCENE_W) * nRays, km)
    if (cover === 6 || cover === COVER_WATER) return []
    const pieces: Pt[][] = [[]]
    for (const p of run) {
      if (blocked([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1])) pieces.push([])
      else pieces.at(-1)!.push(p)
    }
    return pieces.filter((piece) => piece.length >= 2).map(scale)
  })
  const out: GroundForm = { gullies, terraces }
  if (byKey.size > 12) byKey.clear()
  byKey.set(key, out)
  return out
}
