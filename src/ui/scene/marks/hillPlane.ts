import type { PlacedMark } from '../../../data/landmarks/types'
import { BUILDINGS, FIELD_KINDS } from './generic/buildingSpecs'

const LOW = new Set(['orchard', 'vineyard', 'solar', 'castle'])

export function isHillMark(mark: PlacedMark) {
  return mark.layer === 'near' && mark.glyph === mark.kind && (FIELD_KINDS.has(mark.kind) || Boolean(BUILDINGS[mark.kind]))
}

export function planeOf(mark: PlacedMark): 'behind' | 'line' | 'face' {
  if (FIELD_KINDS.has(mark.kind) || mark.dy < -.3) return 'face'
  return mark.dy > .3 && !LOW.has(mark.kind) ? 'behind' : 'line'
}
