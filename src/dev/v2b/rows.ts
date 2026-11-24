import type { Spot } from './types'

/** Houses of one row stand at most this far apart (km), and a row turns at most this much from house to house. */
const STEP_KM = .045, TURN = 50 * Math.PI / 180
/** A row may close on itself (a ring) from this many houses. */
const RING = 8

export interface Row { at: number[]; ring: boolean }

function pairsOf(spots: readonly Spot[]) {
  const pairs: { i: number; j: number; d: number }[] = []
  const byX = spots.map((_, i) => i).sort((a, b) => spots[a].dx - spots[b].dx)
  for (let a = 0; a < byX.length; a++) for (let b = a + 1; b < byX.length; b++) {
    const i = byX[a], j = byX[b]
    if (spots[j].dx - spots[i].dx > STEP_KM) break
    const d = Math.hypot(spots[j].dx - spots[i].dx, spots[j].dy - spots[i].dy)
    if (d <= STEP_KM) pairs.push({ i, j, d })
  }
  return pairs.sort((a, b) => a.d - b.d)
}

/** Rows of houses: nearest pairs first, each house at most two neighbours, a row never turning sharply. */
export function rowsOf(spots: readonly Spot[]): Row[] {
  const links: number[][] = spots.map(() => [])
  const parent = spots.map((_, i) => i), size = spots.map(() => 1)
  const root = (i: number) => {
    let at = i
    while (parent[at] !== at) at = parent[at] = parent[parent[at]]
    return at
  }
  const straight = (i: number, j: number) => {
    const before = links[i][0]
    if (before === undefined) return true
    const a = Math.atan2(spots[i].dy - spots[before].dy, spots[i].dx - spots[before].dx)
    const b = Math.atan2(spots[j].dy - spots[i].dy, spots[j].dx - spots[i].dx)
    return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) <= TURN
  }
  for (const { i, j } of pairsOf(spots)) {
    if (links[i].length > 1 || links[j].length > 1 || !straight(i, j) || !straight(j, i)) continue
    const a = root(i), b = root(j)
    if (a === b && size[a] < RING) continue
    if (a !== b) { parent[a] = b; size[b] += size[a] }
    links[i].push(j)
    links[j].push(i)
  }
  const seen = new Set<number>(), out: Row[] = []
  const walk = (start: number, ring: boolean) => {
    const at: number[] = []
    for (let i: number | undefined = start; i !== undefined; i = links[i].find(j => !seen.has(j))) { seen.add(i); at.push(i) }
    out.push({ at, ring })
  }
  links.forEach((l, i) => { if (l.length < 2 && !seen.has(i)) walk(i, false) })
  links.forEach((_, i) => { if (!seen.has(i)) walk(i, true) })
  return out
}
