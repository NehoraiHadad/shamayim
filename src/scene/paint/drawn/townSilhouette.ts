import type { OutsideItem } from '../../model/types'
import { riseOf, type Block } from './townBlocks'

/*
 * The town's massing as the keyblock cuts it: one key line round the outside of the mass, not round every body in it.
 * The bodies stand back to front; an edge of one is keyed only where it meets the air or the land, takes the lighter
 * one-pixel joint where it stands over a body behind it, and nothing where a body in front of it carries the join (its own
 * joint) or hides it. Pure: the bodies alone, found once.
 */

/** A run along an edge (scene px), keyed or a joint. */
export interface Run { from: number; to: number; key: boolean }
/** A body's runs: its two sides (along y), its head and its foot (along x). */
export interface Edges { left: Run[]; right: Run[]; top: Run[]; foot: Run[] }

type Body = { block: Block; item: null } | { block: null; item: Exclude<OutsideItem, { kind: 'box' }> }
/** A body's ground plan on the screen: its rects (a wall, and a tile roof's middle), in paint order. */
interface Rect { x0: number; x1: number; y0: number; y1: number; at: number }

/** A span past an edge that a body covers: from, to, and whether that body stands behind. */
type Cover = readonly [number, number, boolean]

/** How far past an edge the mass is looked for (px); the bins the rects are kept in (px square). */
const PAST = 0.3, BIN = 8
/** The share of a tile roof's rise, and of its width, that hides what is behind it. */
const ROOF_RISE = 0.6, ROOF_W = 0.6

const found = new WeakMap<readonly Body[], Map<Block, Edges>>()

export function townEdges(bodies: readonly Body[]): Map<Block, Edges> {
  const held = found.get(bodies)
  if (held) return held
  const rects: Rect[] = []
  bodies.forEach(({ block, item }, at) => {
    if (block) {
      if (block.low) return
      const x0 = block.x - block.w / 2, x1 = block.x + block.w / 2
      rects.push({ x0, x1, y0: block.top, y1: block.foot, at })
      if (block.roof === 'tile') {
        const half = (block.w * ROOF_W) / 2
        rects.push({ x0: block.x - half, x1: block.x + half, y0: block.top - riseOf(block) * ROOF_RISE, y1: block.top, at })
      }
    } else if (item.kind === 'tower') rects.push({ x0: item.x - item.w / 2, x1: item.x + item.w / 2, y0: item.base - item.h, y1: item.base, at })
  })
  // The rects in square bins across and up, so an edge looks only at what stands near it.
  const bins = new Map<number, Rect[]>(), key = (i: number, j: number) => i * 4096 + j
  for (const r of rects) {
    for (let i = Math.floor(r.x0 / BIN); i <= Math.floor(r.x1 / BIN); i++) for (let j = Math.floor(r.y0 / BIN); j <= Math.floor(r.y1 / BIN); j++) {
      let bin = bins.get(key(i, j))
      if (!bin) bins.set(key(i, j), bin = [])
      bin.push(r)
    }
  }
  /** What stands past an edge in `x0`…`x1` × `y0`…`y1`: each rect once (in the first bin it shares with it), not the body's own. */
  const near = (x0: number, x1: number, y0: number, y1: number, at: number, take: (r: Rect) => void) => {
    const i0 = Math.floor(x0 / BIN), j0 = Math.floor(y0 / BIN)
    for (let i = i0; i <= Math.floor(x1 / BIN); i++) for (let j = j0; j <= Math.floor(y1 / BIN); j++) {
      for (const r of bins.get(key(i, j)) ?? []) {
        if (r.at !== at && i === Math.max(i0, Math.floor(r.x0 / BIN)) && j === Math.max(j0, Math.floor(r.y0 / BIN))) take(r)
      }
    }
  }
  const edges = new Map<Block, Edges>()
  bodies.forEach(({ block }, at) => {
    if (!block || block.low) return
    const x0 = block.x - block.w / 2, x1 = block.x + block.w / 2, { top, foot } = block
    const upright = (x: number) => {
      const covers: Cover[] = []
      near(x, x, top, foot, at, (r) => { if (r.x0 < x && x < r.x1 && r.y1 > top && r.y0 < foot) covers.push([r.y0, r.y1, r.at < at]) })
      return runs(top, foot, covers)
    }
    const level = (y: number) => {
      const covers: Cover[] = []
      near(x0, x1, y, y, at, (r) => { if (r.y0 < y && y < r.y1 && r.x1 > x0 && r.x0 < x1) covers.push([r.x0, r.x1, r.at < at]) })
      return runs(x0, x1, covers)
    }
    edges.set(block, { left: upright(x0 - PAST), right: upright(x1 + PAST), top: level(top - PAST), foot: level(foot + PAST) })
  })
  found.set(bodies, edges)
  return edges
}

/**
 * The runs of an edge from `a` to `b`, against what stands past it: open, the key; over a body behind, a joint; a body in
 * front, nothing (it carries the join).
 */
function runs(a: number, b: number, covers: readonly Cover[]): Run[] {
  if (!covers.length) return [{ from: a, to: b, key: true }]
  // Most edges in a dense town are wholly hidden by one body in front, or wholly over one behind.
  let whole = false
  for (const [c0, c1, back] of covers) {
    if (c0 <= a && c1 >= b) { if (!back) return []; whole = true }
  }
  if (whole && covers.every(([c0, c1, back]) => back || c1 <= a || c0 >= b)) return [{ from: a, to: b, key: false }]
  // A sweep along the edge: where the bodies in front and behind past it begin and end.
  const events: [number, number, number][] = []
  for (const [c0, c1, back] of covers) {
    if (c1 <= a || c0 >= b) continue
    events.push([Math.max(a, c0), back ? 0 : 1, 1], [Math.min(b, c1), back ? 0 : 1, -1])
  }
  events.sort((p, q) => p[0] - q[0])
  const out: Run[] = [], open = [0, 0]
  let at = a, k = 0
  const lay = (to: number) => {
    if (to - at < 1e-6 || open[1] > 0) return
    const key = open[0] === 0, last = out[out.length - 1]
    if (last && last.key === key && Math.abs(last.to - at) < 1e-6) last.to = to
    else out.push({ from: at, to, key })
  }
  while (k < events.length) {
    const x = events[k][0]
    lay(x)
    at = Math.max(at, x)
    while (k < events.length && events[k][0] === x) { open[events[k][1]] += events[k][2]; k++ }
  }
  lay(b)
  return out
}
