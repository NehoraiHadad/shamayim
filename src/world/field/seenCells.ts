import type { WeightedSighting } from '../../domain/cloudSightings'
import { hashId } from '../../data/landmarks/hash'
import { dimensions } from './dimensions'
import type { FieldCell, FieldLayer } from './types'

/*
 * The single clouds the satellite sees near the place (`sightingsNow`), as cells of the field's low layer: each where its
 * patch is (azimuth and ground distance from the place), as wide as the patch across the line of sight, with the
 * layer's own base and form, and as present as the sighting is fresh. The mask says "a cloud about there, about this
 * big", never its shape or height: the shape comes from the layer, as for every other cell. Pure.
 */

const DEG = Math.PI / 180

export function seenCells(list: readonly WeightedSighting[], layer: FieldLayer | undefined): FieldCell[] {
  if (!layer || !list.length) return []
  const genus = layer.form.conv >= layer.form.strat ? 'cu' : 'sc'
  return list.filter((s) => s.strength > 0.01).map((s, i) => {
    const r = Math.max(0.5, s.widthKm / 2)
    const { baseKm, vKm, kappa } = dimensions(genus, layer.lowBaseKm ?? layer.baseKm, layer.form, 0.5, 2 * r)
    const key = `seen:${s.id ?? i}:${s.azimuth.toFixed(1)}:${s.distanceKm.toFixed(1)}`
    return {
      id: key, lattice: 'low', x: s.distanceKm * Math.sin(s.azimuth * DEG), y: s.distanceKm * Math.cos(s.azimuth * DEG),
      r, baseKm, vKm, tau0: kappa * vKm, rainWeight: 0, share: Math.min(1, s.strength), seed: hashId(key), genus, rank: 0,
    }
  })
}
