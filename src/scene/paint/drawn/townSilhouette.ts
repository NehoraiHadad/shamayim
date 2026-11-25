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

/** How far past an edge the mass is looked for (px); the bins the rects are kept in across (px). */
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
  const bins = new Map<number, Rect[]>()
  for (const r of rects) for (let n = Math.floor(r.x0 / BIN); n <= Math.floor(r.x1 / BIN); n++) {
    let bin = bins.get(n)
    if (!bin) bins.set(n, bin = [])
    bin.push(r)
  }
  const near = (x0: number, x1: number, at: number) => {
    const out = new Set<Rect>()
    for (let n = Math.floor(x0 / BIN); n <= Math.floor(x1 / BIN); n++) for (const r of bins.get(n) ?? []) if (r.at !== at) out.add(r)
    return out
  }
  const edges = new Map<Block, Edges>()
  bodies.forEach(({ block }, at) => {
    if (!block || block.low) return
    const x0 = block.x - block.w / 2, x1 = block.x + block.w / 2, { top, foot } = block
    const upright = (x: number) => runs(top, foot, [...near(x, x, at)].filter((r) => r.x0 < x && x < r.x1)
      .map((r) => [r.y0, r.y1, r.at < at] as const))
    const level = (y: number) => runs(x0, x1, [...near(x0, x1, at)].filter((r) => r.y0 < y && y < r.y1)
      .map((r) => [r.x0, r.x1, r.at < at] as const))
    edges.set(block, { left: upright(x0 - PAST), right: upright(x1 + PAST), top: level(top - PAST), foot: level(foot + PAST) })
  })
  found.set(bodies, edges)
  return edges
}

/**
 * The runs of an edge from `a` to `b`, against what stands past it: open, the key; over a body behind, a joint; a body in
 * front, nothing (it carries the join).
 */
function runs(a: number, b: number, covers: readonly (readonly [number, number, boolean])[]): Run[] {
  const cuts = [a, b]
  for (const [c0, c1] of covers) {
    if (c0 > a && c0 < b) cuts.push(c0)
    if (c1 > a && c1 < b) cuts.push(c1)
  }
  cuts.sort((p, q) => p - q)
  const out: Run[] = []
  for (let n = 0; n + 1 < cuts.length; n++) {
    const from = cuts[n], to = cuts[n + 1], mid = (from + to) / 2
    if (to - from < 1e-6) continue
    let behind = false, front = false
    for (const [c0, c1, back] of covers) if (c0 <= mid && mid <= c1) { if (back) behind = true; else front = true }
    if (front) continue
    const key = !behind, last = out[out.length - 1]
    if (last && last.key === key && Math.abs(last.to - from) < 1e-6) last.to = to
    else out.push({ from, to, key })
  }
  return out
}
