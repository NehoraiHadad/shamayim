import { SCENE_W } from './sceneBox'

/** Where the sea-level line meets the near ridge (px), west then east. */
export interface SeaSpan {
  x1: number
  x2: number
}

/** Fallback span when the ridge never climbs past sea level on a side or the middle stands above sea level (a coast). */
const FALLBACK = { x1: 96, x2: 276 }
/** Run a few px on into the ridge (hidden behind it), so sampling error and the dash rhythm never leave a gap at the flank. */
const TUCK = 6

/**
 * The dashed sea-level line runs out from the valley's middle until it meets the near ridge's flank on each side, so it
 * reads as a datum cut against the hills rather than a floating dash. `points` are the ridge's [x, y] samples, west to east.
 */
export function seaSpan(points: readonly (readonly [number, number])[], seaY: number, midX = SCENE_W / 2): SeaSpan {
  const crossing = (a: readonly [number, number], b: readonly [number, number]) => a[0] + (b[0] - a[0]) * (seaY - a[1]) / (b[1] - a[1])
  // Only a valley that dips below sea level is bounded by flanks; on a coast the ground in the middle is above the line.
  const mid = points.reduce((best, p) => Math.abs(p[0] - midX) < Math.abs(best[0] - midX) ? p : best, points[0])
  if (!mid || mid[1] <= seaY) return FALLBACK
  let x1: number | null = null
  let x2: number | null = null
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]]
    if ((a[1] - seaY) * (b[1] - seaY) > 0 || a[1] === b[1]) continue
    const x = crossing(a, b)
    if (x <= midX) x1 = x
    else if (x2 === null) x2 = x
  }
  return { x1: x1 === null ? FALLBACK.x1 : x1 - TUCK, x2: x2 === null ? FALLBACK.x2 : x2 + TUCK }
}
