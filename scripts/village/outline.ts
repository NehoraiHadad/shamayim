import type { Spot } from './rows'

/** A house is at the edge when no house stands within this far of it… */
const REACH_M = 90
/** …over this much of the directions round it. */
const GAP = 130 * Math.PI / 180

/** Which houses stand at the settlement's edge. */
export function outlineOf(spots: readonly Spot[]): boolean[] {
  const squares = new Map<string, number[]>()
  const cell = (v: number) => Math.floor(v / REACH_M)
  spots.forEach(({ x, y }, i) => {
    const key = `${cell(x)}:${cell(y)}`
    squares.set(key, [...squares.get(key) ?? [], i])
  })
  return spots.map(({ x, y }, i) => {
    const angles: number[] = []
    for (let c = -1; c <= 1; c++) for (let r = -1; r <= 1; r++) {
      for (const j of squares.get(`${cell(x) + c}:${cell(y) + r}`) ?? []) {
        const dx = spots[j].x - x, dy = spots[j].y - y
        if (j !== i && Math.hypot(dx, dy) <= REACH_M) angles.push(Math.atan2(dy, dx))
      }
    }
    if (angles.length < 2) return true
    angles.sort((a, b) => a - b)
    return angles.some((angle, k) => (angles[k + 1] ?? angles[0] + 2 * Math.PI) - angle >= GAP)
  })
}
