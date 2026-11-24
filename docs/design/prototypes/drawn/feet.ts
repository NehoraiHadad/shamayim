import { rng } from '../../../../src/scene/paint/shared/base/core'
import type { Ctx2D, PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import type { RGB } from '../../../../src/scene/model/types'
import { inMasses, type Outline } from './billow'
import { carve, type P } from './carve'
import type { Frame } from './contour'

/*
 * The undersides of a mass: ink wiped up from every edge that looks down, as one smooth field, and a few level cuts in the
 * lowest part. Pure: the outlines and the seed.
 */

/** Field px; how deep a foot's ink goes against the cloud over it; how it falls off; how it is eased (cells). */
const CELL = 2, DEEP = 0.4, FALL = 1.3, EASE = [2.5, 0.7] as const
/** The least height of a mass whose foot is cut (px). */
const CUT = 14

/** The foot's ink, its cuts' ink, how strong, and the most it rises at a height (px). */
export interface Feet { ink: RGB; line: string; strength: number; seed: number; most: (y: number) => number }

export function feet(ctx: Ctx2D, loops: readonly Outline[], f: Frame, o: Feet, env: PaintEnv): void {
  const cols = Math.ceil(f.w / CELL) + 1, rows = Math.ceil(f.h / CELL) + 1, buf = new Float32Array(cols * rows * 4)
  for (const l of loops) {
    for (const [i, a, b] of runs(l, f.x, cols)) {
      const deep = Math.min(o.most(b), DEEP * (b - a))
      if (deep < 1.5) continue
      for (let j = Math.max(0, Math.floor((b - deep - f.y) / CELL)); j < Math.min(rows, (b - f.y) / CELL + 2); j++) {
        const n = (j * cols + i) * 4 + 3
        buf[n] = Math.max(buf[n], Math.min(1, Math.max(0, 1 - (b - f.y - j * CELL) / deep)) ** FALL)
      }
    }
  }
  soften(buf, cols, rows, Array<number>(rows).fill(EASE[0]), Array<number>(rows).fill(EASE[1]))
  const wash = env.canvas(cols, rows), image = wash.ctx.createImageData(cols, rows), [r, g, b] = o.ink.map((c) => Math.round(c * 255))
  for (let n = 0; n < cols * rows; n++) image.data.set([r, g, b, Math.min(1, buf[n * 4 + 3] * o.strength) * 255], n * 4)
  wash.ctx.putImageData(image, 0, 0)
  inMasses(ctx, loops, () => {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(wash.canvas, 0, 0, cols, rows, f.x - CELL / 2, f.y - CELL / 2, cols * CELL, rows * CELL)
    ctx.fillStyle = o.line
    loops.forEach(({ shape }, l) => cuts(ctx, shape, o.seed + l * 211))
  })
}

/** Each column's runs of cloud, top and foot, from the outline itself. */
function runs({ shape, holes }: Outline, x0: number, cols: number): [number, number, number][] {
  const cross: number[][] = Array.from({ length: cols }, () => [])
  for (const s of [shape, ...holes]) {
    s.forEach(([ax, ay], n) => {
      const [bx, by] = s[(n + 1) % s.length], from = Math.min(ax, bx), to = Math.max(ax, bx)
      for (let i = Math.max(0, Math.ceil((from - x0) / CELL)); i < cols && x0 + i * CELL < to; i++) {
        cross[i].push(ay + ((by - ay) * (x0 + i * CELL - ax)) / (bx - ax))
      }
    })
  }
  return cross.flatMap((ys, i) => {
    ys.sort((a, b) => a - b)
    return Array.from({ length: ys.length >> 1 }, (_, k): [number, number, number] => [i, ys[k * 2], ys[k * 2 + 1]])
  })
}

function cuts(ctx: Ctx2D, shape: readonly P[], seed: number) {
  const xs = shape.map((p) => p[0]), ys = shape.map((p) => p[1]), x0 = Math.min(...xs), wide = Math.max(...xs) - x0
  const foot = Math.max(...ys), tall = foot - Math.min(...ys)
  if (tall <= CUT) return
  const r = rng(seed), many = Math.min(8, 2 + Math.round(tall / 22))
  ctx.beginPath()
  for (let n = 0; n < many; n++) {
    const u = n / many, y = foot - (0.05 + 0.24 * u) * Math.min(tall, 90), long = wide * (0.14 + 0.3 * r()) * (1 - 0.5 * u), x = x0 + r() * (wide - long)
    carve(ctx, [0, 0.25, 0.5, 0.75, 1].map((k): P => [x + k * long, y + Math.sin(k * 3 + n) * 0.5]), 0.6, seed + n, 0.9)
  }
  ctx.fill()
}
