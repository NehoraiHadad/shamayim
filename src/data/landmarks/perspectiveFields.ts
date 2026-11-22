import type { Candidate } from './types'

/** Transport the viewing evidence without leaking ranking fields into the drawn-world descriptions. */
export function perspectiveFields(item: Candidate) {
  if (item.sightKm === undefined) return {}
  return { sightKm: item.sightKm, km: item.km, heightM: item.mark.heightM,
    supportBlockId: item.supportBlockId, townFootprint: item.townFootprint,
    farCellId: item.farCellId, crestPx: item.crestPx, sourceGroundY: item.sourceGroundY }
}
