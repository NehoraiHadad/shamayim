import { encodeHouses, HOUSE_STEP_M, type StoredHouse } from '../../src/data/village/houseCode'
import { sizeClassOf } from '../../src/data/village/settlement'
import type { StoredGroup } from '../../src/data/village/tile'
import { cornerOf, osmShareOf, spotsOf, type RawGroup } from './input'
import { outlineOf } from './outline'
import { rowsOf } from './rows'

/** The long side runs nearer to east–west than to north–south (an angle from east, 0 to 180). */
const isAcross = (angle: number) => Math.abs(Math.cos(angle * Math.PI / 180)) >= Math.SQRT1_2

/** A group as the tile stores it: houses row by row, the longest first, then those that stand alone. */
export function recordOf({ places, houses }: RawGroup): StoredGroup {
  const corner = cornerOf(houses)
  const spots = spotsOf(houses, corner), outline = outlineOf(spots), rows = rowsOf(spots)
  const inRows = rows.flatMap(row => row.at)
  const taken = new Set(inRows)
  const order = [...inRows, ...houses.keys().filter(i => !taken.has(i))]
  const stored = order.map((i): StoredHouse => ({
    x: Math.round(spots[i].x / HOUSE_STEP_M), y: Math.round(spots[i].y / HOUSE_STEP_M),
    across: isAcross(houses[i][4]), size: sizeClassOf(houses[i][5]), outline: outline[i] }))
  return { o: corner, p: [...places].sort((a, b) => a[0] - b[0] || a[1] - b[1]), s: Math.round(osmShareOf(houses) * 100) / 100,
    r: rows.map(({ at, ring }) => ring ? -at.length : at.length), h: encodeHouses(stored) }
}
