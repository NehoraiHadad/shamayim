import type { Facts } from './input'
import { CREDITS } from './tiles'

/** What a build must not change without a person saying so in `source.json`. */
export interface Counts {
  buildings: number
  kept: number
  osm: number
  microsoft: number
  groups: number
  places: number
  houses: number
  tiles: number
}
export interface Pin { release: string; box: number[]; minAreaM2: number; tolerance: number; expected: Counts | null }

export const TILE_LIMIT = 64 * 1024
export const TOTAL_LIMIT = 2_000_000

/** Everything wrong with a build, in words; none when it may be taken. */
export function faultsOf(counts: Counts, facts: Facts, pin: Pin): string[] {
  const faults: string[] = []
  const others = Object.keys(facts.keptDatasets).filter(name => !CREDITS[name])
  if (others.length) faults.push(`footprints of unknown datasets, whose licences are not known: ${others.join(', ')}`)
  if (facts.partSources) faults.push(`${facts.partSources} footprints whose first source is of a part, not of the whole`)
  if (!pin.expected) return [...faults, `no expected counts in source.json; measured: ${JSON.stringify(counts)}`]
  for (const name of Object.keys(counts) as (keyof Counts)[]) {
    const was = pin.expected[name], now = counts[name]
    const change = Math.abs(now - was) / Math.max(1, was)
    if (!(change <= pin.tolerance)) faults.push(`${name}: ${now}, expected ${was} (${(change * 100).toFixed(1)} %)`)
  }
  return faults
}

/** Place points the committed tiles serve and the new ones do not: a whole-country count can hide a few lost villages. */
export function lostPlaces(before: ReadonlySet<string>, after: ReadonlySet<string>, tolerance: number): string[] {
  const lost = [...before].filter(place => !after.has(place))
  return lost.length > before.size * tolerance ? [`${lost.length} of ${before.size} places lost their footprints: ${lost.slice(0, 20).join(' ')}`] : []
}

/** Files too large to be one small fetch, or too large together. */
export function sizeFaults(sizes: ReadonlyMap<string, number>): string[] {
  const large = [...sizes].filter(([, bytes]) => bytes > TILE_LIMIT).map(([key, bytes]) => `${key}: ${bytes} bytes, over ${TILE_LIMIT}`)
  const total = [...sizes.values()].reduce((sum, bytes) => sum + bytes, 0)
  return total > TOTAL_LIMIT ? [...large, `all tiles: ${total} bytes, over ${TOTAL_LIMIT}`] : large
}
