import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { cellKey, encodeRuns } from '../../src/data/city/grid'
import type { CityCell, CityIndex, Tower } from '../../src/data/city/types'
import { contains, eastMetres } from './geometry'
import { taggedLevels } from './heights'
import { Raster } from './raster'
import { readPlaces } from './places'
import { urbanRegions } from './regions'
import { survey } from './survey'
import { buildFar } from './far'

const CELL_LIMIT = 24 * 1024
const TOTAL_LIMIT = 1_000_000
const rounded = (value: number, places: number) => Number(value.toFixed(places))

export async function buildCity(input: string, outputDir: string, generatedAt = new Date().toISOString(), placesPath?: string) {
  const places = await readPlaces(placesPath)
  const raster = new Raster()
  const towers = new Map<string, Tower[]>()
  const coverage = await survey(input, {
    places,
    landuse: ({ shape, polygons }) => raster.landuse(shape, (lon, lat) => contains(polygons, lon, lat)),
    building: ({ shape, tags }, height, tagged, original, evidence, urban) => {
      raster.building(shape, height, tags, original, evidence, urban)
      if (tagged === undefined || (tagged < 40 && (taggedLevels(tags) ?? 0) < 12)) return
      const { lat, lon, east, west } = shape
      const key = cellKey(lat, lon)
      const width = (east - west) * eastMetres(lat)
      const name = tags['name:he']?.trim() || tags.name?.trim()
      const tower: Tower = [rounded(lat, 5), rounded(lon, 5), rounded(tagged, 1), width < 25 ? 0 : width <= 50 ? 1 : 2]
      if (name) tower.push(name)
      const list = towers.get(key) ?? []
      if (list.length < 250 || tower[2] > list.at(-1)![2]) {
        list.push(tower)
        list.sort((a, b) => b[2] - a[2])
        if (list.length > 250) list.pop()
        towers.set(key, list)
      }
    },
  })

  const cells = [...new Set([...raster.cells.keys(), ...places.cells.keys()])].sort()
  const index: CityIndex = {
    generatedAt, source: 'OpenStreetMap via Geofabrik (ODbL)', bbox: [29.45, 34.17, 33.34, 35.9], cells,
  }
  const indexJson = JSON.stringify(index)
  let bytes = Buffer.byteLength(indexJson), largest = { cell: '', bytes: 0 }
  const comparison = [...urbanRegions.map(([region]) => ({ region, urban: 0, changed: 0, urbanChanged: 0 })),
    { region: 'All', urban: 0, changed: 0, urbanChanged: 0 }]
  const compare = (lat: number, lon: number, urban: boolean, changed: boolean) => {
    comparison.forEach((count, i) => {
      const box = urbanRegions[i]
      if (box && (lat < box[1] || lon < box[2] || lat > box[3] || lon > box[4])) return
      count.urban += Number(urban)
      count.changed += Number(changed)
      count.urbanChanged += Number(urban && changed)
    })
  }
  const files = new Map<string, string>()
  for (const cell of cells) {
    const payload: CityCell = { v: 2, r: encodeRuns(raster.bytes(cell, 3, compare)), t: towers.get(cell) ?? [],
      p: places.cells.get(cell) ?? [] }
    const json = JSON.stringify(payload)
    const size = Buffer.byteLength(json)
    bytes += size
    if (size > largest.bytes) largest = { cell, bytes: size }
    files.set(`${cell}.json`, json)
  }
  const summary = `${cells.length} cells, ${bytes} bytes, largest ${largest.cell || 'none'} (${largest.bytes} bytes)`
  if (largest.bytes > CELL_LIMIT || bytes > TOTAL_LIMIT) throw new Error(`City data exceeds budget: ${summary}`)

  if (comparison.at(-1)!.urbanChanged) throw new Error("Urban raster differs from v1")

  await mkdir(outputDir, { recursive: true })
  for (const [name, json] of files) await writeFile(join(outputDir, name), json)
  await writeFile(join(outputDir, 'index.json'), indexJson)
  for (const name of await readdir(outputDir)) {
    if (/^-?\d+_-?\d+\.json$/.test(name) && !files.has(name)) await unlink(join(outputDir, name))
  }
  return { index, bytes, largest, coverage, summary, comparison }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    out: { type: 'string', default: 'public/data/city/il' },
  } })
  if (!positionals[0]) throw new Error('Usage: tsx scripts/city/build.ts city.geojsonseq [places.geojsonseq]')
  const result = await buildCity(positionals[0], values.out!, undefined, positionals[1])
  console.log(result.summary)
  console.table(result.coverage)
  console.table(result.comparison)
  console.log(`far.json: ${await buildFar(values.out!)} bytes`)
}
