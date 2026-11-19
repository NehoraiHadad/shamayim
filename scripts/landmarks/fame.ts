import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import type { Row } from '../../src/data/landmarks/israelData'
import { offsetKm } from '../../src/data/landmarks/project'
import type { Landmark } from '../../src/data/landmarks/types'
import { parseGeoJsonSequence, row, type LandmarkIndex } from './build'

/**
 * Adds fame (`src/data/landmarks/fame.ts`) to the shipped landmark cells without rebuilding them: for when the cells
 * were built before fame was kept and only an extract from another mirror is at hand (its borders differ from
 * Geofabrik's, so a full rebuild would add and drop rows along them). The monthly build (`build.ts`) keeps fame by
 * itself. Input: the same filtered GeoJSON sequence the build reads; only its famous marks are used. Each takes the
 * place of the shipped row it was merged with (same kind, within the build's 300 m); a famous mark with no row there
 * (beyond the shipped borders, or mapped since) is left out.
 *
 *   npx tsx scripts/landmarks/fame.ts landmarks.geojsonseq [--dir public/data/landmarks/il]
 */
const MERGE_KM = .3

const at = (cell: Row) => ({ lat: cell[1], lon: cell[2] })
const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => Math.hypot(offsetKm(a, b).dx, offsetKm(a, b).dy)

export function patchCell(rows: Row[], famous: Landmark[]) {
  const out = [...rows]
  const taken = new Set<number>()
  let missed = 0
  // Most famous first: a row two famous marks could claim goes to the better known.
  for (const mark of [...famous].sort((a, b) => (b.fame ?? 0) - (a.fame ?? 0) || b.heightM - a.heightM)) {
    let best = -1
    out.forEach((cell, i) => {
      if (cell[0] !== mark.kind || taken.has(i)) return
      const d = km(at(cell), mark)
      if (d <= MERGE_KM && (best < 0 || d < km(at(out[best]), mark))) best = i
    })
    if (best < 0) { missed++; continue }
    out[best] = row(mark)
    taken.add(best)
  }
  return { rows: out, patched: taken.size, missed }
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    dir: { type: 'string', default: 'public/data/landmarks/il' },
  } })
  const famous = parseGeoJsonSequence(await readFile(positionals[0], 'utf8')).filter(mark => mark.fame)
  const index = JSON.parse(await readFile(`${values.dir}/index.json`, 'utf8')) as LandmarkIndex
  const byCell = new Map<string, Landmark[]>()
  for (const mark of famous) {
    const cell = `${Math.floor(mark.lat * 10)}_${Math.floor(mark.lon * 10)}`
    byCell.set(cell, [...(byCell.get(cell) ?? []), mark])
  }
  let patched = 0, missed = 0
  for (const cell of index.cells) {
    const marks = byCell.get(cell)
    if (!marks) continue
    const file = `${values.dir}/${cell}.json`
    const result = patchCell(JSON.parse(await readFile(file, 'utf8')) as Row[], marks)
    patched += result.patched
    missed += result.missed
    await writeFile(file, JSON.stringify(result.rows))
  }
  const outside = [...byCell.entries()].filter(([cell]) => !index.cells.includes(cell)).reduce((n, [, m]) => n + m.length, 0)
  console.log(`${famous.length} famous marks: ${patched} rows patched, ${missed} with no row, ${outside} outside the cells.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
