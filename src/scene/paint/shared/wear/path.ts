import type { RGB } from '../../../model/types'
import { css, type Ctx2D } from '../base/hand'

/** Path2D per path string: a pure function of the string, so caching it is legal (as the noise tables are). */
const paths = new Map<string, Path2D>()
export function path(d: string): Path2D {
  let p = paths.get(d)
  if (!p) {
    p = new Path2D(d)
    if (paths.size > 512) paths.clear()
    paths.set(d, p)
  }
  return p
}

export function stroke(ctx: Ctx2D, p: Path2D, rgb: RGB, width: number, alpha: number) {
  ctx.strokeStyle = css(rgb, alpha)
  ctx.lineWidth = width
  ctx.stroke(p)
}
