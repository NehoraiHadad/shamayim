import type { P } from './carve'

/*
 * The level base of a cloud: cloud begins at one height, so what hangs under a mass's own slow base line is pressed back to
 * it, and a lone cloud's foot is pressed flat. Pure.
 */

/** A mass up to this tall (px) is a lone cloud; where its foot begins and how far it is pressed. */
const LONE = 96, FROM = 0.62, PRESS = 0.42
/** A larger mass: the px of a column, the half window of its base line (px), how far a tongue under it is pressed. */
const COLUMN = 4, WINDOW = 110, TONGUE = 0.3

export function pressed(loop: readonly P[]): readonly P[] {
  const ys = loop.map((p) => p[1]), top = Math.min(...ys), tall = Math.max(...ys) - top, from = top + FROM * tall
  if (tall <= LONE) return loop.map(([x, y]): P => [x, y > from ? from + PRESS * (y - from) : y])
  const xs = loop.map((p) => p[0]), x0 = Math.min(...xs), many = Math.ceil((Math.max(...xs) - x0) / COLUMN) + 1
  const low = new Array<number>(many).fill(-Infinity)
  for (const [x, y] of loop) { const n = Math.round((x - x0) / COLUMN); low[n] = Math.max(low[n], y) }
  // The base line: the mean of the undersides a window about.
  const half = Math.round(WINDOW / COLUMN), sums = [0], seen = [0]
  low.forEach((y, n) => { sums.push(sums[n] + (y > -Infinity ? y : 0)); seen.push(seen[n] + (y > -Infinity ? 1 : 0)) })
  const base = low.map((_, n) => {
    const a = Math.max(0, n - half), b = Math.min(many, n + half + 1)
    return (sums[b] - sums[a]) / Math.max(1, seen[b] - seen[a])
  })
  return loop.map(([x, y]): P => {
    const u = (x - x0) / COLUMN, n = Math.min(many - 2, Math.floor(u)), b = base[n] + (base[n + 1] - base[n]) * (u - n)
    return [x, y > b ? b + TONGUE * (y - b) : y]
  })
}

/** Whether a point is inside any of the shapes (even-odd over each). */
export function within(shapes: readonly (readonly P[])[], x: number, y: number): boolean {
  return shapes.some((s) => {
    let inside = false
    for (let i = 0, j = s.length - 1; i < s.length; j = i++) {
      const [ax, ay] = s[i], [bx, by] = s[j]
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside
    }
    return inside
  })
}
