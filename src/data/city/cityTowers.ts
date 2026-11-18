import { hashId } from '../landmarks/hash'
import { projectSight, type Coordinate, type Sight } from '../landmarks/project'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import { cityBase } from './cityBase'
import { skyHeight } from './cityHeight'
import { cityBox, cityBuildingFits, type CityZones } from './cityZones'
import { cityOffset, depthRow } from './columns'
import { selectTowers, towerX } from './towers'
import type { CityTower } from './types'

export type PlacedTower = {
  x: number
  w: number
  h: number
  baseY: number
  row: 0 | 1 | 2
  seed: number
  name?: string
}

type Input = Omit<CityZones, 'absorbed'> & {
  towers: readonly CityTower[]
  ground: (x: number) => number
  curated: readonly Coordinate[]
  panorama?: { place: Coordinate; sightAt: (x: number) => Sight }
}

const SHAFT_WIDTHS = [3.5, 5, 7]
// The Highrise podium is 10 units wide versus the shaft's 7. Include it in the footprint and obstacles.
const podiumWidth = (shaftWidth: number) => shaftWidth * 10 / 7
const footprint = (tower: PlacedTower) => ({ ...tower, w: podiumWidth(tower.w) })
export const towerBox = (tower: PlacedTower) => cityBox(footprint(tower))

export function placeCityTowers(input: Input): PlacedTower[] {
  const { width, ground, floor, curated } = input
  const distinct = input.towers.filter(tower => !curated.some(mark => {
    const { dx, dy } = cityOffset(mark, tower)
    return Math.hypot(dx, dy) <= .25
  }))
  const { panorama } = input
  const positions = new Map(distinct.map(tower => {
    const sight = panorama && projectSight(panorama.place, tower, panorama.sightAt)
    const x = panorama ? sight?.layer === 'near' ? sight.x * width / RIDGE_WIDTH : NaN : towerX(tower.dx, width)
    return [tower, x]
  }))
  const project = (tower: CityTower) => positions.get(tower)!
  return selectTowers(distinct, width, project).flatMap(tower => {
    const x = project(tower)
    const w = SHAFT_WIDTHS[tower.wClass]
    // The panorama has a ridge in each direction, with no fixed north/south terrace.
    const row = panorama ? 1 : depthRow(tower.dy)
    const baseY = cityBase(ground, floor, row, x, podiumWidth(w))
    if (baseY === null) return []
    const placed = { x, w, baseY, row, h: skyHeight(tower.heightM),
      seed: hashId(`${tower.lat.toFixed(5)}:${tower.lon.toFixed(5)}`), name: tower.name }
    return cityBuildingFits(footprint(placed), input) ? [placed] : []
  })
}
