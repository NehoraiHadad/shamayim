import { LAND_STEP } from '../../data/land/grid'
import { seeded } from '../../data/landmarks/hash'
import { HOUSE_M } from '../../data/village/cellSource'
import { LAT_M, lonM } from '../../data/village/houseCode'
import type { CoverCell } from '../../data/village/settlement'
import type { DrawnHouse } from './drawn'

/** Where a cell's houses stand in it, by how many it draws (share of the cell, east and north). */
const PLACES: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0]],
  [[-.25, .06], [.25, -.06]],
  [[-.25, .22], [.25, .18], [0, -.24]],
  [[-.25, .24], [.25, .22], [-.23, -.24], [.25, -.22]],
]
/** The edge's cells come first, up to this part of the houses (more would leave an empty shell). */
const OUTLINE_PART = 2 / 3
/** Seeded shift in the cell (share of it): neighbours in adjacent cells stand about 0 to half a house apart. */
const JITTER = .14
/** Two cells that hold as many are told apart by their seeds, by less than this many houses. */
const TIE = .5

interface Wanted { cell: CoverCell; level: number; by: number }

/** How many houses each cell draws: the edge's cells one each first, then always where the most houses are unmet. */
function perCell(cells: readonly CoverCell[], count: number): Map<CoverCell, number> {
  const n = Math.max(1, Math.round(count)), each = cells.reduce((sum, cell) => sum + cell.holds, 0) / n
  const order = new Map(cells.map(cell => [cell, seeded(cell.seed + 3)()]))
  const edge = new Set(cells.filter(cell => cell.outline).sort((a, b) => order.get(a)! - order.get(b)! || a.seed - b.seed)
    .slice(0, Math.round(n * OUTLINE_PART)))
  const wanted = cells.flatMap(cell => PLACES.map((_, level): Wanted =>
    ({ cell, level, by: edge.has(cell) && !level ? Infinity : cell.holds / each - level + TIE * order.get(cell)! })))
  wanted.sort((a, b) => a.by === b.by ? a.cell.seed - b.cell.seed || a.level - b.level : b.by - a.by)
  const counts = new Map<CoverCell, number>()
  for (const { cell } of wanted.slice(0, n)) counts.set(cell, (counts.get(cell) ?? 0) + 1)
  return counts
}

/** The houses that stand for a settlement's cells: `count` of them, at most four in a cell. */
export function housesOfCells(cells: readonly CoverCell[], count: number, lat: number,
  keep: (house: DrawnHouse) => boolean = () => true): DrawnHouse[] {
  if (!cells.length) return []
  const eastKm = LAND_STEP * lonM(lat) / 1000, northKm = LAND_STEP * LAT_M / 1000
  return [...perCell(cells, count)].flatMap(([cell, k]) => {
    const random = seeded(cell.seed + 11)
    return PLACES[k - 1].map(([u, v], i): DrawnHouse => ({ seed: cell.seed + 101 * i, frontM: HOUSE_M,
      dx: cell.dx + (u + (random() - .5) * JITTER) * eastKm, dy: cell.dy + (v + (random() - .5) * JITTER) * northKm })).filter(keep)
  })
}