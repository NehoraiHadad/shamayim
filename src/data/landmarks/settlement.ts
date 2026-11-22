import type { Place } from '../../config/place'
import type { Landmark, MarkKind } from './types'

/** Building kinds that belong to a town's fabric and seat on drawn town blocks beyond the place. */
export const SETTLEMENT_KINDS = new Set<MarkKind>(['minaret', 'church', 'synagogue', 'highrise', 'homes'])

/** Whether a mark is a non-curated settlement-fabric building eligible for town-block seating beyond the place. */
export function isSettlementMark(mark: Landmark): boolean {
  return mark.source !== 'curated' && SETTLEMENT_KINDS.has(mark.kind)
}

/** The place's house style and size: what its roofs and blocks are like before (and beside) any data on them. */
export type SettlementStyle = 'tile' | 'flat-hill' | 'flat-desert' | 'blocks'
export type SettlementSize = 'small' | 'medium' | 'large'

/**
 * How far a house's ground may rise above / fall below the dot (px): houses spread along the contour near the crest
 * instead of running down a steep face in a staircase. Desert towns stay on the plateau rim.
 */
const REACH: Record<SettlementStyle, { up: number; down: number }> = { tile: { up: 14, down: 12 },
  'flat-hill': { up: 14, down: 12 }, 'flat-desert': { up: 5, down: 5 }, blocks: { up: 40, down: 24 } }

export const desertSettlement = (place: Place) => place.lat < 31.25 || /נגב|ערבה|ים המלח/.test(place.regionHe)
export function settlementReach(style: SettlementStyle) { return REACH[style] }

/** The place's roofs before any data: desert flat, a city blocks, else red tiles (drawn mixed where nothing is known). */
export function settlementStyle(place: Place, size: SettlementSize): SettlementStyle {
  if (desertSettlement(place)) return 'flat-desert'
  /** A city (Umm al-Fahm, Tiberias) is concrete and stone blocks even under 50 000 people. */
  if (size === 'large' || place.settlementType === 'city') return 'blocks'
  return 'tile'
}
