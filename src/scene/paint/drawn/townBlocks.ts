import type { OutsideItem } from '../../model/types'
import { rng } from '../shared/base/core'

/*
 * The drawn town's bodies: the model's own built squares gathered into blocks big enough to carry a lit plane, a shade
 * plane and a roof. A square already that big keeps its own; the small ones of one spot (its place across and its row up
 * the slope) become one block of their width and mean height, and what rises over it in them stands up from it, so the
 * town's outline, height and rows stay the data's. Pure: the items alone, gathered once.
 */

export type Box = Extract<OutsideItem, { kind: 'box' }>
export interface Block {
  x: number; w: number; top: number; foot: number; tier: number; seed: number; storeys: number
  roof: Box['roof']; heater: boolean; beyond: boolean
  /** A tile roof's pitch: its rise against the width, and its ridge's share of the width (the house's type). */
  hip: number; ridge: number
  /** Too low to stand as a body: a flat patch of roof tone on the ground, no key line. */
  low: boolean
}
/** Back to front: a block, or the item as the model gives it. */
type TownBody = { block: Block; item: null } | { block: null; item: Exclude<OutsideItem, Box> }

/** A square keeps its own body from this width and height (px); a tile roof always does. */
const OWN_W = 2.9, OWN_H = 2.8
/** The places across a row (px): a terrace of a few houses, a long one or a short one, never one width stamped along it;
 *  a row's height up the slope (px). */
const ACROSS = [3.6, 5.2, 7.4, 10.5] as const, ROW = 2.6
/** Where the rows' places start (px): left of the widest view. */
const FROM = -40
/** A block's least width; how far it fills out squares that stand apart. */
const LEAST_W = 2.2, FILL = 1.15
/** What rises over its block: from this share of its height and this much (px) over it. */
const RISES = 1.3, RISES_BY = 1.6
/** A body under this height (px) is a flat patch; the least height a standing body is given (px); the longest a body may
 *  be against its height (a longer one is a terrace of several); how much a terrace's houses differ in height. */
const FOLD = 0.8, LEAST_H = 1.4, PLANK = 2.5, TERRACE_VARY = 0.12
/** A terrace this low (px) is a row of small houses apart, not one terrace: the gap between them (px), how much more
 *  they differ in height. */
const SMALL = 2.5, APART = 0.5, SMALL_VARY = 0.3
/** A tile roof's pitch where no type is given, and its ridge. */
const HIP = 0.4, RIDGE = 0.3
/** A tile roof's height at most (px), and over its pitch (px). */
const HIP_MAX = 2.6, HIP_OVER = 0.3

/**
 * The village house types, as an illustrator keeps a few for a hill of houses: their width and height against the
 * data's, their roof's pitch and ridge (no pitch: a flat roof), and how often each stands.
 */
const HOUSES = [
  { w: 1, h: 1, hip: 0.4, ridge: 0.3, share: 0.34 },
  { w: 0.86, h: 1.14, hip: 0.56, ridge: 0.16, share: 0.26 },
  { w: 1.18, h: 0.9, hip: 0.27, ridge: 0.5, share: 0.22 },
  { w: 1.06, h: 0.96, hip: 0, ridge: 0, share: 0.18 },
] as const

const gathered = new WeakMap<readonly OutsideItem[], TownBody[]>()

export function townBodies(items: readonly OutsideItem[]): TownBody[] {
  const held = gathered.get(items)
  if (held) return held
  const cells = new Map<string, { at: number; boxes: Box[] }>()
  const out: { at: number; body: TownBody }[] = []
  items.forEach((item, at) => {
    if (item.kind !== 'box') return out.push({ at, body: { block: null, item } })
    if (item.roof === 'tile' || (item.w >= OWN_W && item.foot - item.top >= OWN_H)) {
      for (const block of own(item)) out.push({ at, body: { block, item: null } })
      return
    }
    const key = cellOf(item), cell = cells.get(key)
    if (cell) { cell.boxes.push(item); cell.at = at } else cells.set(key, { at, boxes: [item] })
  })
  for (const { at, boxes } of cells.values()) for (const block of blocksOf(boxes)) out.push({ at, body: { block, item: null } })
  out.sort((a, b) => a.at - b.at)
  const bodies = out.map((o) => o.body)
  gathered.set(items, bodies)
  return bodies
}

/** A square that keeps its own body: a house one of the village's types, a block as it stands. */
function own(b: Box): Block[] {
  const block: Block = { ...b, beyond: Boolean(b.beyond), hip: HIP, ridge: RIDGE, low: false }
  if (b.roof !== 'tile') return stood(block)
  let pick = rng(b.seed ^ 0x40e5)(), type: (typeof HOUSES)[number] = HOUSES[0]
  for (const t of HOUSES) { type = t; if ((pick -= t.share) < 0) break }
  const h = (b.foot - b.top) * type.h
  return stood({ ...block, w: b.w * type.w, top: b.foot - h, hip: type.hip, ridge: type.ridge,
    roof: type.hip ? 'tile' : 'flat', heater: !type.hip && (b.seed & 1) === 1 })
}

/**
 * A body as it can stand in the print: too low, a flat patch; else at least its least height, and a long one cut into a
 * terrace of houses, each a little its own height (seeded), so no plank lies along the hill.
 */
function stood(b: Block): Block[] {
  const h = b.foot - b.top
  if (h < FOLD) return [{ ...b, low: true }]
  const tall = Math.max(LEAST_H, h)
  const n = b.roof === 'tile' ? 1 : Math.max(1, Math.min(Math.ceil(b.w / (PLANK * tall)), Math.floor(b.w / LEAST_W)))
  if (n === 1) return [{ ...b, top: b.foot - tall }]
  const r = rng(b.seed ^ 0x51ab), pw = b.w / n, x0 = b.x - b.w / 2, small = tall < SMALL
  const gap = small ? APART : 0, vary = small ? SMALL_VARY : TERRACE_VARY
  return Array.from({ length: n }, (_, i) => ({ ...b, x: x0 + pw * (i + 0.5), w: pw - gap, seed: (b.seed + i * 0x9e37) >>> 0,
    top: b.foot - Math.max(LEAST_H, tall * (1 + vary * (2 * r() - 1))) }))
}

/** A tile roof's rise over its eave (px). */
export const riseOf = (b: Pick<Block, 'w' | 'hip'>) => Math.min(HIP_MAX, b.hip * b.w + HIP_OVER)

/** The spot a square belongs to: its row, and its place along it (each row's places are its own widths). */
function cellOf(b: Box): string {
  const row = Math.floor(b.foot / ROW), cuts = rowCuts(row)
  let place = 0, to = cuts.length
  while (place < to) { const mid = (place + to) >> 1; if (cuts[mid] <= b.x) place = mid + 1; else to = mid }
  return `${b.beyond ? 1 : 0}:${row}:${place}`
}

const cutsOf = new Map<number, number[]>()

/** A row's cuts between its places: seeded by the row alone, so a row is the same terraces whatever else stands. */
function rowCuts(row: number): number[] {
  let cuts = cutsOf.get(row)
  if (cuts) return cuts
  const r = rng(0x7e44 + row * 131)
  cuts = []
  for (let x = FROM + ACROSS[3] * r(); x < 2400; x += ACROSS[Math.floor(r() * ACROSS.length)]) cuts.push(x)
  cutsOf.set(row, cuts)
  return cuts
}

function blocksOf(boxes: readonly Box[]): Block[] {
  const area = boxes.reduce((sum, b) => sum + b.w, 0)
  const height = boxes.reduce((sum, b) => sum + b.w * (b.foot - b.top), 0) / area
  const tall = boxes.filter((b) => b.foot - b.top > Math.max(RISES * height, height + RISES_BY))
  const body = stood(blockOf(boxes, height))
  if (!tall.length || tall.length === boxes.length) return body
  const tallArea = tall.reduce((sum, b) => sum + b.w, 0)
  const riser = stood(blockOf(tall, tall.reduce((sum, b) => sum + b.w * (b.foot - b.top), 0) / tallArea))
  return [...riser, ...body]
}

/** One block for squares that stand together: from the first to the last, or no wider than they fill. */
function blockOf(boxes: readonly Box[], height: number): Block {
  const left = Math.min(...boxes.map((b) => b.x - b.w / 2)), right = Math.max(...boxes.map((b) => b.x + b.w / 2))
  const area = boxes.reduce((sum, b) => sum + b.w, 0)
  const w = Math.max(LEAST_W, Math.min(right - left, FILL * area))
  const mean = boxes.reduce((sum, b) => sum + b.w * b.x, 0) / area
  const foot = Math.max(...boxes.map((b) => b.foot)), first = boxes[0]
  const flat = boxes.filter((b) => b.roof).length * 2 > boxes.length
  return {
    x: Math.min(Math.max(mean, left + w / 2), Math.max(left + w / 2, right - w / 2)), w, foot, top: foot - height,
    tier: boxes[boxes.length >> 1].tier, seed: first.seed, beyond: Boolean(first.beyond),
    storeys: Math.max(1, Math.round(boxes.reduce((sum, b) => sum + b.w * b.storeys, 0) / area)),
    roof: flat ? 'flat' : null, heater: flat && boxes.some((b) => b.heater), hip: HIP, ridge: RIDGE, low: false,
  }
}

/** The ground's bins across (px). */
const BIN = 1
const grounds = new WeakMap<readonly TownBody[], (x: number) => number | undefined>()

/**
 * Where the town meets its ground across the view: the foot of its frontmost body at each x, run straight over the gaps
 * between them. Where a hill falls across the town its front row steps down it, and this line is that hill. Pure: the
 * bodies alone, found once.
 */
export function townGround(bodies: readonly TownBody[]): (x: number) => number | undefined {
  const held = grounds.get(bodies)
  if (held) return held
  const feet = new Map<number, number>()
  for (const { block, item } of bodies) {
    const span = block ? (block.beyond || block.low ? null : [block.x - block.w / 2, block.x + block.w / 2, block.foot])
      : item.kind === 'tower' ? [item.x - item.w / 2, item.x + item.w / 2, item.base] : null
    if (!span) continue
    for (let n = Math.floor(span[0] / BIN); n <= Math.floor(span[1] / BIN); n++) feet.set(n, Math.max(feet.get(n) ?? -Infinity, span[2]))
  }
  const bins = [...feet.keys()].sort((a, b) => a - b)
  const ground = (x: number) => {
    if (!bins.length) return undefined
    const n = Math.floor(x / BIN)
    const own = feet.get(n)
    if (own !== undefined) return own
    if (n < bins[0] || n > bins[bins.length - 1]) return undefined
    let lo = 0, hi = bins.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (bins[mid] < n) lo = mid; else hi = mid }
    const a = bins[lo], b = bins[hi], u = (n - a) / (b - a)
    return feet.get(a)! + (feet.get(b)! - feet.get(a)!) * u
  }
  grounds.set(bodies, ground)
  return ground
}
