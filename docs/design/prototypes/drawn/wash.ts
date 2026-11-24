import type { Ctx2D, PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import { inMasses, type Outline } from './billow'
import type { Frame, Grid } from './contour'
import { printed, type CloudInks } from './inks'

/*
 * A mass's one printing of ink, wiped by hand: the model's own light over the whole mass, so that its form reads before any
 * cap is cut, and a part without caps is a plain wipe. Pure: the grid, the light on it, the inks.
 */

/** `up` is each cell's light (0 foot … 1 lit); cells of `grid` not over `none` hold none and take their neighbours'; a row's light is eased by `ease` (cells). */
export function wash(ctx: Ctx2D, loops: readonly Outline[], grid: Grid, none: number, up: Float32Array, ease: readonly number[], f: Frame, inks: CloudInks, env: PaintEnv): void {
  const { cols, rows, at } = grid, buf = new Float32Array(cols * rows * 4)
  for (let n = 0; n < at.length; n++) if (at[n] > none) buf.set([up[n], 0, 0, 1], n * 4)
  soften(buf, cols, rows, ease, ease)
  const sheet = env.canvas(cols, rows), image = sheet.ctx.createImageData(cols, rows)
  for (let n = 0; n < at.length; n++) {
    const a = buf[n * 4 + 3], rgb = printed(inks, a > 1e-3 ? buf[n * 4] / a : 0.5)
    image.data.set([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, 255], n * 4)
  }
  sheet.ctx.putImageData(image, 0, 0)
  const sx = f.w / (cols - 1), sy = f.h / (rows - 1)
  inMasses(ctx, loops, () => {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(sheet.canvas, 0, 0, cols, rows, f.x - sx / 2, f.y - sy / 2, cols * sx, rows * sy)
  })
}
