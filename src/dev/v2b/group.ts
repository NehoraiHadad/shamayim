import type { CityRaster } from '../../data/city/cityRaster'
import { COVER, LAND_STEP } from '../../data/land/grid'
import type { LandCover } from '../../data/land/landData'
import { hashId } from '../../data/landmarks/hash'
import type { Coordinate } from '../../data/landmarks/project'
import { HOUSE_M, type GroupCell, type Spot } from './types'

const BUILT = COVER.indexOf('built'), TREE = COVER.indexOf('tree')
/** The place's group starts from the built cells within this far of the place point (as V1's truth does). */
const SEED_KM = .25
const REACH_KM = 2.5
/** Houses in a built cell the raster knows nothing of (choice; 4 of 67 cells at Karmei Tzur, 6 of 287 at Nahalal). */
const UNKNOWN_HOUSES = 2
const TREE_NEAR_CELLS = 2

const near = (cells: ReadonlyMap<string, unknown>, row: number, col: number, reach: number) => {
  for (let r = -reach; r <= reach; r++) for (let c = -reach; c <= reach; c++) {
    if ((r || c) && cells.has(`${row + r}:${col + c}`)) return true
  }
  return false
}

/**
 * The own linked group: built cells joined to the place point cell by cell (side or corner), with no empty cell between.
 * The proposal's two-cell gap takes a second village at Nahalal (287 to 380 cells, 1.5 to 2.3 km), so it is not used.
 */
export function ownGroup(place: Coordinate, cover: LandCover, raster: CityRaster | undefined) {
  const perLat = 111.32, perLon = 111.32 * Math.cos(place.lat * Math.PI / 180)
  const built = new Map<string, GroupCell>()
  const trees: (Spot & { row: number; col: number })[] = []
  const row0 = Math.floor(place.lat / LAND_STEP), col0 = Math.floor(place.lon / LAND_STEP)
  const span = Math.ceil(REACH_KM / (LAND_STEP * perLon))
  const areaM2 = LAND_STEP * perLat * LAND_STEP * perLon * 1e6
  for (let row = row0 - span; row <= row0 + span; row++) for (let col = col0 - span; col <= col0 + span; col++) {
    const lat = (row + .5) * LAND_STEP, lon = (col + .5) * LAND_STEP
    const kind = cover.coverAt(lat, lon)
    const dx = (lon - place.lon) * perLon, dy = (lat - place.lat) * perLat
    if (kind === TREE) trees.push({ dx, dy, row, col })
    if (kind !== BUILT) continue
    const share = raster?.at(lat, lon).built ?? 0
    built.set(`${row}:${col}`, { dx, dy, row, col, known: share > 0, outline: false, seed: hashId(`${row}:${col}`),
      houses: share > 0 ? share * areaM2 / HOUSE_M ** 2 : UNKNOWN_HOUSES })
  }
  const group = new Map<string, GroupCell>()
  const todo = [...built.values()].filter(c => Math.hypot(c.dx, c.dy) <= SEED_KM)
  for (let cell = todo.pop(); cell; cell = todo.pop()) {
    const key = `${cell.row}:${cell.col}`
    if (group.has(key)) continue
    group.set(key, cell)
    for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
      const next = built.get(`${cell.row + r}:${cell.col + c}`)
      if (next) todo.push(next)
    }
  }
  const cells = [...group.values()]
  for (const c of cells) {
    c.outline = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([r, k]) => !group.has(`${c.row + r}:${c.col + k}`))
  }
  return { cells, trees: trees.filter(t => near(group, t.row, t.col, TREE_NEAR_CELLS)) }
}
