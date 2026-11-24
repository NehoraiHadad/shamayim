import type { PaintEnv, Scratch } from '../../../../src/scene/paint/shared/base/hand'
import type { Outline } from './billow'
import type { Frame, Grid } from './contour'
import { ease } from './ease'
import { footField, type Feet } from './feet'
import { printed, type CloudInks } from './inks'

/*
 * A mass's one printing of ink, wiped by hand: the model's own light over the whole mass, and the ink of its feet wiped up
 * from every edge that looks down, so that its form reads before any cap is cut. One small raster. Pure.
 */

/** The steps of light an ink is mixed at. */
const STEPS = 255

/** The printing, a px a cell, and where its feet lie (0 … 1, as strong as they are laid). */
export interface Wash { sheet: Scratch; under: Float32Array }

/** `up` is each cell's light (0 foot … 1 lit); cells of `grid` not over `none` hold none and take their neighbours'; a row's light is eased by `soft` (cells). */
export function washOf(loops: readonly Outline[], grid: Grid, none: number, up: Float32Array, soft: readonly number[], f: Frame, inks: CloudInks, o: Feet, env: PaintEnv): Wash {
  const { cols, rows, at } = grid, lit = new Float32Array(cols * rows), on = new Float32Array(cols * rows)
  for (let n = 0; n < at.length; n++) if (at[n] > none) { lit[n] = up[n]; on[n] = 1 }
  ease(lit, cols, rows, soft, soft)
  ease(on, cols, rows, soft, soft)
  const under = footField(loops, f, cols, rows, o)
  const ink = Float32Array.from({ length: (STEPS + 1) * 3 }, (_, n) => printed(inks, Math.floor(n / 3) / STEPS)[n % 3] * 255)
  const [r, g, b] = o.ink.map((c) => c * 255)
  const sheet = env.canvas(cols, rows), image = sheet.ctx.createImageData(cols, rows), px = image.data
  for (let n = 0; n < at.length; n++) {
    const i = 3 * Math.round(STEPS * (on[n] > 1e-3 ? Math.min(1, Math.max(0, lit[n] / on[n])) : 0.5)), k = under[n]
    px[n * 4] = ink[i] + (r - ink[i]) * k
    px[n * 4 + 1] = ink[i + 1] + (g - ink[i + 1]) * k
    px[n * 4 + 2] = ink[i + 2] + (b - ink[i + 2]) * k
    px[n * 4 + 3] = 255
  }
  sheet.ctx.putImageData(image, 0, 0)
  return { sheet, under }
}

/** Lays the printing over its frame (the caller clips to the masses). */
export function layWash(ctx: PaintEnv['shade'] & object, { sheet }: Wash, { cols, rows }: Grid, f: Frame): void {
  const sx = f.w / (cols - 1), sy = f.h / (rows - 1)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(sheet.canvas, 0, 0, cols, rows, f.x - sx / 2, f.y - sy / 2, cols * sx, rows * sy)
}
