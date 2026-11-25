import type { LayerOf } from '../../model/types'
import { townBodies, townGround, type Block } from './townBlocks'

/*
 * Where the drawn town's bodies stand on the near plane, for the plane to cut their seats and casts in its own wood
 * (`land/seats`): each body the town paints (its block as `townBlocks` gathers it, or a tower), the ground under its two
 * corners where a terrace wall carries it down a hill, its height, and whether it stands on the town's front row; the
 * front rows' ground lines; the cast's direction. Pure: the outside layer's items and shine.
 */

/** A body seated on its own front row: how far above the ground there it may stand and still be on it (px). */
const SEATED = 0.8
/** The steepest fall across a body a hill gives (px down per px across): a deeper step beside it is a row in front of it,
 *  not its ground. */
const FALL = 0.45
/** Two front bodies are one row while the gap between them is under this (px) and their feet step less than this (px). */
const ROW_GAP = 1.2, ROW_STEP = 1.5
/** Numbers a seat takes: x0, x1, the ground under its left and right corners, its height, 1 on the front row. */
export const SEAT_STRIDE = 6

/** What the near plane reads of the town standing on it (its `own`). */
export interface PlaneSeats {
  /** `SEAT_STRIDE` numbers a body, back to front. */
  seats: number[]
  /** The town's cast: across (signed), its length against the height, its strength, and its share toward the eye. */
  cast: number[]
  /** The front rows' ground lines: x, y pairs, each a polyline. */
  rows: number[][]
}

type Seat = { left: number; right: number }

/** A terrace wall's least height to be cut (px), its most against the body's height, and its tallest (px). */
const WALL_LEAST = 0.45, WALL_MOST = 0.6, WALL_TALLEST = 3

/** The terrace wall under a body on a hill that falls across it: its height at each corner (px); none under its least. */
export function wallOf(foot: number, h: number, seat: Seat): Seat | null {
  const most = Math.max(WALL_LEAST, Math.min(WALL_TALLEST, WALL_MOST * h))
  const left = Math.min(most, Math.max(0, seat.left - foot)), right = Math.min(most, Math.max(0, seat.right - foot))
  return Math.max(left, right) < WALL_LEAST ? null : { left, right }
}

/** Where the ground lies under a body of the front row, at its two corners; none for one behind it. */
export function seatOf(b: Block, ground: (x: number) => number | undefined): Seat | undefined {
  if (b.beyond) return undefined
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, at = ground(b.x)
  if (at === undefined || b.foot < at - SEATED) return undefined
  const most = b.foot + FALL * (b.w + 1)
  const side = (x: number) => { const g = ground(x) ?? b.foot; return g > most ? b.foot : Math.max(b.foot, g) }
  return { left: side(x0 - 0.5), right: side(x1 + 0.5) }
}

const held = new WeakMap<readonly unknown[], { seats: number[]; rows: number[][]; key: string }>()

export function townSeats(desc: LayerOf<'outside'>): { bodies: number[]; rows: number[][]; cast: number[]; key: string } {
  const c = desc.shine.cast, toward = (c as { toward?: number }).toward ?? 0
  const cast = [c.dx, c.length, c.alpha, toward]
  let found = held.get(desc.items)
  if (!found) held.set(desc.items, found = seatsOf(desc.items))
  return { bodies: found.seats, rows: found.rows, cast, key: found.key }
}

function seatsOf(items: LayerOf<'outside'>['items']) {
  const bodies = townBodies(items), ground = townGround(bodies), seats: number[] = [], front: number[][] = []
  for (const { block, item } of bodies) {
    if (block) {
      if (block.low || block.beyond) continue
      const seat = seatOf(block, ground), x0 = block.x - block.w / 2, x1 = block.x + block.w / 2
      const wall = seat && wallOf(block.foot, block.foot - block.top, seat), l = block.foot + (wall?.left ?? 0), r = block.foot + (wall?.right ?? 0)
      seats.push(x0, x1, l, r, block.foot - block.top, seat ? 1 : 0)
      if (seat) front.push([x0, x1, l, r])
    } else if (item.kind === 'tower') {
      const x0 = item.x - item.w / 2, x1 = item.x + item.w / 2, on = (ground(item.x) ?? item.base) <= item.base + SEATED
      seats.push(x0, x1, item.base, item.base, item.h, on ? 1 : 0)
      if (on) front.push([x0, x1, item.base, item.base])
    }
  }
  // The front rows: bodies side by side on the ground, their feet joined into one line.
  front.sort((a, b) => a[0] - b[0])
  const rows: number[][] = []
  let row: number[] = [], end = -Infinity, endY = 0
  for (const [x0, x1, l, r] of front) {
    if (x1 <= end) continue
    const joins = row.length && x0 - end < ROW_GAP && Math.abs(l - endY) < ROW_STEP
    if (!joins) { if (row.length >= 4) rows.push(row); row = [] }
    const from = Math.max(x0, row.length ? end : x0)
    row.push(from, l + (r - l) * ((from - x0) / Math.max(1e-3, x1 - x0)), x1, r)
    end = x1; endY = r
  }
  if (row.length >= 4) rows.push(row)
  let h = 2166136261
  for (const v of [...seats, -1, ...rows.flat()]) h = Math.imul(h ^ Math.round(v * 8), 16777619)
  return { seats, rows, key: (h >>> 0).toString(36) }
}
