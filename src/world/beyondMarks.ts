import { SKYLINE_TO_KM } from '../data/city/outsideView'
import { isLandmark } from '../data/landmarks/fame'
import { markAppearance } from '../data/landmarks/placeMarks'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import { BEYOND_MIN_PX, type SeatMark } from './beyondSeat'
import { glyphAtHeight, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, type Point } from './layout'
import type { WorldMark } from './types'

/** Buildings that belong to a town's fabric in the outside view. */
const SETTLEMENT_KINDS = new Set<Landmark['kind']>(['minaret', 'church', 'synagogue', 'highrise', 'homes'])
/** Metres: minimum height for a non-settlement structure beyond the place within skyline reach, named or not (C9). */
const NEAR_BEYOND_M = 20

export function nearBeyond(place: Coordinate, mark: Landmark): boolean {
  const { dx, dy } = offsetKm(place, mark)
  return Math.hypot(dx, dy) <= SKYLINE_TO_KM
}

/** Whether a beyond-place mark goes to town-block seating within skyline reach (decided by `BEYOND_MIN_PX`, not metres). */
export function isBeyondSettlement(place: Coordinate, mark: Landmark): boolean {
  return mark.source !== 'curated' && SETTLEMENT_KINDS.has(mark.kind) && nearBeyond(place, mark)
}

/** Beyond the place within skyline reach: settlement kinds go to seating before the metre gate; other kinds need `NEAR_BEYOND_M`. */
export function nearBeyondKept(place: Coordinate, mark: Landmark): boolean {
  return isBeyondSettlement(place, mark) || (mark.heightM >= NEAR_BEYOND_M && nearBeyond(place, mark))
}

export function beyondMarks(place: Coordinate, marks: Landmark[], width: number, seatMark: SeatMark,
  dot: Point, notes: readonly NoteBox[]) {
  const other: Landmark[] = []
  const seated: WorldMark[] = []
  const dotBox = boxAround(dot.x, dot.y, DOT_R)
  for (const mark of marks) {
    if (!isBeyondSettlement(place, mark)) {
      other.push(mark)
      continue
    }
    const seat = seatMark(mark)
    const glyphKind = glyphOf(mark)
    if (!seat || !glyphKind || seat.hPx < BEYOND_MIN_PX) continue
    const { h, scale, w } = glyphAtHeight(glyphKind, seat.hPx)
    const box = { left: seat.x - w / 2, right: seat.x + w / 2, top: seat.base - h * scale, bottom: seat.base }
    if (overlaps(box, dotBox) || notes.some((note) => overlaps(box, note))) continue
    const named = isLandmark(mark)
    seated.push({ ...seat, ...markAppearance(mark), id: mark.id, kind: mark.kind, glyphKind, named, landmark: named,
      xPct: seat.x / width * 100, baseY: seat.base, h, w, scale,
      dy: offsetKm(place, mark).dy, layer: 'near', plane: 'near' })
  }
  return { other, seated }
}
