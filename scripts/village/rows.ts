import { RING_HOUSES } from '../../src/data/village/tile'

/** Metres east and north. */
export interface Spot { x: number; y: number }
export interface Row { at: number[]; ring: boolean }

/** Houses of one row stand at most this far apart, and a row turns at most this much from house to house. */
const STEP_M = 45
const TURN = 50 * Math.PI / 180

function pairsOf(spots: readonly Spot[]) {
  const pairs: { i: number; j: number; d: number }[] = []
  const byX = spots.map((_, i) => i).sort((a, b) => spots[a].x - spots[b].x || a - b)
  for (let a = 0; a < byX.length; a++) for (let b = a + 1; b < byX.length; b++) {
    const i = Math.min(byX[a], byX[b]), j = Math.max(byX[a], byX[b])
    if (spots[byX[b]].x - spots[byX[a]].x > STEP_M) break
    const d = Math.hypot(spots[j].x - spots[i].x, spots[j].y - spots[i].y)
    if (d <= STEP_M) pairs.push({ i, j, d })
  }
  return pairs.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j)
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
    const a = Math.atan2(spots[i].y - spots[before].y, spots[i].x - spots[before].x)
    const b = Math.atan2(spots[j].y - spots[i].y, spots[j].x - spots[i].x)
    return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) <= TURN
  }
  for (const { i, j } of pairsOf(spots)) {
    if (links[i].length > 1 || links[j].length > 1 || !straight(i, j) || !straight(j, i)) continue
    const a = root(i), b = root(j)
    if (a === b && size[a] < RING_HOUSES) continue
    if (a !== b) { parent[a] = b; size[b] += size[a] }
    links[i].push(j)
    links[j].push(i)
  }
  const seen = new Set<number>(), rows: Row[] = []
  const walk = (start: number, ring: boolean) => {
    const at: number[] = []
    for (let i: number | undefined = start; i !== undefined; i = links[i].find(j => !seen.has(j))) { seen.add(i); at.push(i) }
    if (at.length > 1) rows.push({ at, ring })
  }
  links.forEach((near, i) => { if (near.length < 2 && !seen.has(i)) walk(i, false) })
  links.forEach((_, i) => { if (!seen.has(i)) walk(i, true) })
  return rows.sort((a, b) => b.at.length - a.at.length || a.at[0] - b.at[0])
}
