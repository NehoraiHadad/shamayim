//# allFunctionsCalledOnLoad
import type { WorldMark } from '../../world/markGeometry'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { NeighbourBlock } from './neighbourPlacement'
import type { LayerOf } from './types'

/** The far-city ground is rasterized in half-CSS-pixel rows; align a ground contact by at most one such row. */
const GROUND_ROW_PX = .5
/** Geometry comparisons use the existing micro-pixel tolerance. */
const CONTACT_EPS_PX = 1e-7

/** Union only final painted ground belonging to the source's connected town footprint. */
export function farTownSupports(world: WorldState, width: number, towns: LayerOf<'farCities'> | null,
  mark: WorldMark): NeighbourBlock[] {
  const owner = mark.farCellId === undefined ? undefined : world.farCities.footprints?.get(mark.farCellId)
  if (!owner || !towns) return []
  const ground = towns.tiers.flatMap(tier => tier.mass.flatMap(part => part.boxes))
    .filter(box => box.townId === owner.townId)
  const x = mark.x * width / SCENE_W, requested = mark.sourceGroundY ?? mark.base
  const contacts = [requested, ...ground.filter(box => box.x <= x && box.x + box.w >= x)
    .map(box => box.y + box.h).filter(y => Math.abs(y - requested) <= GROUND_ROW_PX)]
    .sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested))
  for (const foot of contacts) {
    const strips = ground.filter(box => box.y < foot && box.y + box.h >= foot - CONTACT_EPS_PX)
      .map(box => ({ left: box.x, right: box.x + box.w, top: box.y }))
      .sort((a, b) => a.left - b.left)
    const runs: typeof strips = []
    for (const strip of strips) {
      const last = runs.at(-1)
      if (last && strip.left <= last.right + CONTACT_EPS_PX) {
        last.right = Math.max(last.right, strip.right); last.top = Math.min(last.top, strip.top)
      } else runs.push({ ...strip })
    }
    if (runs.length) return runs.map(run => ({ id: `far-town:${owner.townId}`,
      x: (run.left + run.right) / 2, w: run.right - run.left, top: run.top, foot, hazeKm: mark.km }))
  }
  return []
}
