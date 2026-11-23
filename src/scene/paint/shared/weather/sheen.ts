import type { LayerOf } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { STEPS } from './steps'

/** The wet ground's sheen: short level strokes, a brighter core in a fainter glint, sending back the sky. */
export function paintSheen(ctx: Ctx2D, desc: LayerOf<'sheen'>, env: PaintEnv): void {
  const hair = Math.max(0.5, 1 / env.scale)
  for (const [grow, a] of [[1, 0.5], [0.55, 1]] as const) {
    STEPS.forEach((step) => {
      const peak = Math.max(...desc.strokes.map((s) => s.alpha), 0.001)
      ctx.beginPath()
      let any = false
      for (const s of desc.strokes) {
        const k = s.alpha / peak
        if (k > step || k <= step - 0.25) continue
        const w = s.w * grow
        ctx.rect(s.x + (s.w - w) / 2, s.y - hair / 2, w, hair * (grow === 1 ? 1.4 : 1))
        any = true
      }
      if (!any) return
      ctx.fillStyle = css(desc.rgb, peak * (step - 0.125) * a)
      ctx.fill()
    })
  }
}
