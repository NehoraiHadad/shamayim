import { SKYLINE_TO_KM } from '../data/city/outsideView'
import { isLandmark } from '../data/landmarks/fame'
import { markAppearance } from '../data/landmarks/placeMarks'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import { KIND_REPEAT_PENALTY, nearLimit, score } from '../data/landmarks/rank'
import { isSettlementMark } from '../data/landmarks/settlement'
import type { Landmark } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import { BEYOND_MIN_PX, type SeatMark } from './beyondSeat'
import { glyphAtHeight, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, type Box, type Point } from './layout'
import type { WorldMark } from './types'

/** Metres: minimum height for a non-settlement structure beyond the place within skyline reach, named or not (C9). */
const NEAR_BEYOND_M = 20
/** Max seated beyond marks per settlement kind, matching the minaret cap in `rank.ts` symmetrically across kinds. */
const BEYOND_KIND_CAP = 2
/** Minimum clearance (px) between two seated beyond glyph boxes so adjacent marks stay visually legible. */
const SEAT_GAP_PX = 1

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

interface SeatedCandidate { mark: WorldMark; box: Box; rank: number }

/** Apply the near-layer display budget, per-kind cap, variety penalty and box clearance to viable seated marks only. */
function budgetSeated(viable: SeatedCandidate[], width: number): WorldMark[] {
  const limit = nearLimit(width)
  const pool = [...viable]
  const chosen: SeatedCandidate[] = []
  const counts = new Map<Landmark['kind'], number>()
  const value = (item: SeatedCandidate) => item.rank - KIND_REPEAT_PENALTY * (counts.get(item.mark.kind) ?? 0)
  while (chosen.length < limit && pool.length) {
    pool.sort((a, b) => value(b) - value(a))
    const next = pool.shift()!
    const count = counts.get(next.mark.kind) ?? 0
    if (count >= BEYOND_KIND_CAP) continue
    if (chosen.some((other) => overlaps(next.box, other.box, SEAT_GAP_PX))) continue
    chosen.push(next)
    counts.set(next.mark.kind, count + 1)
  }
  return chosen.map(({ mark }) => mark)
}

export function beyondMarks(place: Coordinate, marks: Landmark[], width: number, seatMark: SeatMark | null,
  dot: Point, notes: readonly NoteBox[]) {
  const other: Landmark[] = []
  const viable: SeatedCandidate[] = []
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
    const box = { left: seat.x - w / 2, right: seat.x + w / 2, top: seat.base - h * scale, bottom: seat.base }
    if (overlaps(box, dotBox) || notes.some((note) => overlaps(box, note))) continue
    const { dx, dy } = offsetKm(place, mark)
    const named = isLandmark(mark)
    const worldMark: WorldMark = { ...markAppearance(mark), id: mark.id, kind: mark.kind, glyphKind, named, landmark: named,
      x: seat.x, xPct: seat.x / width * 100, base: seat.base, baseY: seat.base, hPx: seat.hPx, h, w, scale,
      km: seat.km, seatBlockId: seat.blockId, dy, layer: 'near', plane: 'near' }
    viable.push({ mark: worldMark, box, rank: score(mark, Math.hypot(dx, dy), 0, SKYLINE_TO_KM) })
  }
  return { other, seated: budgetSeated(viable, width) }
}
