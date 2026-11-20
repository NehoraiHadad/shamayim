import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Coordinate } from '../landmarks/project'
import { findClusters } from './clusters'
import { cellsForBand } from './columns'
import { decodeRuns } from './grid'
import { homeCluster, homeTier } from './homeCluster'
import { clustersForCache, validClusters } from './clusterCache'
import type { CityCell, CityIndex } from './types'

const root = 'public/data/city/il/'
function fixture(keys: string[]) {
  const grids = new Map<string, Uint8Array>()
  const places = keys.flatMap(key => {
    const cell = JSON.parse(readFileSync(root + key + '.json', 'utf8')) as CityCell
    if (cell.v !== 2) throw new Error(`Expected a v2 fixture for ${key}`)
    grids.set(key, decodeRuns(cell.r, 3))
    return cell.p
  })
  return { grids, places }
}

function near(place: Coordinate) {
  const index = JSON.parse(readFileSync(root + 'index.json', 'utf8')) as CityIndex
  return fixture(cellsForBand(place).filter(key => index.cells.includes(key)))
}

it('keeps the full cross-cell Nahalal component and anchors IDs to geography', () => {
  const place = { lat: 32.69, lon: 35.1967 }
  const { grids, places } = near(place)
  expect(grids.has('326_351')).toBe(true)
  const clusters = findClusters(place, grids, places)
  const home = homeCluster(clusters)!
  expect([home.squares, home.measured, homeTier(home)]).toEqual([104, 104, 'A'])
  expect(home.dx[1] - home.dx[0]).toBeCloseTo(1.99, 2)
  expect(home.dy[1] - home.dy[0]).toBeCloseTo(2.55, 2)
  const shifted = findClusters({ lat: 32.691, lon: 35.197 }, new Map([...grids].reverse()), [...places].reverse())
  expect(homeCluster(shifted)?.id).toBe(home.id)
  expect(clusters.every(cluster => cluster.squares >= 4)).toBe(true)
  const cached = clustersForCache(clusters)
  expect(validClusters(cached)).toBe(true)
  expect(homeCluster(cached!)?.id).toBe(home.id)
  expect(validClusters([{ ...home, bands: [{ runs: [[2, 1]], big: [], dy: 0 }] }])).toBe(false)
})

it('treats Karmei Tzur as tier C and Yagur as tier A', () => {
  const karmei = fixture(['316_351', '316_350'])
  const clusters = findClusters({ lat: 31.6047, lon: 35.1081 }, karmei.grids, karmei.places)
  expect(clusters.some(cluster => cluster.place?.name === 'כרמי צור' && cluster.squares === 16)).toBe(true)
  expect(homeCluster(clusters)).toBeNull()
  expect(homeTier(homeCluster(clusters))).toBe('C')
  const yagur = fixture(['327_350'])
  const home = homeCluster(findClusters({ lat: 32.7417, lon: 35.0764 }, yagur.grids, yagur.places))
  expect(home).toMatchObject({ squares: 38, measured: 37 })
  expect(homeTier(home)).toBe('A')
})

it('splits Daliyat and Isfiya only when place rows are present', () => {
  const { grids, places } = fixture(['326_350', '327_350'])
  const point = { lat: 32.6933, lon: 35.0467 }
  expect(homeCluster(findClusters(point, grids, []))?.squares).toBe(682)
  const split = findClusters(point, grids, places)
  expect(split.find(cluster => cluster.place?.name === 'דלית אל-כרמל')?.squares).toBe(485)
  expect(split.find(cluster => cluster.place?.name === 'עספיא')?.squares).toBe(148)
  expect(split.every(cluster => cluster.squares >= 4)).toBe(true)
})
