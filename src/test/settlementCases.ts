import type { Place } from '../config/place'
import { hashId } from '../data/landmarks/hash'
import type { BundledEntry } from './bundledWorld'
import { buildGlobalCityClusters } from './bundledCityClusters'
import phase1 from './fixtures/worship-ownership-phase1.json'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from './scenePlaces'

/** Fixed sample seed keeps the extra geographic coverage reproducible across machines and CI. */
const SAMPLE_SEED = 'worship-ownership-round2'
/** Eight additional home clusters supplement all 91 phase-1 problem places and all 18 recorded panoramas. */
const SAMPLE_COUNT = 8
const KINDS = ['city', 'town', 'village', 'hamlet'] as const

export const recordedSettlementCases = () =>
  [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...DATUM_PLACES]
    .map(place => ({ place, source: 'scenePlaces' as const }))

const cached = new Map<string, BundledEntry[]>()
export function settlementCases(root: string): BundledEntry[] {
  const prior = cached.get(root)
  if (prior) return prior
  const { namedClusters } = buildGlobalCityClusters(root)
  const nodeAt = new Map(namedClusters.map(({ node }) => [`${node[0]},${node[1]}`, node]))
  const recorded = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...DATUM_PLACES]
  if (recorded.length !== 18) throw new Error('Recorded fixture set changed')
  const entries = new Map<string, BundledEntry>(recorded.map(place => [place.id, { place, source: 'scenePlaces' }]))
  for (const given of phase1.places) {
    const node = nodeAt.get(`${given.lat},${given.lon}`)
    if (!node) throw new Error(`Missing bundled settlement ${given.id}`)
    const kind = node![2]
    const place: Place = { ...given, featureCode: kind === 0 ? 'PPLA' : 'PPL', settlementType: KINDS[kind] }
    entries.set(place.id, { place, source: 'cityCluster' })
  }
  const extra = namedClusters.filter(({ node }) => ![...entries.values()].some(({ place }) => place.lat === node[0] &&
    place.lon === node[1]))
    .sort((a, b) =>
      hashId(`${SAMPLE_SEED}:${a.node[0]},${a.node[1]}`) - hashId(`${SAMPLE_SEED}:${b.node[0]},${b.node[1]}`))
    .slice(0, SAMPLE_COUNT)
  for (const { node: [lat, lon, kind, , , nameHe] } of extra) {
    const place: Place = { id: `sample-${lat}-${lon}`, lat, lon, nameHe, regionHe: '', timezone: 'Asia/Jerusalem',
      featureCode: kind === 0 ? 'PPLA' : 'PPL', settlementType: KINDS[kind] }
    entries.set(place.id, { place, source: 'cityCluster' })
  }
  const result = [...entries.values()]
  if (result.length !== 117) throw new Error(`Expected 117 settlements, got ${result.length}`)
  cached.set(root, result)
  return result
}

/** Six recorded or fifteen flat cases per group keep even the reported 80.81 s whole run below a group timeout. */
export function settlementCaseGroups(root: string) {
  const entries = settlementCases(root)
  const groups: { name: string; entries: BundledEntry[] }[] = []
  for (const [name, source, count] of [['recorded', 'scenePlaces', 6], ['flat', 'cityCluster', 15]] as const) {
    const selected = entries.filter(entry => entry.source === source)
    for (let i = 0; i < selected.length; i += count) groups.push({ name: `${name}-${i / count + 1}`, entries:
      selected.slice(i, i + count) })
  }
  return groups
}
