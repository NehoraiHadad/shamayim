import { readdirSync, readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Place } from '../../../config/place'
import { findClusters } from '../../../data/city/clusters'
import { cellsForBand } from '../../../data/city/columns'
import { decodeRuns } from '../../../data/city/grid'
import { homeCluster } from '../../../data/city/homeCluster'
import type { CityCell, CityIndex, PlaceRow } from '../../../data/city/types'
import { placeHomes } from '../../../data/landmarks/placeMarks'
import { homeMode } from './homeMode'

const root = 'public/data/city/il/'

/** The shipped city data round a place, as the app loads it, with the panorama's roof decision. */
function roofs(place: Place, override?: (rows: PlaceRow[]) => void) {
  const index = JSON.parse(readFileSync(root + 'index.json', 'utf8')) as CityIndex
  const grids = new Map<string, Uint8Array>()
  const rows = cellsForBand(place).filter(key => index.cells.includes(key)).flatMap(key => {
    const cell = JSON.parse(readFileSync(root + key + '.json', 'utf8')) as CityCell
    if (cell.v !== 2) throw new Error(`Expected a v2 cell ${key}`)
    grids.set(key, decodeRuns(cell.r, 3))
    return cell.p
  })
  override?.(rows)
  const clusters = findClusters(place, grids, rows)
  const city = { towers: [], rows: [[], [], []] as [[], [], []], west: 0, span: 0, clusters }
  const mode = homeMode(place, placeHomes(place), 375, 187.5, city, true)
  return { mode, home: homeCluster(clusters) }
}

const village = (id: string, nameHe: string, lat: number, lon: number, settlementType = 'village', population = 900): Place =>
  ({ id, nameHe, regionHe: 'הגליל', lat, lon, timezone: 'Asia/Jerusalem', featureCode: 'PPL', settlementType, population })

const daliyat = village('daliyat', 'דלית אל-כרמל', 32.6933, 35.0467, 'town', 17_000)
const tamra = village('tamra', 'טמרה', 32.853, 35.198, 'town', 35_000)
const nahalal = village('nahalal', 'נהלל', 32.69, 35.1967)
const shadmot = village('shadmot-mehola', 'שדמות מחולה', 32.3465, 35.5325)
const roshPina = village('rosh-pina', 'ראש פינה', 32.9686, 35.5422, 'town', 3100)

it('gives Arab and Druze places flat roofs from their CBS population group', () => {
  for (const place of [daliyat, tamra]) {
    const { mode, home } = roofs(place)
    expect(home?.place?.name).toBe(place.nameHe)
    expect(home?.place?.faith).toBe(2)
    expect(mode).toMatchObject({ kind: 'template', style: 'flat-hill', mixed: false })
  }
})

it('gives Jewish villages red tiles, not a mix, when their footprints say nothing', () => {
  for (const place of [nahalal, shadmot]) {
    const { mode, home } = roofs(place)
    expect(home?.place?.name).toBe(place.nameHe)
    expect(home?.place?.faith).toBe(1)
    expect(mode).toMatchObject({ kind: 'template', style: 'tile', mixed: false })
  }
})

it('keeps Rosh Pina as it was', () => {
  expect(roofs(roshPina).mode).toMatchObject({ kind: 'template', style: 'tile', mixed: false })
})

it('stays mixed where nothing is known of the place', () => {
  const unknown = (rows: PlaceRow[]) => rows.forEach(row => { row[3] = 0 })
  expect(roofs(nahalal, unknown).mode).toMatchObject({ kind: 'template', style: 'tile', mixed: true })
})

it('ships every place row with a faith the cache accepts', () => {
  const files = readdirSync(root).filter(name => /^-?\d+_-?\d+\.json$/.test(name))
  const rows = files.flatMap(name => (JSON.parse(readFileSync(root + name, 'utf8')) as CityCell & { p?: PlaceRow[] }).p ?? [])
  expect(rows.length).toBeGreaterThan(2000)
  expect(rows.every(row => [0, 1, 2, 3, 4, 5].includes(row[3]))).toBe(true)
})
