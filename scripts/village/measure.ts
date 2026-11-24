import { existsSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { COVER, decodeLand, landCellKey, LAND_N, LAND_STEP } from '../../src/data/land/grid'
import { cornerOf, extentOf, osmShareOf, spotsOf, type RawGroup, type RawHouse } from './input'
import { RULE } from './rule'

const BUILT = COVER.indexOf('built')
const quantile = (values: readonly number[], t: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * t)] ?? 0
const percent = (part: number, whole: number) => whole ? Math.round(part / whole * 1000) / 10 : 0

/** Whether a point's cover cell, or one beside it, is built: the cover's own word on whether houses stand there. */
export function builtCover(root: string) {
  const tiles = new Map<string, Uint8Array | null>()
  const tileAt = (key: string) => {
    if (!tiles.has(key)) {
      const path = `${root}/${key}.json`
      tiles.set(key, existsSync(path) ? decodeLand((JSON.parse(readFileSync(path, 'utf8')) as { r: string }).r) : null)
    }
    return tiles.get(key)
  }
  const kindAt = (lat: number, lon: number) => {
    const tile = tileAt(landCellKey(lat, lon))
    const row = LAND_N - 1 - Math.floor((lat - Math.floor(lat * 10) / 10) / LAND_STEP)
    const col = Math.floor((lon - Math.floor(lon * 10) / 10) / LAND_STEP)
    const clamped = (v: number) => Math.max(0, Math.min(LAND_N - 1, v))
    return tile?.[clamped(row) * LAND_N + clamped(col)]
  }
  return (lat: number, lon: number) =>
    [-1, 0, 1].some(r => [-1, 0, 1].some(c => kindAt(lat + r * LAND_STEP, lon + c * LAND_STEP) === BUILT))
}

/** The footprint rule's evidence: by OSM's share, how the groups and their footprints look against what they should. */
export function shareTable(groups: readonly RawGroup[], builtAt: (lat: number, lon: number) => boolean) {
  const shown = groups.filter(g => g.houses.length >= RULE.houses && extentOf(spotsOf(g.houses, cornerOf(g.houses))) <= RULE.extentM)
  const bins = [0, .05, .2, .35, .5, .65, .8, .95]
  return bins.map((from, i) => {
    const to = bins[i + 1] ?? 1.01
    const some = shown.filter(g => { const share = osmShareOf(g.houses); return share >= from && share < to })
    const houses: RawHouse[] = some.flatMap(g => g.houses)
    return { share: `${from}-${Math.min(1, to)}`, groups: some.length, places: some.flatMap(g => g.places).length, houses: houses.length,
      median: quantile(some.map(g => g.houses.length), .5), over600: percent(houses.filter(h => h[5] > 600).length, houses.length),
      under60: percent(houses.filter(h => h[5] < 60).length, houses.length),
      medianM2: quantile(houses.map(h => h[5]), .5), onBuilt: percent(houses.filter(h => builtAt(h[0], h[1])).length, houses.length) }
  })
}

/** What another extent or house limit would keep: the same groups by each, everything else as the rule has it. */
export function limitTable(groups: readonly RawGroup[]) {
  return [1000, 1500, 2000].flatMap(extentM => [5, 10, 20].map(houses => {
    const some = groups.filter(g => g.houses.length >= houses && osmShareOf(g.houses) >= RULE.osmShare &&
      extentOf(spotsOf(g.houses, cornerOf(g.houses))) <= extentM)
    return { extentM, houses, groups: some.length, places: some.flatMap(g => g.places).length,
      footprints: some.reduce((sum, g) => sum + g.houses.length, 0) }
  }))
}

export function sizeTable(texts: ReadonlyMap<string, string>) {
  const raw = [...texts.values()].map(text => Buffer.byteLength(text))
  const gz = [...texts.values()].map(text => gzipSync(text, { level: 9 }).length)
  const row = (name: string, sizes: number[]) => ({ name, tiles: sizes.length, total: sizes.reduce((a, b) => a + b, 0),
    median: quantile(sizes, .5), p90: quantile(sizes, .9), largest: Math.max(0, ...sizes) })
  return [row('raw', raw), row('gzip', gz)]
}
