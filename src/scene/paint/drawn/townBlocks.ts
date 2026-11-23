import type { OutsideItem } from '../../model/types'

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
}
/** Back to front: a block, or the item as the model gives it. */
export type TownBody = { block: Block; item: null } | { block: null; item: Exclude<OutsideItem, Box> }

/** A square keeps its own body from this width and height (px); a tile roof always does. */
const OWN_W = 2.9, OWN_H = 2.8
/** A block's place across (px) and a row's height up the slope (px). */
const ACROSS = 5.2, ROW = 2.6
/** A block's least width; how far it fills out squares that stand apart. */
const LEAST_W = 2.2, FILL = 1.15
/** What rises over its block: from this share of its height and this much (px) over it. */
const RISES = 1.3, RISES_BY = 1.6

const gathered = new WeakMap<readonly OutsideItem[], TownBody[]>()

export function townBodies(items: readonly OutsideItem[]): TownBody[] {
  const held = gathered.get(items)
  if (held) return held
  const cells = new Map<string, { at: number; boxes: Box[] }>()
  const out: { at: number; body: TownBody }[] = []
  items.forEach((item, at) => {
    if (item.kind !== 'box') return out.push({ at, body: { block: null, item } })
    if (item.roof === 'tile' || (item.w >= OWN_W && item.foot - item.top >= OWN_H)) return out.push({ at, body: own(item) })
    const key = cellOf(item), cell = cells.get(key)
    if (cell) { cell.boxes.push(item); cell.at = at } else cells.set(key, { at, boxes: [item] })
  })
  for (const { at, boxes } of cells.values()) for (const block of blocksOf(boxes)) out.push({ at, body: { block, item: null } })
  out.sort((a, b) => a.at - b.at)
  const bodies = out.map((o) => o.body)
  gathered.set(items, bodies)
  return bodies
}

const own = (b: Box): TownBody => ({ item: null, block: { ...b, beyond: Boolean(b.beyond) } })

/** The spot a square belongs to: its row, and its place along it (each row's places start elsewhere). */
function cellOf(b: Box): string {
  const row = Math.floor(b.foot / ROW)
  return `${b.beyond ? 1 : 0}:${row}:${Math.floor(b.x / ACROSS + ((row * 0.618) % 1))}`
}

function blocksOf(boxes: readonly Box[]): Block[] {
  const area = boxes.reduce((sum, b) => sum + b.w, 0)
  const height = boxes.reduce((sum, b) => sum + b.w * (b.foot - b.top), 0) / area
  const tall = boxes.filter((b) => b.foot - b.top > Math.max(RISES * height, height + RISES_BY))
  const body = blockOf(boxes, height)
  if (!tall.length || tall.length === boxes.length) return [body]
  const tallArea = tall.reduce((sum, b) => sum + b.w, 0)
  const riser = blockOf(tall, tall.reduce((sum, b) => sum + b.w * (b.foot - b.top), 0) / tallArea)
  return [riser, body]
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
    roof: flat ? 'flat' : null, heater: flat && boxes.some((b) => b.heater),
  }
}
