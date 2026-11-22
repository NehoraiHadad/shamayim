import { SKYLINE_TO_KM } from '../data/city/outsideView'
import { isLandmark } from '../data/landmarks/fame'
import { markAppearance } from '../data/landmarks/placeMarks'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import { score } from '../data/landmarks/rank'
import { isSettlementMark } from '../data/landmarks/settlement'
import type { Landmark } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import { BEYOND_MIN_PX, type SeatMark } from './beyondSeat'
import { glyphAtHeight, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, type Box, type Point } from './layout'
import { markBox, type SeatedWorldMark } from './markGeometry'
import { budgetSeated } from './seatBudget'

/** Metres: minimum height for a non-settlement structure beyond the place within skyline reach, named or not (C9). */
const NEAR_BEYOND_M = 20

export function nearBeyond(place: Coordinate, mark: Landmark): boolean {
  const { dx, dy } = offsetKm(place, mark)
  return Math.hypot(dx, dy) <= SKYLINE_TO_KM
}

/** Whether a beyond-place mark goes to town-block seating within skyline reach (decided by `BEYOND_MIN_PX`, not metres). */
export function isBeyondSettlement(place: Coordinate, mark: Landmark): boolean {
  return isSettlementMark(mark) && nearBeyond(place, mark)
}

/** Beyond the place within skyline reach: settlement kinds go to seating before the metre gate; other kinds need `NEAR_BEYOND_M`. */
export function nearBeyondKept(place: Coordinate, mark: Landmark): boolean {
  return isBeyondSettlement(place, mark) || (mark.heightM >= NEAR_BEYOND_M && nearBeyond(place, mark))
}

/** Budget seats for world layout and carry every viable seat to the scene model for its final cull. */
export function beyondMarks(place: Coordinate, marks: Landmark[], width: number, seatMark: SeatMark | null,
  dot: Point, notes: readonly NoteBox[]) {
  const other: Landmark[] = []
  const viable: { mark: SeatedWorldMark; bounds: Box }[] = []
  const dotBox = boxAround(dot.x, dot.y, DOT_R)
  for (const mark of marks) {
    if (!isBeyondSettlement(place, mark)) {
      other.push(mark)
      continue
    }
    const seat = seatMark?.(mark)
    const glyphKind = glyphOf(mark)
    if (!seat || !glyphKind || seat.hPx < BEYOND_MIN_PX) continue
    const { h, scale, w } = glyphAtHeight(glyphKind, seat.hPx)
    if (seat.x - w / 2 < 0 || seat.x + w / 2 > width) continue
    const { dx, dy } = offsetKm(place, mark)
    const named = isLandmark(mark)
    const worldMark: SeatedWorldMark = { ...markAppearance(mark), id: mark.id, kind: mark.kind, glyphKind, named, landmark: named,
      x: seat.x, xPct: seat.x / width * 100, base: seat.base, baseY: seat.base, hPx: seat.hPx, h, w, scale,
      km: seat.km, seatBlockId: seat.blockId, seatRank: score(mark, Math.hypot(dx, dy), 0, SKYLINE_TO_KM),
      dy, layer: 'near', plane: 'near' }
    const box = markBox(worldMark)
    if (overlaps(box, dotBox) || notes.some((note) => overlaps(box, note))) continue
    viable.push({ mark: worldMark, bounds: box })
  }
  viable.sort((a, b) => b.mark.seatRank - a.mark.seatRank)
  return { other, seated: budgetSeated(viable).map(({ mark }) => mark), seatPool: viable.map(({ mark }) => mark) }
}
