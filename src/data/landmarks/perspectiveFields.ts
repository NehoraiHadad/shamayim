import { glyphOf } from '../../world/glyphSpecs'
import { neighbourSize } from '../../world/neighbourSize'
import { markWidth } from './project'
import type { Candidate, Landmark } from './types'

/** Contest widths use the same famous icon bounds that the world and receiving layers will fit. */
export function perspectiveWidth(mark: Landmark, heightPx: number, famous: boolean) {
  const kind = glyphOf(mark)
  const icon = famous && kind ? neighbourSize(kind, heightPx, true) : null
  return icon?.w ?? markWidth(mark.kind, mark.glyph, heightPx)
}

/** Transport the viewing evidence without leaking ranking fields into the drawn-world descriptions. */
export function perspectiveFields(item: Candidate) {
  if (item.sightKm === undefined) return {}
  return { sightKm: item.sightKm, km: item.km, heightM: item.mark.heightM,
    supportBlockId: item.supportBlockId, townFootprint: item.townFootprint,
    farCellId: item.farCellId, crestPx: item.crestPx, sourceGroundY: item.sourceGroundY,
    sourceTopY: item.sourceTopY, bearingX: item.bearingX }
}
