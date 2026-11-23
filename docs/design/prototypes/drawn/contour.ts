import type { Ctx2D } from '../../../../src/scene/paint/shared/base/hand'

/*
 * Cut shapes from a field: the closed outline of everywhere a grid stands over a level (marching squares, linear on each
 * edge, loops joined and rounded), as a path in the caller's px. Crisp at any scale: the grid only places the edge.
 * Holes turn the other way, so one non-zero fill leaves them open. Pure.
 */

export interface Grid { cols: number; rows: number; at: Float32Array }
export interface Frame { x: number; y: number; w: number; h: number }

/** Adds the outline of `grid > level` to the current path; `least` drops loops with fewer points. */
export function traceOver(ctx: Ctx2D, grid: Grid, level: number, f: Frame, least = 6): void {
  for (const loop of loopsOver(grid, level)) if (loop.length >= least * 2) round(ctx, loop, grid, f)
}

/** Every outline of `grid > level` as eased points in the caller's px, inside on the right. */
export function loopsIn(grid: Grid, level: number, f: Frame, least = 6): [number, number][][] {
  const sx = f.w / (grid.cols - 1), sy = f.h / (grid.rows - 1)
  return loopsOver(grid, level).filter((l) => l.length >= least * 2).map((raw) => {
    const l = eased(raw)
    return Array.from({ length: l.length / 2 }, (_, i): [number, number] => [f.x + Math.min(grid.cols - 1, Math.max(0, l[i * 2])) * sx, f.y + Math.min(grid.rows - 1, Math.max(0, l[i * 2 + 1])) * sy])
  })
}

/** The outline's sides of a cell by its corners' code (top-left 8, top-right 4, foot-right 2, foot-left 1), inside on the right. */
const TOP = 0, RIGHT = 1, FOOT = 2, LEFT = 3
const SIDES: readonly (readonly number[])[] = [
  [], [LEFT, FOOT], [FOOT, RIGHT], [LEFT, RIGHT], [RIGHT, TOP], [LEFT, TOP, RIGHT, FOOT], [FOOT, TOP], [LEFT, TOP],
  [TOP, LEFT], [TOP, FOOT], [TOP, RIGHT, FOOT, LEFT], [TOP, RIGHT], [RIGHT, LEFT], [RIGHT, FOOT], [FOOT, LEFT], [],
]

const EASE = 3

/** Every loop, as grid coordinates; one cell of "below" round the grid closes a shape that meets the frame. */
function loopsOver({ cols, rows, at }: Grid, level: number): number[][] {
  const W = cols + 2, H = rows + 2
  const v = (c: number, r: number) => (c < 1 || r < 1 || c > cols || r > rows ? -1 : at[(r - 1) * cols + c - 1] - level)
  // Each crossed edge holds one point; an edge is keyed by its first node and its direction (0 across, 1 down).
  const next = new Map<number, number>()
  for (let r = 0; r < H - 1; r++) {
    for (let c = 0; c < W - 1; c++) {
      const code = (v(c, r) > 0 ? 8 : 0) | (v(c + 1, r) > 0 ? 4 : 0) | (v(c + 1, r + 1) > 0 ? 2 : 0) | (v(c, r + 1) > 0 ? 1 : 0)
      const sides = SIDES[code], n = r * W + c
      const key = (side: number) => [n << 1, ((n + 1) << 1) | 1, (n + W) << 1, (n << 1) | 1][side]
      for (let i = 0; i < sides.length; i += 2) next.set(key(sides[i]), key(sides[i + 1]))
    }
  }
  const out: number[][] = []
  for (const start of [...next.keys()]) {
    const loop: number[] = []
    for (let k = next.get(start) === undefined ? undefined : start; k !== undefined; ) {
      const to = next.get(k)
      if (to === undefined) break
      next.delete(k)
      const down = k & 1, r = Math.floor((k >> 1) / W), c = (k >> 1) % W
      const p = v(c, r), q = down ? v(c, r + 1) : v(c + 1, r), t = p / (p - q)
      loop.push(c - 1 + (down ? 0 : t), r - 1 + (down ? t : 0))
      k = to
    }
    if (loop.length > 4) out.push(loop)
  }
  return out
}

/** A loop's points each eased toward its neighbours: the grid's own steps are not the hand's. */
function eased(loop: readonly number[]): readonly number[] {
  let at = loop
  for (let pass = 0; pass < EASE; pass++) {
    const was = at, n = was.length
    at = was.map((v, i) => 0.5 * v + 0.25 * (was[(i + n - 2) % n] + was[(i + 2) % n]))
  }
  return at
}

/** A loop as a rounded path: through the middles of its edges, its points as the curves' handles. */
function round(ctx: Ctx2D, raw: readonly number[], { cols, rows }: Grid, f: Frame) {
  const loop = eased(raw), n = loop.length / 2, sx = f.w / (cols - 1), sy = f.h / (rows - 1)
  const X = (i: number) => f.x + Math.min(cols - 1, Math.max(0, loop[(i % n) * 2])) * sx
  const Y = (i: number) => f.y + Math.min(rows - 1, Math.max(0, loop[(i % n) * 2 + 1])) * sy
  ctx.moveTo((X(n - 1) + X(0)) / 2, (Y(n - 1) + Y(0)) / 2)
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2)
  ctx.closePath()
}
