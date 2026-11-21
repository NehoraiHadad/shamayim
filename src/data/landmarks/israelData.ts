import type { Place } from '../../config/place'
import { cropSectorOf, type CropArea } from './cropAreas'
import type { Fame, Landmark, MarkKind } from './types'

/** kind, lat, lon, height, name ('' when it has none but is famous), fame (`fame.ts`). */
export type Row = [MarkKind, number, number, number, string?, Fame?]
export type CropRow = [lat: number, lon: number, area: CropArea]
export interface IsraelLandmarkIndex {
  generatedAt: string
  source: 'OpenStreetMap via Geofabrik (ODbL)'
  bbox: [number, number, number, number]
  cells: string[]
}

const ROOT = `${import.meta.env.BASE_URL}data/landmarks/il`
// The drawn crop detail fades by ~2 km at reference resolution. Allow another km for polygon centres.
const CROP_REACH_KM = 3
let indexPromise: Promise<IsraelLandmarkIndex | null> | null = null
const cropPromises = new Map<string, Promise<CropRow[]>>()

function box(place: Place, eastKm: number, northKm: number) {
  const lat = northKm / 111.32
  const lon = eastKm / (111.32 * Math.cos(place.lat * Math.PI / 180))
  return [place.lat - lat, place.lon - lon, place.lat + lat, place.lon + lon] as const
}

function cellsForBox(bounds: readonly number[]) {
  const cells: string[] = []
  for (let lat = Math.floor(bounds[0] * 10); lat <= Math.floor(bounds[2] * 10); lat++) {
    for (let lon = Math.floor(bounds[1] * 10); lon <= Math.floor(bounds[3] * 10); lon++) cells.push(`${lat}_${lon}`)
  }
  return cells
}

export function cellsForStrip(place: Place): string[] {
  return [...new Set([...cellsForBox(box(place, 12, 1.5)), ...cellsForBox(box(place, 30, 3))])].sort()
}

export function inCoverage(index: IsraelLandmarkIndex, place: Place): boolean {
  const [south, west, north, east] = index.bbox
  return place.lat >= south && place.lat <= north && place.lon >= west && place.lon <= east
}

async function getIndex(): Promise<IsraelLandmarkIndex | null> {
  indexPromise ??= fetch(`${ROOT}/index.json`).then(async (response) => {
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Israel landmark index HTTP ${response.status}`)
    return await response.json() as IsraelLandmarkIndex
  })
  return await indexPromise
}

async function loadCell(cell: string, signal: AbortSignal): Promise<Row[]> {
  const response = await fetch(`${ROOT}/${cell}.json`, { signal })
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Israel landmark cell HTTP ${response.status}`)
  return await response.json() as Row[]
}

function cropCell(sector: string) {
  let pending = cropPromises.get(sector)
  if (!pending) {
    pending = fetch(`${ROOT}/crops/${sector}.json`).then(async (response) =>
      response.ok ? await response.json() as CropRow[] : []).catch(() => {
      cropPromises.delete(sector)
      return []
    })
    cropPromises.set(sector, pending)
  }
  return pending
}

export async function loadIsrael(place: Place, signal: AbortSignal): Promise<Landmark[] | null> {
  const index = await getIndex()
  if (!index || !inCoverage(index, place)) return null
  const strip = cellsForStrip(place)
  const cells = strip.filter((cell) => index.cells.includes(cell))
  const cropStrip = new Set(cellsForBox(box(place, CROP_REACH_KM, CROP_REACH_KM)))
  const sectors = [...new Set([...cropStrip].map((cell) => {
    const [lat, lon] = cell.split('_').map(Number)
    return cropSectorOf(lat / 10, lon / 10)
  }))]
  const [rows, areas] = await Promise.all([Promise.all(cells.map((cell) => loadCell(cell, signal))), Promise.all(sectors.map(cropCell))])
  const places = rows.flat().map(([kind, lat, lon, heightM, nameHe, fame]): Landmark => ({ id: `il-${kind}-${lat}-${lon}`,
    kind, lat, lon, heightM, ...(nameHe ? { nameHe } : {}), source: 'osm', ...(fame ? { fame } : {}) }))
  const crops = areas.flat().filter(([lat, lon]) => cropStrip.has(`${Math.floor(lat * 10)}_${Math.floor(lon * 10)}`))
    .map(([lat, lon, cropArea], i): Landmark => ({
    id: `il-crop-${i}`, kind: cropArea.kind === 'palm' ? 'palms' : cropArea.kind === 'vineyard' ? 'vineyard' : 'orchard',
    lat, lon, heightM: 0, source: 'osm', cropArea, areaOnly: true,
  }))
  return [...places, ...crops]
}

export function resetIsraelDataForTests() { indexPromise = null; cropPromises.clear() }
