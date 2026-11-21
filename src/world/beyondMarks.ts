import { SKYLINE_TO_KM } from '../data/city/outsideView'
import { isLandmark } from '../data/landmarks/fame'
import { markAppearance } from '../data/landmarks/placeMarks'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import { BEYOND_MIN_PX, type SeatMark } from './beyondSeat'
import { GLYPH_SPECS, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, type Point } from './layout'
import type { WorldMark } from './types'

/** Buildings that belong to a town's fabric in the outside view. */
const SETTLEMENT_KINDS = new Set<Landmark['kind']>(['minaret', 'church', 'synagogue', 'highrise', 'homes'])

export function nearBeyond(place: Coordinate, mark: Landmark): boolean {
  const { dx, dy } = offsetKm(place, mark)
  return Math.hypot(dx, dy) <= SKYLINE_TO_KM
}

export function beyondMarks(place: Coordinate, marks: Landmark[], width: number, seatMark: SeatMark,
  dot: Point, notes: readonly NoteBox[]) {
  const other: Landmark[] = []
  const seated: WorldMark[] = []
  const dotBox = boxAround(dot.x, dot.y, DOT_R)
  for (const mark of marks) {
    if (mark.source === 'curated' || !SETTLEMENT_KINDS.has(mark.kind) || !nearBeyond(place, mark)) {
      other.push(mark)
      continue
    }
    const seat = seatMark(mark)
    const glyphKind = glyphOf(mark)
    if (!seat || !glyphKind || seat.hPx < BEYOND_MIN_PX) continue
    const spec = GLYPH_SPECS[glyphKind]
    const h = spec.h(seat.hPx)
    const scale = seat.hPx / h
    const w = spec.w * scale
    const box = { left: seat.x - w / 2, right: seat.x + w / 2, top: seat.base - h * scale, bottom: seat.base }
    if (overlaps(box, dotBox) || notes.some((note) => overlaps(box, note))) continue
    const named = isLandmark(mark)
    seated.push({ ...seat, ...markAppearance(mark), id: mark.id, kind: mark.kind, glyphKind, named, landmark: named,
      xPct: seat.x / width * 100, baseY: seat.base, h, w, scale,
      dy: offsetKm(place, mark).dy, layer: 'near', plane: 'near' })
  }
  return { other, seated }
}
