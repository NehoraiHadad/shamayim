import { expect, it } from 'vitest'
import type { Cluster } from './clusterTypes'
import { COLUMN_COUNT, COLUMN_WIDTH } from './columns'
import { rowHouses } from './fabric'
import { composeNeighbours } from './neighbours'
import { skyHeight } from './cityHeight'
import type { CityColumns } from './types'

const column = { built: .4, measured: .4, levels: 4, upper: 16 }
const bins = Array.from({ length: COLUMN_COUNT }, () => column)
const columns: CityColumns = { west: 35, span: .25, rows: [bins, bins, bins], towers: [] }
const scene = { width: 375, columns, ground: () => 75, floor: 108, centerX: 187.5,
  centerY: 75, litShare: .5, homeZone: [155, 220] as [number, number], desert: false }

function cluster(id: number, dx: number, dy: number, kilometres = .32): Cluster {
  const extent: Cluster['dx'] = [dx - kilometres / 2, dx + kilometres / 2]
  return { id, dx: extent, dy: [dy - .25, dy + .25], centre: { dx, dy }, squares: 20, measured: 20,
    shareSum: 120, levels: 2, upper: 16, nearest: Math.hypot(dx, dy), urban: false,
    form: { size: 2, big: 0, pitched: 0, flat: 0, evidence: 0 }, bands: [{ dy, runs: [extent], big: [] }],
    place: { kind: 2, faith: 0, name: String(id) } }
}

it('uses the map origin and centroid depth even when the home dot moves', () => {
  const clusters = [cluster(1, -5, .76), cluster(2, -3, .75), cluster(3, 5, -.76), cluster(4, 7, 3.01)]
  const result = composeNeighbours({ ...scene, centerX: 176, clusters })
  expect(result.map(m => m.row)).toEqual([1, 0, 2])
  for (const mass of result) {
    const { centre } = clusters[Number(mass.name) - 1]
    expect(Math.abs(mass.houses[0].x - (187.5 + 15.625 * centre.dx))).toBeLessThan(1)
    expect(mass.houses[0].baseY).toBe([74, 76, 80][mass.row])
    expect(mass.houses[0].h).toBe(skyHeight(6.4))
  }
})

it('keeps the back row behind the home and rejects narrow remnants and shallow front rows', () => {
  const clusters = [cluster(0, 0, 0), cluster(1, 0, 1.1), cluster(2, 0, 0, 4.6),
    cluster(3, 5, -1), cluster(4, 0, -1.1)]
  const result = composeNeighbours({ ...scene, clusters })
  expect(result.map(m => m.name).sort()).toEqual(['1', '3'])
  expect(result.find(m => m.row === 0)?.houses[0].x).toBe(187.5)
  expect(result.filter(m => m.row > 0).flatMap(m => m.houses)
    .every(h => h.x - h.w / 2 >= 220 || h.x + h.w / 2 <= 155)).toBe(true)
  expect(composeNeighbours({ ...scene, clusters: [clusters[3]], ground: () => 107 })).toEqual([])
})

it('uses the flat city packer with only the component’s columns enabled', () => {
  const urban = { ...cluster(1, 6, -1, 6), urban: true, shareSum: 120, levels: 4 }
  const [mass] = composeNeighbours({ ...scene, clusters: [urban] })
  expect(mass).toMatchObject({ row: 2, roof: 'flat', blocks: true })
  const left = 187.5 + 15.625 * 3, right = 187.5 + 15.625 * 9
  const masked = bins.map((bin, i) => (i + .5) * COLUMN_WIDTH >= left && (i + .5) * COLUMN_WIDTH <= right
    ? bin : { ...bin, built: 0 })
  const reference = rowHouses(scene, 2, masked, () => true)
    .filter(h => h.x - h.w / 2 >= left && h.x + h.w / 2 <= right)
  expect(reference.length).toBeGreaterThan(0)
  expect(mass.houses).toEqual(reference)
})

it('caps the number of components and total blocks at each width', () => {
  const clusters = Array.from({ length: 18 }, (_, i) => cluster(i + 1, 4 + i * .4, .1))
  for (const [width, cap] of [[375, 8], [525, 10], [1200, 14]]) {
    expect(composeNeighbours({ ...scene, width, clusters })).toHaveLength(cap)
  }
  const wide = clusters.map(c => ({ ...c, dx: [-12, 12] as Cluster['dx'],
    bands: [{ dy: c.centre.dy, runs: [[-12, 12]] as Cluster['dx'][], big: [] }] }))
  const houses = composeNeighbours({ ...scene, clusters: wide }).flatMap(m => m.houses)
  expect(houses).toHaveLength(60)
})

it('keeps a rear roof only when some of its horizontal span clears the foreground', () => {
  const rear = cluster(1, -4, 1)
  const front = { ...cluster(1, -4, 0), id: 2, levels: 8 }
  const wideFront = { ...front, bands: [{ dy: 0, big: [], runs: [[-4.19, -3.81]] as Cluster['dx'][] }] }
  expect(composeNeighbours({ ...scene, clusters: [rear, wideFront] }).map(m => m.row)).toEqual([1])
  expect(composeNeighbours({ ...scene, clusters: [{ ...rear, levels: 14 }, wideFront] })
    .map(m => m.row)).toEqual([1, 0])
})
