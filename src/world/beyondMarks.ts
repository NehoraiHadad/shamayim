import { SKYLINE_TO_KM } from '../data/city/outsideView'
import { isLandmark } from '../data/landmarks/fame'
import { markAppearance } from '../data/landmarks/placeMarks'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import { score } from '../data/landmarks/rank'
import { isSettlementMark } from '../data/landmarks/settlement'
import type { Landmark, MarkPerspective } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import { neighbourRule, viableNeighbour } from './neighbourPolicy'
import type { SeatMark } from './beyondSeat'
import { glyphAtHeight, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, type Box, type Point } from './layout'
import { markBox, type SeatedWorldMark } from './markGeometry'
import { budgetSeated } from './seatBudget'

export function nearBeyond(place: Coordinate, mark: Landmark): boolean {
  const { dx, dy } = offsetKm(place, mark)
  return Math.hypot(dx, dy) <= SKYLINE_TO_KM
}

/** Whether a beyond-place mark goes to town-block seating within skyline reach. */
export function isBeyondSettlement(place: Coordinate, mark: Landmark): boolean {
  return isSettlementMark(mark) && nearBeyond(place, mark)
}

/** Within skyline reach, physical legibility replaces a kind-specific metre gate. */
export function nearBeyondKept(place: Coordinate, mark: Landmark): boolean {
  return nearBeyond(place, mark)
}

/** Budget seats for world layout and carry every viable seat to the scene model for its final cull. */
export function beyondMarks(place: Coordinate, marks: Landmark[], width: number, seatMark: SeatMark | null,
  dot: Point, notes: readonly NoteBox[], townAt?: (mark: Landmark) => boolean, perspective?: MarkPerspective) {
  const other: Landmark[] = []
  const viable: { mark: SeatedWorldMark; bounds: Box }[] = []
  const dotBox = boxAround(dot.x, dot.y, DOT_R)
  for (const mark of marks) {
    const named = isLandmark(mark)
    if (neighbourRule(glyphOf(mark) ?? mark.kind, named) === 'hidden') continue
    if (!isBeyondSettlement(place, mark) && !townAt?.(mark)) {
      other.push(mark)
      continue
    }
    const seat = seatMark?.(mark)
    const glyphKind = glyphOf(mark)
    if (!seat) { other.push(mark); continue }
    if (!glyphKind || !viableNeighbour(glyphKind, named, seat.hPx)) continue
    const { h, scale, w } = glyphAtHeight(glyphKind, seat.hPx)
    if (seat.x - w / 2 < 0 || seat.x + w / 2 > width) continue
    const { dx, dy } = offsetKm(place, mark)
    const evidence = named ? perspective?.(mark, 'near', seat.base) : undefined
    const worldMark: SeatedWorldMark = { ...markAppearance(mark), id: mark.id, kind: mark.kind, glyphKind, named, landmark: named,
      ...evidence, bearingX: seat.x, heightM: mark.heightM, crestPx: seat.hPx, x: seat.x, xPct: seat.x / width * 100,
      base: seat.base, baseY: seat.base, hPx: seat.hPx, h, w, scale,
      km: seat.km, seatBlockId: seat.blockId, seatRank: score(mark, Math.hypot(dx, dy), 0, SKYLINE_TO_KM),
      dy, layer: 'near', plane: 'near' }
    const box = markBox(worldMark)
    if (overlaps(box, dotBox) || notes.some((note) => overlaps(box, note))) continue
    viable.push({ mark: worldMark, bounds: box })
  }
  viable.sort((a, b) => b.mark.seatRank - a.mark.seatRank)
  return { other, seated: budgetSeated(viable).map(({ mark }) => mark), seatPool: viable.map(({ mark }) => mark) }
}
