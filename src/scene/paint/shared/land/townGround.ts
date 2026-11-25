import type { PlaneTown, Pt } from '../../../model/types'
import { fractal, rng } from '../base/core'

/*
 * The ground of a town, as both hands read it from the near plane's `town`: where the land is lived on (warmer, trodden,
 * with less scrub, fading out past the last houses), and the few marks people leave on it: a lane along the fronts of a
 * row, a yard or a garden in a gap between two houses, a small tree in a garden, a short path down from a gap. Each is
 * sized by the houses beside it, so it shrinks as they do with distance. Pure: the town and a seed.
 *
 * REFERENCE looked at (structure only): hill villages of the Judean and Galilee hills seen across a valley (Karmei Tzur,
 * Rosh Pina, Ein Karem): a pale trodden ground round the houses, olive and fig trees in the yards, a lane as a light line
 * along a row, terraces of houses stepping up the hill, the open hillside's scrub thinning toward the houses.
 */

/** A body standing on the ground: its sides, foot and top (px), and its width. */
export interface Body { x0: number; x1: number; foot: number; top: number; w: number }
/** A light line on the ground (px), its width; `lane` along a row, else a path down from a gap. */
export interface Lane { pts: Pt[]; wide: number; lane: boolean }
/** A patch on the ground: its middle, half width and half depth (px); a trodden yard or a garden. */
export interface Patch { x: number; y: number; rx: number; ry: number; garden: boolean; seed: number }
/** A small tree standing on the ground: its middle, foot, width and height (px). */
export interface Shrub { x: number; base: number; w: number; h: number; seed: number }
export interface TownMarks { lanes: Lane[]; patches: Patch[]; shrubs: Shrub[] }

/** How far round a house the lived-on ground reaches (of its width), across and in depth; the share that is lived on in full. */
const AROUND = 1.7, DEPTH = 0.85, FULL = [0.3, 1.15] as const
/** How far the edge of the lived-on ground wanders (of the share), and the size of its wander (px). */
const WANDER = 0.9, WANDER_PX = 7
/** How far a house's ground reaches, in its own reach across and in depth. */
const REACH = 2.2
/** Two houses are neighbours in a row within this gap (of their width) and this step of their feet (of their width). */
const GAP = [-0.25, 2.6] as const, STEP = 0.4
/** A lane: the least houses in its row, the most it runs, its width (of the houses'), how far in front of the feet it lies. */
const LANE = { least: 3, most: 6, wide: 0.24, front: 0.3, share: 0.34, many: 7 } as const
/** A gap's share that is a yard, a garden; a garden's share with a tree; a path's share and length (of the width). */
const YARD = 0.42, GARDEN = 0.3, TREED = 0.55, PATH = { share: 0.12, long: 1.4, many: 6 } as const
/** The most yards and gardens a town takes: a few, not every gap. */
const PATCHES = 48
/** Trees the model gives a house at which the town is green enough: no small trees are added. */
const GREEN_ENOUGH = 0.45

export function bodiesOf(town: PlaneTown): Body[] {
  const out: Body[] = [], b = town.bodies
  for (let o = 0; o + 3 < b.length; o += 4) out.push({ x0: b[o] - b[o + 1] / 2, x1: b[o] + b[o + 1] / 2, foot: b[o + 2], top: b[o + 3], w: b[o + 1] })
  return out
}

/** A grid of cells `cell` px, its first node at `x`, `y`. */
export interface TownGrid { x: number; y: number; cols: number; rows: number; cell: number }

/**
 * How much of each cell is lived on (0 … 1): every house's ground round it summed, so a lone house is a small yard and a
 * dense quarter one ground, then cut with a wandering edge so the town fades into the hillside in drifts, not a ring.
 */
export function livedOn(bodies: readonly Body[], g: TownGrid, seed: number): Float32Array {
  const sum = new Float32Array(g.cols * g.rows)
  for (const b of bodies) {
    const cx = (b.x0 + b.x1) / 2, cy = b.foot + 0.3 * b.w, rx = AROUND * b.w, ry = DEPTH * b.w
    const i0 = Math.max(0, Math.floor((cx - REACH * rx - g.x) / g.cell)), i1 = Math.min(g.cols - 1, Math.ceil((cx + REACH * rx - g.x) / g.cell))
    const j0 = Math.max(0, Math.floor((cy - REACH * ry - g.y) / g.cell)), j1 = Math.min(g.rows - 1, Math.ceil((cy + REACH * ry - g.y) / g.cell))
    for (let j = j0; j <= j1; j++) {
      const dy = (g.y + j * g.cell - cy) / ry, row = j * g.cols, dy2 = dy * dy
      if (dy2 >= REACH * REACH) continue
      for (let i = i0; i <= i1; i++) {
        const dx = (g.x + i * g.cell - cx) / rx, d = 1 - (dx * dx + dy2) / (REACH * REACH)
        // A bell on its own footing (no exp a cell): about e^-d over its reach, nothing past it.
        if (d > 0) sum[row + i] += d * d * d
      }
    }
  }
  // The wander scales the share (nothing lived on stays so), read only where it can move the edge.
  const low = FULL[0] / (1 + 0.7 * WANDER), high = FULL[1] / (1 - 0.7 * WANDER)
  // The wander is slow: read once a block of cells about 2 px across, shared by its cells.
  const step = Math.max(1, Math.round(2 / g.cell)), wander = new Float32Array(Math.ceil(g.cols / step) * Math.ceil(g.rows / step)).fill(NaN)
  const across = Math.ceil(g.cols / step)
  for (let j = 0, n = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++, n++) {
    const v = sum[n]
    if (v <= low) { sum[n] = 0; continue }
    if (v >= high) { sum[n] = 1; continue }
    const w = Math.floor(j / step) * across + Math.floor(i / step)
    if (Number.isNaN(wander[w])) wander[w] = WANDER * (2 * fractal(seed + 23, g.x + i * g.cell, (g.y + j * g.cell) * 2.2, 1 / WANDER_PX, 1 / WANDER_PX, 1) - 1)
    sum[n] = smooth(FULL[0], FULL[1], v * (1 + wander[w]))
  }
  return sum
}

/** The bounds (px) the lived-on ground can reach. */
export function townExtent(bodies: readonly Body[]): { x0: number; x1: number; y0: number; y1: number } | null {
  if (!bodies.length) return null
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const b of bodies) {
    x0 = Math.min(x0, b.x0 - REACH * AROUND * b.w); x1 = Math.max(x1, b.x1 + REACH * AROUND * b.w)
    y0 = Math.min(y0, b.foot - REACH * DEPTH * b.w); y1 = Math.max(y1, b.foot + (0.3 + REACH * DEPTH) * b.w)
  }
  return { x0, x1, y0, y1 }
}

/** Each house's next in its row to the right, if any: the nearest whose foot steps little. */
function rowsOf(bodies: readonly Body[]): Int32Array {
  const next = new Int32Array(bodies.length).fill(-1), taken = new Uint8Array(bodies.length)
  const order = [...bodies.keys()].sort((a, b) => bodies[a].x0 - bodies[b].x0), widest = Math.max(...bodies.map((b) => b.w))
  order.forEach((a, k) => {
    const A = bodies[a]
    let best = -1, least = Infinity
    for (let m = k + 1; m < order.length; m++) {
      const c = order[m], C = bodies[c]
      if (C.x0 - A.x1 > GAP[1] * widest) break
      const w = (A.w + C.w) / 2, gap = C.x0 - A.x1
      if (taken[c] || C.x0 <= A.x0 || gap < GAP[0] * w || gap > GAP[1] * w || Math.abs(C.foot - A.foot) > STEP * w) continue
      const cost = Math.max(0, gap) + 2 * Math.abs(C.foot - A.foot)
      if (cost < least) { least = cost; best = c }
    }
    if (best >= 0) { next[a] = best; taken[best] = 1 }
  })
  return next
}

/** What stands where: the bodies by the columns (px) they stand over, so a box asks only those near it. */
const BIN = 8
type Standing = { bodies: readonly Body[]; bins: Map<number, number[]> }
function standing(bodies: readonly Body[]): Standing {
  const bins = new Map<number, number[]>()
  bodies.forEach((b, k) => {
    for (let c = Math.floor(b.x0 / BIN); c <= Math.floor(b.x1 / BIN); c++) {
      let bin = bins.get(c)
      if (!bin) bins.set(c, bin = [])
      bin.push(k)
    }
  })
  return { bodies, bins }
}

/** Does a box (px) meet any body but those `but` says to pass? */
function meets({ bodies, bins }: Standing, x0: number, x1: number, y0: number, y1: number, but: (b: Body) => boolean): boolean {
  for (let c = Math.floor(x0 / BIN); c <= Math.floor(x1 / BIN); c++) for (const k of bins.get(c) ?? []) {
    const b = bodies[k]
    if (!but(b) && x1 > b.x0 && x0 < b.x1 && y1 > b.top && y0 < b.foot) return true
  }
  return false
}

/** The seed of a town's marks: its bodies' and trees' own (the first part of its key), so every hand puts them in the same places. */
const seedOf = (town: PlaneTown) => parseInt(town.key.split('.')[0], 36) || 0

/**
 * A hand's measure of the marks: the least width of a lane and depth of a yard (px, so a mark is not lost under its
 * raster), the share of rows with a lane and the most lanes, the share of gaps that are yards, the share of houses with a
 * front tree and how far past its house's sides one may stand (of its width). The drawn hand takes `MARKS`.
 */
export interface MarkMeasure { lane: number; yard: number; rows: number; many: number; yards: number; fronts: number; past: number }
export const MARKS: MarkMeasure = { lane: 0, yard: 0, rows: LANE.share, many: LANE.many, yards: YARD, fronts: 0.12, past: 0 }

/** The town's marks on its ground: few, calm, along its rows. */
export function townMarks(town: PlaneTown, m: MarkMeasure = MARKS): TownMarks {
  const bodies = bodiesOf(town), next = rowsOf(bodies), r = rng(seedOf(town) + 811), stands = standing(bodies)
  const lanes: Lane[] = [], patches: Patch[] = [], shrubs: Shrub[] = []
  const head = new Uint8Array(bodies.length).fill(1)
  next.forEach((n) => { if (n >= 0) head[n] = 0 })
  const green = town.trees.length / 4 / Math.max(1, bodies.length) >= GREEN_ENOUGH
  // The rows, longest first: a lane along the fronts of some.
  const rows: number[][] = []
  head.forEach((h, a) => {
    if (!h) return
    const row = [a]
    while (next[row.at(-1)!] >= 0) row.push(next[row.at(-1)!])
    rows.push(row)
  })
  rows.sort((a, b) => b.length - a.length || bodies[a[0]].x0 - bodies[b[0]].x0)
  const most = Math.min(m.many, Math.max(1, Math.round(rows.filter((row) => row.length >= LANE.least).length * m.rows)))
  for (const row of rows) {
    if (lanes.length >= most || row.length < LANE.least) break
    if (r() > 0.75) continue
    const from = Math.floor(r() * Math.max(1, row.length - LANE.most)), run = row.slice(from, from + LANE.most).map((k) => bodies[k])
    const w = run.reduce((sum, b) => sum + b.w, 0) / run.length, front = (b: Body) => b.foot + LANE.front * b.w
    const pts: Pt[] = [[run[0].x0 - 0.5 * w, front(run[0])], ...run.map((b): Pt => [(b.x0 + b.x1) / 2, front(b)]), [run.at(-1)!.x1 + 0.5 * w, front(run.at(-1)!)]]
    lanes.push({ pts, wide: Math.max(LANE.wide * w, m.lane), lane: true })
  }
  // The gaps between neighbours: a trodden yard, a garden (some with a small tree), or a path down the slope.
  let paths = 0
  next.forEach((n, a) => {
    if (n < 0) return
    const A = bodies[a], B = bodies[n], gap = B.x0 - A.x1, w = (A.w + B.w) / 2, roll = r(), s = Math.floor(r() * 1e6)
    const x = (A.x1 + B.x0) / 2, y = Math.max(A.foot, B.foot) - 0.05 * w, rx = 0.5 * gap * (0.75 + 0.2 * r()), ry = Math.max(0.32 * w, m.yard)
    // None in a narrow gap, past the town's few, or where a nearer house stands over it.
    if (gap < 0.45 * w || patches.length >= PATCHES || meets(stands, x - 0.3 * rx, x + 0.3 * rx, y, y + 0.1, (o) => o === A || o === B)) return
    if (roll < m.yards) patches.push({ x, y, rx, ry, garden: false, seed: s })
    else if (roll < m.yards + GARDEN) {
      patches.push({ x, y, rx, ry, garden: true, seed: s })
      const tw = Math.min(gap * 0.8, w * (0.42 + 0.2 * r())), th = w * (0.55 + 0.3 * r()), base = y + 0.15 * ry
      // A tree only where no house is drawn over it: the houses are printed after the ground, so a tree among them would fall behind.
      if (!green && r() < TREED && !meets(stands, x - tw / 2, x + tw / 2, base - th, base, () => false)) shrubs.push({ x, base, w: tw, h: th, seed: s })
    } else if (roll < m.yards + GARDEN + PATH.share && paths++ < PATH.many) {
      const long = PATH.long * w, lean = (r() - 0.5) * 0.8 * w
      lanes.push({ pts: [[x, y - 0.1 * w], [x + lean * 0.4, y + 0.5 * long], [x + lean, y + long]], wide: Math.max(0.7 * LANE.wide * w, 0.7 * m.lane), lane: false })
    }
  })
  return { lanes, patches, shrubs }
}

/** A small tree's size before a house (of the house's width, of its height; its share of the houses is the measure's `fronts`). */
const FRONT = { wide: [0.5, 0.8], tall: [0.35, 0.55], most: 1.15 } as const

/**
 * Small trees standing in front of a few houses, so the house's foot is hidden as a yard's tree hides it: never where a
 * nearer house would stand over the tree (it is drawn after the houses), fewer where the model's trees are many. Each
 * with the house it stands at (its index in the town's bodies).
 */
export function frontTrees(town: PlaneTown, m: MarkMeasure = MARKS): (Shrub & { at: number })[] {
  const bodies = bodiesOf(town), r = rng(seedOf(town) + 977), out: (Shrub & { at: number })[] = [], stands = standing(bodies)
  const share = m.fronts * Math.max(0, 1 - town.trees.length / 4 / Math.max(1, bodies.length) / GREEN_ENOUGH)
  bodies.forEach((b, at) => {
    const roll = r(), u = r(), wide = r(), tall = r(), seed = Math.floor(r() * 1e6)
    if (roll >= share) return
    const w = b.w * (FRONT.wide[0] + (FRONT.wide[1] - FRONT.wide[0]) * wide), base = b.foot + 0.22 * b.w
    const h = Math.min(FRONT.most * b.w, (b.foot - b.top) * (FRONT.tall[0] + (FRONT.tall[1] - FRONT.tall[0]) * tall), 2.4 * w)
    const x = b.x0 + b.w * (0.2 - m.past + (0.6 + 2 * m.past) * u)
    if (h < 0.6 || meets(stands, x - w / 2, x + w / 2, base - h, base, (o) => o.foot <= b.foot)) return
    out.push({ x, base, w, h, seed, at })
  })
  return out
}

/**
 * The plane's outline with the place's own ground over its crest where the model raises it there (a notch the place
 * bridges): the near plane prints the place's ground itself, in its own inks and light.
 */
export function raisedOutline(outline: Pt[], land: readonly Pt[] | null | undefined): Pt[] {
  if (!land || land.length < 2) return outline
  const x0 = land[0][0], x1 = land.at(-1)![0]
  let k = 0
  // The ridge runs left to right, so the land's segment under it only moves on.
  const top = (x: number) => {
    while (k < land.length - 2 && land[k + 1][0] < x) k++
    const [ax, ay] = land[k], [bx, by] = land[k + 1]
    return ay + (by - ay) * Math.min(1, Math.max(0, (x - ax) / Math.max(1e-6, bx - ax)))
  }
  let raised = false
  // The ridge is the outline but its last two points, the near plane's foot.
  const out = outline.map(([x, y], i): Pt => {
    if (i >= outline.length - 2 || x < x0 || x > x1) return [x, y]
    const t = top(x)
    if (t > y - 0.5) return [x, y]
    raised = true
    return [x, t]
  })
  return raised ? out : outline
}

function smooth(lo: number, hi: number, v: number): number {
  const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}
