import type { Place } from '../../config/place'
import { offsetKm, toX } from './project'
import { score } from './rank'
import type { Landmark } from './types'

export function shortlist(place: Place, marks: Landmark[]) {
  const ranked = marks.flatMap((mark) => {
    if (mark.kind === 'highrise' && mark.heightM > 260 && !mark.nameHe) return []
    const { dx, dy } = offsetKm(place, mark)
    const layer = toX(dx)?.layer
    if (!layer) return []
    const band = mark.kind === 'highrise' ? 3 : layer === 'near' ? 1.5 : 3
    if (Math.abs(dy) > band || (layer === 'far' && mark.heightM < 60
      && !['chimney', 'cooling', 'turbine'].includes(mark.kind))) return []
    return [{ mark, value: score(mark, dx, dy, band) }]
  }).sort((a, b) => b.value - a.value)
  const take = (highrise: boolean, limit: number) => ranked
    .filter(({ mark }) => (mark.kind === 'highrise') === highrise).slice(0, limit).map(({ mark }) => mark)
  return [...take(false, 8), ...take(true, 12)]
}
