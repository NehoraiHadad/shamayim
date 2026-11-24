import { isDrawableMark } from '../data/landmarks/drawableMark'

/** Product settings live here; sizing and every pre-selection path import the same values. */
export const LEGIBLE_PX = 4
export const MAX_EXAGGERATION = 2
export const NEIGHBOUR_MIN_TRUE_PX = LEGIBLE_PX / MAX_EXAGGERATION
export type NeighbourRule = 'hidden' | 'landmark' | 'ordinary'

/** Owner: “מסגדים לא, ציונים כן”. The mosque veto wins even over curated/famous status. */
export function neighbourRule(kind: string, famous: boolean): NeighbourRule {
  const name = kind.replace(/[-_\s]/g, '').toLowerCase()
  if (!isDrawableMark({ kind: name })) return 'hidden'
  const worship = ['church', 'synagogue', 'shrine', 'temple', 'chapel', 'cathedral', 'westernwall', 'babshrine']
  if (worship.includes(name) && !famous) return 'hidden'
  return famous ? 'landmark' : 'ordinary'
}

export function viableNeighbourHeight(rule: NeighbourRule, trueHeightPx: number) {
  return rule !== 'hidden' && trueHeightPx > 0 && (rule === 'landmark' || trueHeightPx >= NEIGHBOUR_MIN_TRUE_PX)
}

export const viableNeighbour = (kind: string, famous: boolean, trueHeightPx: number) =>
  viableNeighbourHeight(neighbourRule(kind, famous), trueHeightPx)
