import type { FootprintHouse, SettlementRow } from '../../data/village/settlement'
import type { DrawnHouse } from './drawn'

/** A size class's mean side, m, and how much longer than it the long side is. */
const SIDE_M = [10.5, 13.5, 18, 28] as const
const ASPECT = Math.sqrt(1.35)
/** A house at the edge is kept this many times as often: the outline is what a village is known by. */
const OUTLINE_WEIGHT = 3

/** The front the eye meets: the long side of a house that runs across the view, the short one of one that runs along it. */
const frontOf = ({ size, across }: FootprintHouse) => across ? SIDE_M[size] * ASPECT : SIDE_M[size] / ASPECT

/** `count` of a row's houses, evenly: a ring's all round, a street's with both its ends. */
export function thinned<T>(row: readonly T[], count: number, ring: boolean): T[] {
  if (count >= row.length) return [...row]
  if (count === 1 && !ring) return [row[Math.floor(row.length / 2)]]
  return Array.from({ length: count }, (_, i) => row[ring ? Math.floor(i * row.length / count) : Math.round(i * (row.length - 1) / (count - 1))])
}

/** The houses drawn for a settlement's footprints: about `count` real ones, thinned along each row. */
export function housesOfFootprints(spots: readonly FootprintHouse[], rows: readonly SettlementRow[], count: number,
  keep: (house: FootprintHouse) => boolean = () => true): DrawnHouse[] {
  const inRows = rows.reduce((sum, row) => sum + row.count, 0)
  const lines = [...rows.map(({ start, count: length, ring }) => ({ at: spots.slice(start, start + length).filter(keep), ring })),
    ...spots.slice(inRows).filter(keep).map(house => ({ at: [house], ring: false }))]
  const weightOf = (line: readonly FootprintHouse[]) => line.reduce((sum, { outline }) => sum + (outline ? OUTLINE_WEIGHT : 1), 0)
  const share = count / Math.max(1, lines.reduce((sum, { at }) => sum + weightOf(at), 0))
  let owed = 0
  return lines.flatMap(({ at, ring }) => {
    owed += weightOf(at) * share
    const n = Math.max(0, Math.min(at.length, Math.round(owed)))
    owed -= n
    return thinned(at, n, ring)
  }).map(house => ({ dx: house.dx, dy: house.dy, frontM: frontOf(house), seed: house.seed }))
}