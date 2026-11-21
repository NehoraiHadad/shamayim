import type { Place } from '../../config/place'
import { SKYLINE_TO_KM } from '../city/outsideView'
import { bearingOf, distanceOf, offsetKm, toX } from './project'
import { PORTRAIT_KINDS } from './markProjection'
import { industrialNamed, landmarkBeyond } from './industrial'
import { PORTRAIT_MARGIN_KM, PORTRAIT_MAX_KM } from './portrait'
import { score, type FarRule } from './rank'
import { isSettlementMark } from './settlement'
import type { Landmark } from './types'

const FAR_KINDS = ['chimney', 'cooling', 'turbine']

/**
 * Keep the panorama pool independent of the longitude strip, including its local skyline reserve. `around`: in every
 * direction (a turning view), twice as many. `farRule`: `kind` (the SVG scene's: beyond 5 km 60 m and up, or any chimney,
 * cooling tower or turbine, to 30 km) or `landmark` (the canvas scene's, CANVAS-SCENE-PLAN.md C5: beyond a portrait's
 * widest reach only landmarks, `landmarkBeyond`: a name and fame, or truly huge; an industrial name passes the
 * industrial rule first).
 */
export function panoramaShortlist(place: Place, marks: Landmark[], around = false, farRule: FarRule = 'kind') {
  const ordered = marks.flatMap(mark => {
    // Within a portrait's widest reach every direction counts (north too): the portrait shows a mark by its side.
    const km = distanceOf(place, mark)
    const bearing = around || km <= PORTRAIT_MAX_KM ? { km } : bearingOf(place, mark)
    if (!bearing || bearing.km > 30) return []
    const far = bearing.km > 5
    if (farRule === 'landmark') {
      if (km > PORTRAIT_MAX_KM + PORTRAIT_MARGIN_KM && !landmarkBeyond(industrialNamed(mark))) return []
    } else if (far && mark.heightM < 60 && !FAR_KINDS.includes(mark.kind)) return []
    return [{ mark, km, value: score(mark, bearing.km, 0, far ? 3 : 1.5) }]
  }).sort((a, b) => b.value - a.value)
  const limit = around ? 16 : 8
  const selected = ordered.slice(0, limit)
  const skyline = ordered.find(({ mark }) => {
    if (mark.kind !== 'highrise') return false
    const { dx, dy } = offsetKm(place, mark)
    return Math.hypot(dx, dy) <= 1
  })
  if (skyline && !selected.includes(skyline)) selected.splice(limit - 1, 1, skyline)
  // The portrait's own elements (groves, a solar field, a water tower...) would lose to taller marks: the best of each
  // kind within a portrait's widest reach is kept as well.
  const kinds = new Set<string>()
  const portrait = ordered.filter(({ mark, km }) => PORTRAIT_KINDS.has(mark.kind) && km <= PORTRAIT_MAX_KM
    && !selected.some(item => item.mark === mark) && !kinds.has(mark.kind) && kinds.add(mark.kind)).slice(0, 6)
  // A hand-drawn icon (`curated.ts`) in that reach is the place's own sign: always offered.
  const icons = ordered.filter(({ mark, km }) => mark.source === 'curated' && km <= PORTRAIT_MAX_KM
    && !selected.some(item => item.mark === mark))
  return [...selected, ...portrait, ...icons].map(({ mark }) => mark)
}

/**
 * Remaining settlement-kind marks within `SKYLINE_TO_KM` not already in `exclude`, carried separately to beyond-town
 * seating so unseatable tall marks cannot crowd a lower hall out of the shortlist without entering the own portrait contest.
 */
export function seatCandidates(place: Place, marks: Landmark[], exclude: readonly Landmark[] = []): Landmark[] {
  const kept = new Set(exclude.map((mark) => mark.id))
  return marks.filter((mark) => {
    if (!isSettlementMark(mark) || kept.has(mark.id)) return false
    const { dx, dy } = offsetKm(place, mark)
    return Math.hypot(dx, dy) <= SKYLINE_TO_KM
  })
}

export function shortlist(place: Place, marks: Landmark[]) {
  const ranked = marks.flatMap((mark) => {
    if (mark.kind === 'highrise' && mark.heightM > 260 && !mark.nameHe) return []
    const { dx, dy } = offsetKm(place, mark)
    const layer = toX(dx)?.layer
    if (!layer) return []
    const band = mark.kind === 'highrise' ? 3 : layer === 'near' ? 1.5 : 3
    if (Math.abs(dy) > band || (layer === 'far' && mark.heightM < 60
      && !FAR_KINDS.includes(mark.kind))) return []
    return [{ mark, value: score(mark, dx, dy, band) }]
  }).sort((a, b) => b.value - a.value)
  const take = (highrise: boolean, limit: number) => ranked
    .filter(({ mark }) => (mark.kind === 'highrise') === highrise).slice(0, limit).map(({ mark }) => mark)
  return [...take(false, 8), ...take(true, 12)]
}
