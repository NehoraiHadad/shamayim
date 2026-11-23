import type { LayerOf } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { STEPS } from './steps'

/** Dust grains (short streaks along the wind) or a gale's long faint streaks, wrapping round the tile. */
export function paintGrains(ctx: Ctx2D, desc: LayerOf<'grains'>, env: PaintEnv): void {
  const { x: bx, y: by, w } = desc.bounds
  const hair = Math.max(0.5, 1 / env.scale)
  ctx.lineCap = 'round'
  STEPS.forEach((step) => {
    const peak = Math.max(...desc.marks.map((m) => m.alpha), 0.001)
    ctx.beginPath()
    let any = false
    for (const m of desc.marks) {
      const k = m.alpha / peak
      if (k > step || k <= step - 0.25) continue
      for (const dx of [-w, 0, w]) {
        const x = bx + m.x + dx
        if (x + m.len < bx || x > bx + w) continue
        ctx.moveTo(x, by + m.y)
        ctx.lineTo(x + m.len, by + m.y + m.len * 0.04)
        any = true
      }
    }
    if (!any) return
    ctx.lineWidth = Math.max(hair, (desc.marks[0]?.r ?? 0.5) * 1.4)
    ctx.strokeStyle = css(desc.rgb, peak * (step - 0.125))
    ctx.stroke()
  })
}
