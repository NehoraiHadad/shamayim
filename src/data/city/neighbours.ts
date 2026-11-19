import { NEAR_RADIUS_KM, ridgeX } from '../terrain/ridgeProjection'
import { seeded } from '../landmarks/hash'
import { givesWay, type House } from '../landmarks/settlement'
import { cityBase } from './cityBase'
import { skyHeight } from './cityHeight'
import { cityBox, cityBuildingFits, type CityZones } from './cityZones'
import type { Cluster, Extent } from './clusterTypes'
import { BAND_WIDTH, COLUMN_COUNT, COLUMN_WIDTH, depthRow } from './columns'
import { rowHouses } from './fabric'
import { homeCluster } from './homeCluster'
import { roofExtra, visibleNeighbours } from './neighbourOcclusion'
import { mergeRuns } from './runs'
import type { CityColumns } from './types'
import { clusterStyle } from './villageStyle'

export type NeighbourMass = { row: 0 | 1 | 2; roof: 'pitched' | 'flat'; houses: House[]; name?: string; blocks?: boolean }

type Input = CityZones & {
  clusters: Cluster[]
  columns: CityColumns
  ground: (x: number) => number
  litShare: number
  desert: boolean
  homeZone: Extent
  homeHouses?: House[]
}

const prominence = ({ centre, shareSum }: Cluster) => shareSum * (1 - .15 * Math.abs(centre.dy) / 3)

function villageHouses(input: Input, cluster: Cluster, row: NeighbourMass['row'], runs: Extent[], fallback: number) {
  const random = seeded(cluster.id)
  const h = skyHeight(cluster.levels > 0 ? cluster.levels * 3.2 : fallback)
  const depth = (cluster.dy[1] - cluster.dy[0]) * 1000
  const cover = cluster.shareSum / (15 * cluster.squares)
  const opacity = 1 - (1 - cover) ** (depth / 20)
  return runs.flatMap(([left, right]) => {
    const w = Math.min(right - left, 4 + 2 * random())
    const gap = Math.max(.5, Math.min(6, w * (1 - opacity) / opacity))
    const count = Math.floor((right - left + gap) / (w + gap))
    const start = (left + right - (count - 1) * (w + gap)) / 2
    return Array.from({ length: count }, (_, i) => start + i * (w + gap)).flatMap(x => {
      const baseY = cityBase(input.ground, input.floor, row, x, w)
      return baseY == null ? [] : [{ x, baseY, w, h, row, lit: false, seed: Math.floor(random() * 1e6) }]
    })
  })
}

function urbanHouses(input: Input, cluster: Cluster, row: NeighbourMass['row'], runs: Extent[]) {
  const step = COLUMN_WIDTH * input.width / BAND_WIDTH
  // Only this component supplies the occupied columns and height prior, even when another town shares its longitude.
  const column = { built: Math.max(.12, cluster.shareSum / (15 * cluster.squares)),
    measured: cluster.measured / cluster.squares, levels: cluster.levels || 3, upper: cluster.upper }
  const empty = { built: 0, measured: 0, levels: 0, upper: 0 }
  const bins = Array.from({ length: COLUMN_COUNT }, (_, i) => runs.some(([left, right]) =>
    (i + .5) * step >= left && (i + .5) * step <= right)
    ? cluster.columns ? cluster.columns.get(i) ?? empty : column
    : empty)
  return rowHouses(input, row, bins, house => cityBuildingFits(house, input, .6))
    .filter(({ x, w }) => runs.some(([left, right]) => x - w / 2 >= left && x + w / 2 <= right))
}

export function neighbourBox({ houses, roof }: NeighbourMass) {
  const boxes = houses.map(house => cityBox(house, roofExtra(roof)))
  return { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)),
    top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)) }
}

export function composeNeighbours(input: Input): NeighbourMass[] {
  const { clusters, width, homeZone } = input
  const home = homeCluster(clusters)
  const cap = Math.min(14, 8 + 2 * Math.max(0, Math.floor((width - 375) / 150)))
  const project = (dx: number) => ridgeX(dx, NEAR_RADIUS_KM, width)
  const eligible = clusters.filter(cluster => cluster !== home && Math.abs(cluster.centre.dy) <= 3 &&
    Math.abs(project(cluster.dx[1]) - project(cluster.dx[0])) >= 4)
    .sort((a, b) => prominence(b) - prominence(a) || a.id - b.id)
  const masses = eligible.flatMap(cluster => {
    const row = depthRow(cluster.centre.dy)
    const runs = mergeRuns(cluster.bands.flatMap(band => band.runs.map(([a, b]): Extent =>
      [Math.max(0, Math.min(project(a), project(b))), Math.min(width, Math.max(project(a), project(b)))])))
    const open = row === 0 ? runs : mergeRuns(runs.flatMap(([left, right]): Extent[] =>
      [[left, Math.min(right, homeZone[0])], [Math.max(left, homeZone[1]), right]]))
    if (open.reduce((sum, [left, right]) => sum + right - left, 0) < 4) return []
    const style = clusterStyle(cluster, input.desert)
    const blocks = cluster.urban || style === 'blocks'
    const roof = !blocks && style === 'tile' ? 'pitched' : 'flat'
    const houses = (cluster.urban ? urbanHouses(input, cluster, row, open) :
      villageHouses(input, cluster, row, open.filter(([a, b]) => b - a >= 4), roof === 'pitched' ? 4.8 : 9.6))
      .filter(house => cityBuildingFits(house, input, roofExtra(roof)) && !givesWay(house, input.absorbed))
    const drawn = mergeRuns(houses.map(({ x, w }) => [x - w / 2, x + w / 2]))
    return drawn.reduce((sum, [left, right]) => sum + right - left, 0) + 1e-8 >= 4
      ? [{ row, roof, houses, name: cluster.place?.name, blocks } satisfies NeighbourMass] : []
  })
  let budget = 60
  const selected = masses.slice(0, cap).map(mass => {
    const houses = mass.houses.slice(0, budget)
    budget -= houses.length
    return { ...mass, houses }
  })
  return visibleNeighbours(selected, input.homeHouses ?? [])
}
