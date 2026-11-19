import type { Place } from '../../config/place'
import { bearingOf, distanceOf, offsetKm, toX } from './project'
import { score } from './rank'
import type { Landmark } from './types'

const FAR_KINDS = ['chimney', 'cooling', 'turbine']

/**
 * Keep the panorama pool independent of the longitude strip, including its local skyline reserve. `around`: in every
 * direction (a turning view), twice as many.
 */
export function panoramaShortlist(place: Place, marks: Landmark[], around = false) {
  const ordered = marks.flatMap(mark => {
    const bearing = around ? { km: distanceOf(place, mark) } : bearingOf(place, mark)
    if (!bearing || bearing.km > 30) return []
    const far = bearing.km > 5
    if (far && mark.heightM < 60 && !FAR_KINDS.includes(mark.kind)) return []
    return [{ mark, value: score(mark, bearing.km, 0, far ? 3 : 1.5) }]
  }).sort((a, b) => b.value - a.value)
  const limit = around ? 16 : 8
  const selected = ordered.slice(0, limit)
  const skyline = ordered.find(({ mark }) => {
    if (mark.kind !== 'highrise') return false
    const { dx, dy } = offsetKm(place, mark)
    return Math.hypot(dx, dy) <= 1
  })
  if (skyline && !selected.includes(skyline)) selected.splice(limit - 1, 1, skyline)
  return selected.map(({ mark }) => mark)
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
