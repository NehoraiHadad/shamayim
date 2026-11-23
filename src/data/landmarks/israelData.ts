import type { Place } from '../../config/place'
import { cropSectorOf, type CropArea } from './cropAreas'
import type { Fame, Landmark, MarkKind } from './types'
import { HALL_M, LEGACY_DEFAULTS } from './worship'

/** kind, lat, lon, height, name ('' when it has none but is famous), fame (`fame.ts`). */
export type Row = [MarkKind, number, number, number, string?, Fame?]
export type CropRow = [lat: number, lon: number, area: CropArea]
/** Evidence-tagged cell payload written by `scripts/landmarks/build.ts`; legacy cells are bare `Row[]`. */
export interface EvidenceCell {
  heights: 'evidence'
  rows: Row[]
}
export type LandmarkCell = Row[] | EvidenceCell
export interface IsraelLandmarkIndex {
  generatedAt: string
  source: 'OpenStreetMap via Geofabrik (ODbL)'
  bbox: [number, number, number, number]
  cells: string[]
}

const ROOT = `${import.meta.env.BASE_URL}data/landmarks/il`
// The drawn crop detail fades by ~2 km at reference resolution. Allow another km for nearby footprints.
const CROP_REACH_KM = 3
// Extra margin for sector selection so a polygon overlapping the reach box from across a 0.5° sector edge is still fetched.
const CROP_SECTOR_PAD_KM = 1
let indexPromise: Promise<IsraelLandmarkIndex | null> | null = null
const cropPromises = new Map<string, Promise<CropRow[]>>()

function areaIntersectsBox(area: CropArea, [south, west, north, east]: readonly [number, number, number, number]): boolean {
  for (const rings of area.polygons) {
    let pSouth = Infinity, pNorth = -Infinity, pWest = Infinity, pEast = -Infinity
    for (const [lon, lat] of rings[0]) {
      if (lat < pSouth) pSouth = lat
      if (lat > pNorth) pNorth = lat
      if (lon < pWest) pWest = lon
      if (lon > pEast) pEast = lon
    }
    if (pNorth >= south && pSouth <= north && pEast >= west && pWest <= east) return true
  }
  return false
}

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

function rowToLandmark([kind, lat, lon, heightM, nameHe, fame]: Row, evidence: boolean): Landmark {
  return {
    id: `il-${kind}-${lat}-${lon}`,
    kind, lat, lon,
    // Legacy bare-array cells wrote flat defaults onto untagged worship rows, so those heights are no evidence of a tower.
    heightM: !evidence && heightM === LEGACY_DEFAULTS[kind] ? HALL_M : heightM,
    ...(nameHe ? { nameHe } : {}), source: 'osm', ...(fame ? { fame } : {}),
  }
}

async function loadCell(cell: string, signal: AbortSignal): Promise<Landmark[]> {
  const response = await fetch(`${ROOT}/${cell}.json`, { signal })
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Israel landmark cell HTTP ${response.status}`)
  const payload = await response.json() as LandmarkCell
  if (Array.isArray(payload)) return payload.map((item) => rowToLandmark(item, false))
  const evidence = payload.heights === 'evidence'
  return payload.rows.map((item) => rowToLandmark(item, evidence))
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
  const cells = cellsForStrip(place).filter((cell) => index.cells.includes(cell))
  const cropBox = box(place, CROP_REACH_KM, CROP_REACH_KM)
  const sectorBox = box(place, CROP_REACH_KM + CROP_SECTOR_PAD_KM, CROP_REACH_KM + CROP_SECTOR_PAD_KM)
  const sectors = [...new Set(cellsForBox(sectorBox).map((cell) => {
    const [lat, lon] = cell.split('_').map(Number)
    return cropSectorOf(lat / 10, lon / 10)
  }))]
  const [places, areas] = await Promise.all([Promise.all(cells.map((cell) => loadCell(cell, signal))), Promise.all(sectors.map(cropCell))])
  const crops = areas.flat().filter(([, , cropArea]) => areaIntersectsBox(cropArea, cropBox))
    .map(([lat, lon, cropArea], i): Landmark => ({
    id: `il-crop-${i}`, kind: cropArea.kind === 'palm' ? 'palms' : cropArea.kind === 'vineyard' ? 'vineyard' : 'orchard',
    lat, lon, heightM: 0, source: 'osm', cropArea, areaOnly: true,
  }))
  return [...places.flat(), ...crops]
}

export function resetIsraelDataForTests() { indexPromise = null; cropPromises.clear() }
