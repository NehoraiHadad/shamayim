import { hashId } from '../../data/landmarks/hash.ts'
import { rowsOf } from './rows.ts'
import type { Footprint, ProtoHouse, Spot } from './types'

/** Footprint size classes: up to this area (m2), drawn with this mean side (m). */
const SIZES: [number, number][] = [[120, 10.5], [250, 13.5], [600, 18], [Infinity, 28]]
/** A class's long side over its mean side (a house is about 1.35 times as long as wide). */
const ASPECT = Math.sqrt(1.35)
/** Outline houses: no neighbour within this far (km) over this much of the turn; kept this much more often. */
const OUTLINE_KM = .09, OUTLINE_GAP = 130 * Math.PI / 180, OUTLINE_WEIGHT = 3

function onOutline(spots: readonly Spot[], i: number) {
  const p = spots[i]
  const turns = spots.filter((q, j) => j !== i && Math.hypot(q.dx - p.dx, q.dy - p.dy) <= OUTLINE_KM)
    .map(q => Math.atan2(q.dy - p.dy, q.dx - p.dx)).sort((a, b) => a - b)
  if (turns.length < 2) return true
  const gaps = turns.map((a, k) => k ? a - turns[k - 1] : a + 2 * Math.PI - turns[turns.length - 1])
  return Math.max(...gaps) >= OUTLINE_GAP
}

/** The frontage (m) the view meets: the class's long side when the footprint runs across the view, else its short. */
function frontOf(f: Footprint) {
  const mean = SIZES.find(([area]) => f.long * f.short <= area)![1]
  return f.angle < 45 || f.angle > 135 ? mean * ASPECT : mean / ASPECT
}

/**
 * (b) Houses from real footprints: the same radical law, thinned along each row (its ends kept, a ring evenly), the
 * outline kept more often; each drawn house is a real one at its true place.
 */
export function chooseFootprints(all: readonly Footprint[], law: number, budget: number): { houses: ProtoHouse[]; total: number; rows: number } {
  const weight = all.map((_, i) => onOutline(all, i) ? OUTLINE_WEIGHT : 1)
  const share = Math.min(all.length / law, budget) / Math.max(1, weight.reduce((a, b) => a + b, 0))
  const rows = rowsOf(all).sort((a, b) => b.at.length - a.at.length)
  const kept: number[] = []
  let carry = 0
  for (const { at, ring } of rows) {
    const want = at.reduce((sum, i) => sum + weight[i], 0) * share + carry
    const m = Math.max(0, Math.min(at.length, Math.round(want)))
    carry = want - m
    if (m === 1) kept.push(at[Math.floor(at.length / 2)])
    else for (let i = 0; i < m; i++) kept.push(at[ring ? Math.floor(i * at.length / m) : Math.round(i * (at.length - 1) / (m - 1))])
  }
  return { total: all.length, rows: rows.filter(r => r.at.length > 3).length,
    houses: kept.map(i => ({ dx: all[i].dx, dy: all[i].dy, frontM: frontOf(all[i]), seed: hashId(`${all[i].dx}:${all[i].dy}`) })) }
}
