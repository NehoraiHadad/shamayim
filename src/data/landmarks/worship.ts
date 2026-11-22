import type { MarkKind } from './types'

/** Metres: a prayer hall of roughly three 3 m storeys, the former synagogue default applied to untagged worship halls. */
export const HALL_M = 9
/** Metres: default height for any worship tower with tower evidence (`tower:type=minaret`, `building=minaret`, or `man_made=tower`) and no height tag; the existing minaret default. */
export const TOWER_M = 30
/** Metres: default height for a church or cathedral with tower evidence (`man_made=tower`) and no height tag; the existing church default. */
export const BELL_TOWER_M = 25
/** Metres: the flat defaults the pre-evidence Israel landmarks build wrote onto every untagged minaret and church row. */
export const LEGACY_DEFAULTS: Partial<Record<MarkKind, number>> = { minaret: TOWER_M, church: BELL_TOWER_M }

/** Metres per OSM `building:levels` storey, the existing Overpass classifier conversion. */
const LEVEL_M = 3.2

export function taggedHeight(tags: Record<string, string>): number | undefined {
  const height = Number.parseFloat(tags.height ?? '')
  return Number.isFinite(height) ? height : undefined
}

export function levelHeight(tags: Record<string, string>): number | undefined {
  const height = Number.parseFloat(tags['building:levels'] ?? '') * LEVEL_M
  return Number.isFinite(height) ? height : undefined
}

export function worshipHeight(tags: Record<string, string>, towerTagged: boolean, towerM = TOWER_M): number {
  return taggedHeight(tags) ?? levelHeight(tags) ?? (towerTagged ? towerM : HALL_M)
}

