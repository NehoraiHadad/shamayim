import type { LayerOf } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'

/** Heat shimmer: fine wavering lines of light across the tile, whole waves so the tile lays edge to edge. */
export function paintShimmer(ctx: Ctx2D, desc: LayerOf<'shimmer'>, _env: PaintEnv): void {
  const { x, y, w } = desc.bounds
  ctx.lineWidth = 0.7
  ctx.lineCap = 'round'
  for (const line of desc.lines) {
    ctx.strokeStyle = css(desc.rgb, line.alpha)
    ctx.beginPath()
    for (let i = 0; i <= w; i += 2) {
      const yy = y + line.y + line.amp * Math.sin((2 * Math.PI * line.waves * i) / w + line.phase)
      if (i === 0) ctx.moveTo(x + i, yy)
      else ctx.lineTo(x + i, yy)
    }
    ctx.stroke()
  }
}
