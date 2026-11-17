import type { PlacedMark } from '../../../data/landmarks/types'
import { BUILDINGS, FIELD_KINDS } from './generic/buildingSpecs'

const LOW = new Set(['orchard', 'vineyard', 'solar', 'castle'])
const CURATED = /^(jerusalem|tel-aviv|haifa|shadmot)-/

/** A curated city landmark (src/data/landmarks/curated.ts): always drawn, even on a steep slope (it is the place). */
export function curated(mark: PlacedMark) { return CURATED.test(mark.glyph) }

/** The px-space spec for a mark's glyph (generic marks use their kind as glyph), if it has one. */
export function specOf(mark: PlacedMark) { return BUILDINGS[mark.glyph] }

export function isField(mark: PlacedMark) {
  return FIELD_KINDS.has(mark.kind) && (mark.glyph === mark.kind || curated(mark))
}

export function isHillMark(mark: PlacedMark) {
  return mark.layer === 'near' && (isField(mark) || Boolean(specOf(mark)))
}

/**
 * R1 planes. Curated landmarks are the city's own skyline: they stay on the line unless tall and well behind it
 * (Chords Bridge, Reading), and never move down the face.
 */
export function planeOf(mark: PlacedMark): 'behind' | 'line' | 'face' {
  if (isField(mark) || FIELD_KINDS.has(mark.kind)) return 'face'
  if (curated(mark)) return mark.dy > 1.5 && mark.hPx >= 20 ? 'behind' : 'line'
  if (mark.dy < -.3) return 'face'
  return mark.dy > .3 && !LOW.has(mark.kind) ? 'behind' : 'line'
}
