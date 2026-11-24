import type { CityResult } from '../data/city/types'
import type { Landmark } from '../data/landmarks/types'
import type { WorldMark } from './markGeometry'
import type { WorldState } from './types'

/** A fifth built coverage is the local raster's existing town-fabric threshold. */
export const TOWN_BUILT_SHARE = .2

export function localTownAt(city: CityResult | null | undefined, mark: Landmark): boolean | undefined {
  const raster = city?.raster
  if (!raster || (raster.has && !raster.has(mark.lat, mark.lon))) return undefined
  const built = raster.at(mark.lat, mark.lon).built
  return raster.has || built > 0 ? built >= TOWN_BUILT_SHARE : undefined
}

/** Explicit source evidence that a glyph requires town support. */
export function requiresTown(mark: WorldMark): boolean | undefined {
  if (mark.seatBlockId !== undefined) return true
  if (['minaret', 'church', 'synagogue', 'homes', 'westernWall', 'babShrine'].includes(mark.glyphKind)) return true
  return mark.townFootprint
}

export function needsTown(world: WorldState, mark: WorldMark): boolean {
  const known = requiresTown(mark)
  if (known !== undefined) return known
  const footprint = mark.farCellId === undefined ? undefined : world.farCities.footprints?.get(mark.farCellId)
  return (footprint?.built ?? 0) >= TOWN_BUILT_SHARE
}
