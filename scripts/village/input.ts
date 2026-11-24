import { readFile } from 'node:fs/promises'
import { LAT_M, lonM } from '../../src/data/village/houseCode'
import type { LatLon } from '../../src/data/village/tile'
import type { Spot } from './rows'

/** A footprint as `groups.py` writes it: its middle, long and short side (m), the long side's angle from east, area (m²). */
export type RawHouse = [lat: number, lon: number, long: number, short: number, angle: number, areaM2: number, dataset: string]
export interface RawGroup { places: LatLon[]; houses: RawHouse[] }

/** What `groups.py` counted in the whole box. */
export interface Facts {
  buildings: number
  kept: number
  partSources: number
  points: number
  pointsWithoutBuilding: number
  pointsTooWide: number
  unions: number
  datasets: Record<string, number>
  keptDatasets: Record<string, number>
}

export const OSM = 'OpenStreetMap'
export const MICROSOFT = 'Microsoft ML Buildings'

export async function readGroups(path: string): Promise<RawGroup[]> {
  const text = await readFile(path, 'utf8')
  return text.split('\n').filter(Boolean).map(line => JSON.parse(line) as RawGroup)
}

export const readFacts = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as Facts

export const osmShareOf = (houses: readonly RawHouse[]) => houses.filter(house => house[6] === OSM).length / houses.length

/** The group's south-west corner on a 1e-5° grid, never north or east of a house. */
export function cornerOf(houses: readonly RawHouse[]): LatLon {
  const down = (values: number[]) => Math.floor(Math.min(...values) * 1e5) / 1e5
  return [down(houses.map(h => h[0])), down(houses.map(h => h[1]))]
}

/** Metres east and north of a corner. */
export const spotsOf = (houses: readonly RawHouse[], [lat, lon]: LatLon): Spot[] =>
  houses.map(h => ({ x: (h[1] - lon) * lonM(lat), y: (h[0] - lat) * LAT_M }))

/** The larger side of the box of the houses' middles, m. */
export function extentOf(spots: readonly Spot[]): number {
  const span = (values: number[]) => Math.max(...values) - Math.min(...values)
  return Math.max(span(spots.map(s => s.x)), span(spots.map(s => s.y)))
}
