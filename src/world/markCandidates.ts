import type { Place } from '../config/place'
import { inSkylineReach, isOwnSpot, sameTower } from '../data/city/outsideView'
import type { CityTower } from '../data/city/types'
import { industrialNamed, landmarkBeyond } from '../data/landmarks/industrial'
import { isGenericHighrise } from '../data/landmarks/placeMarks'
import { PORTRAIT_MARGIN_KM } from '../data/landmarks/portrait'
import { distanceOf, offsetKm } from '../data/landmarks/project'
import { isSettlementMark } from '../data/landmarks/settlement'
import type { Landmark } from '../data/landmarks/types'
import { isBeyondSettlement, nearBeyondKept } from './beyondMarks'
import type { MarksInput } from './marks'

/**
 * An unnamed mark keeps its kind without fame (owner, 2026-11-19). `industrialNamed` validates industrial names.
 * The place's own houses and the hand-drawn icons are named by definition.
 */
function namedOnly(landmarks: readonly Landmark[]): Landmark[] {
  return landmarks.map((given) => {
    const mark = industrialNamed(given)
    return mark.source === 'place' || mark.source === 'curated' || mark.nameHe || !mark.fame ? mark : { ...mark, fame: undefined }
  })
}

/** Strict ownership for settlement marks with a raster. Otherwise use the portrait's 1 km fallback margin. */
function ofPlace(place: Place, mark: Landmark, reachKm: number, outside: MarksInput['outside']) {
  const { dx, dy } = offsetKm(place, mark)
  if (!outside) return Math.hypot(dx, dy) <= reachKm + PORTRAIT_MARGIN_KM
  return isOwnSpot(outside.frame, outside.lie, dx, dy, outside.seatMark && isSettlementMark(mark) ? 0 : PORTRAIT_MARGIN_KM)
}

/** Leave generic OSM high-rises represented by the place's raster towers to the outside view (C5). */
function rasterReplaced(place: Place, landmarks: readonly Landmark[], towers: readonly CityTower[] | null) {
  if (!towers?.length) return new Set<string>()
  return new Set(landmarks.filter((mark) => mark.source === 'osm' && isGenericHighrise(mark.kind, mark.glyph)
    && inSkylineReach(distanceOf(place, mark)) && towers.some((tower) => sameTower(mark, tower))).map((mark) => mark.id))
}

/** Prepare the shortlist for placement and carry extra candidates solely to beyond-town seating. */
export function markCandidates({ place, landmarks, seatCandidates, outside, reachKm, rasterTowers }: MarksInput) {
  const isOwn = (mark: Landmark) => ofPlace(place, mark, reachKm, outside)
  const prepare = (source: readonly Landmark[], keep: (mark: Landmark) => boolean) => {
    const named = namedOnly(source).filter(keep)
    const replaced = rasterReplaced(place, named, rasterTowers)
    return named.filter((mark) => !replaced.has(mark.id))
  }
  const kept = prepare(landmarks, (mark) => isOwn(mark) || landmarkBeyond(mark) || (outside !== null && nearBeyondKept(place, mark)))
  if (!outside) return { own: kept, beyond: [] }

  const own = kept.filter(isOwn)
  const seen = new Set(landmarks.map((mark) => mark.id))
  const carried = prepare(seatCandidates ?? [], (mark) => {
    if (seen.has(mark.id)) return false
    seen.add(mark.id)
    return !isOwn(mark) && isBeyondSettlement(place, mark)
  })
  return { own, beyond: [...kept.filter((mark) => !own.includes(mark)), ...carried] }
}
