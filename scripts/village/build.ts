// Builds the village footprint tiles from `groups.py`'s output, and says what is wrong with them.
// Usage: npx tsx scripts/village/build.ts <groupsDir> [--out public/data/village/il] [--source scripts/village/source.json]
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { faultsOf, lostPlaces, servingFaults, sizeFaults, type Counts, type Pin } from './gates'
import { MICROSOFT, OSM, readFacts, readGroups } from './input'
import { builtCover, limitTable, shareTable, sizeTable } from './measure'
import { verdictOf, type Verdict } from './rule'
import { readPoints, servedAt } from './serve'
import { tileKeysOf, tilesOf } from './tiles'
import { placesIn, storedTiles, textsOf, writeTiles } from './write'

const { positionals: [input], values } = parseArgs({ allowPositionals: true, options: {
  out: { type: 'string', default: 'public/data/village/il' }, source: { type: 'string', default: 'scripts/village/source.json' } } })
if (!input) throw new Error('Usage: tsx scripts/village/build.ts <groupsDir> [--out dir] [--source file]')

const pin = JSON.parse(await readFile(values.source, 'utf8')) as Pin
const facts = await readFacts(join(input, 'facts.json'))
const groups = await readGroups(join(input, 'groups.jsonl'))
const verdicts = groups.map(verdictOf)
const good = groups.filter((_, i) => verdicts[i] === 'good')

const tiles = tilesOf(good, pin.release, new Date().toISOString().slice(0, 10))
const before = await storedTiles(values.out)
const texts = textsOf(tiles, before)
const counts: Counts = {
  buildings: facts.buildings, kept: facts.kept, osm: facts.datasets[OSM] ?? 0, microsoft: facts.datasets[MICROSOFT] ?? 0,
  groups: good.length, places: good.flatMap(g => g.places).length,
  houses: good.reduce((sum, g) => sum + g.houses.length, 0), tiles: tiles.size,
}

const tally = (wanted: Verdict) => groups.filter((_, i) => verdicts[i] === wanted)
console.table((['good', 'wide', 'few', 'machine'] as const).map(verdict =>
  ({ verdict, groups: tally(verdict).length, places: tally(verdict).flatMap(g => g.places).length })))
console.table([counts])
console.table(sizeTable(texts))
console.log('records stored more than once (a group beside a tile edge):', good.reduce((sum, g) => sum + tileKeysOf(g).length - 1, 0))
const served = servedAt(await readPoints('public/data/city/bounds.json'), texts)
console.log('place points by what one tile gives them:', served)
console.log('OSM share, groups the other two limits let in:')
console.table(shareTable(groups, builtCover('public/data/land/il')))
console.log('the other two limits:')
console.table(limitTable(groups))

await writeTiles(values.out, texts, pin.release)
const faults = [...faultsOf(counts, facts, pin), ...servingFaults(served), ...sizeFaults(new Map([...texts].map(([key, text]) => [key, Buffer.byteLength(text)]))),
  ...lostPlaces(placesIn(before.values()), placesIn(tiles.values()), pin.tolerance)]
for (const fault of faults) console.error(`FAIL: ${fault}`)
process.exitCode = faults.length ? 1 : 0
