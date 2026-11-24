import { NEAR_DROP, outsideProject, type OutsideFrame } from '../../data/city/outsideView'
import { mixed } from './share'

/** A settlement is drawn this deep, share of its width, where the land has the room. */
export const DEPTH_SHARE = 1 / 3
const LEAST_PX = 2, STEPS = 24

export interface DepthSpot { dx: number; dy: number }
/** The room the feet must stand in: `top(x)` the highest y, `floor` the lowest; `lift` a spot's px below the place's ground. */
export interface DepthRoom { top: (x: number) => number; floor: number; lift: (dx: number, dy: number) => number }
export interface VillageDepth {
  /** Px from the far edge's feet to the near edge's, on level ground. */
  depthPx: number
  /** Whether every foot has room. Where none of the depths gives it, feet are held to the room (`footOf`). */
  fits: boolean
}

export interface Foot { near: number; top: number; lift: number }

/** Each spot's nearness from the place's, and the room at it. */
export function feetOf(frame: OutsideFrame, spots: readonly DepthSpot[], room: DepthRoom): Foot[] {
  const near0 = outsideProject(frame, 0, 0).near
  return spots.map(({ dx, dy }) => {
    const { x, near } = outsideProject(frame, dx, dy)
    return { near: near - near0, top: room.top(x), lift: room.lift(dx, dy) }
  })
}

/** The highest and the lowest y the place's dot may take at a depth for every foot to have room (`lo` over `hi`: none). */
function dotRange(feet: readonly Foot[], floor: number, depthPx: number) {
  let lo = -Infinity, hi = Infinity
  for (const { near, top, lift } of feet) {
    const below = depthPx * near + lift
    lo = Math.max(lo, top - below)
    hi = Math.min(hi, floor - below)
  }
  return { lo, hi }
}
/**
 * The depth a settlement is drawn at: a share of its width where every foot then stands in the room, else the most that
 * does. The room falls off evenly either side of its best depth, so halving finds it; no step in what it answers.
 */
export function depthOf(feet: readonly Foot[], widthPx: number, floor: number, share: number, depthShare = DEPTH_SHARE): VillageDepth {
  if (share <= 0) return { depthPx: NEAR_DROP, fits: true }
  const slack = (depthPx: number) => {
    const { lo, hi } = dotRange(feet, floor, depthPx)
    return hi - lo
  }
  const most = Math.max(LEAST_PX, widthPx * depthShare)
  const own = slack(most) >= 0 ? { depthPx: most, fits: true } : deepest(slack, most)
  return { depthPx: mixed(NEAR_DROP, own.depthPx, share), fits: own.fits }
}

function deepest(slack: (depthPx: number) => number, most: number): VillageDepth {
  let lo = LEAST_PX, hi = most
  for (let i = 0; i < STEPS; i++) {
    const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3
    if (slack(a) < slack(b)) lo = a
    else hi = b
  }
  const best = (lo + hi) / 2
  if (slack(best) < 0) return { depthPx: best, fits: false }
  let fits = best, over = most
  for (let i = 0; i < STEPS; i++) {
    const mid = (fits + over) / 2
    if (slack(mid) >= 0) fits = mid
    else over = mid
  }
  return { depthPx: fits, fits: true }
}

/**
 * Where a spot's foot stands, `dotY` being the place's own: never off the land drawn under it, as far as it is a village's
 * (`share`; a town's is left where its row and its ground put it).
 */
export function footsOf(frame: OutsideFrame, depthPx: number, dotY: number, room: DepthRoom, share = 1): (dx: number, dy: number) => number {
  const near0 = outsideProject(frame, 0, 0).near
  return (dx, dy) => {
    const { x, near } = outsideProject(frame, dx, dy), free = dotY + (near - near0) * depthPx + room.lift(dx, dy)
    return Math.min(room.floor, mixed(free, Math.max(room.top(x), Math.min(room.floor, free)), share))
  }
}/** The y of the place's dot: as it is today where every foot then has room, else the nearest that gives it. */
export function dotYOf(feet: readonly Foot[], depthPx: number, today: number, floor: number): number {
  const { lo, hi } = dotRange(feet, floor, depthPx)
  return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, today))
}