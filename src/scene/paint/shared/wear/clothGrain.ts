import type { WearItem } from '../../../model/types'
import { rng } from '../base/core'
import { css, type Ctx2D } from '../base/hand'
import type { Grain } from './shape'

/** The cloth's grain at a low alpha, seeded: a weave, a knit's rows of stitches, a coat's twill, nylon's sheen, straw. */
export function grainOf(ctx: Ctx2D, it: WearItem, grain: Grain, x0: number, x1: number, y1: number, px: number) {
  if (grain === 'none') return
  const r = rng(it.seed)
  const t = it.tones
  ctx.lineWidth = Math.max(0.35, 0.8 * px)
  ctx.beginPath()
  if (grain === 'weave') {
    for (let y = 1.5; y < y1; y += 1.7) {
      for (let x = x0 + r() * 2; x < x1; x += 2 + 1.6 * r()) { ctx.moveTo(x, y + r() * 0.4); ctx.lineTo(x + 0.9 + 0.6 * r(), y + r() * 0.4) }
    }
    ctx.strokeStyle = css(t.shade, 0.16)
  } else if (grain === 'knit') {
    for (let y = 2; y < y1; y += 1.9) {
      for (let x = x0 + (y % 2); x < x1; x += 1.8) { ctx.moveTo(x - 0.55, y - 0.5); ctx.lineTo(x, y + 0.35); ctx.lineTo(x + 0.55, y - 0.5) }
    }
    ctx.strokeStyle = css(t.shade, 0.26)
  } else if (grain === 'twill') {
    for (let x = x0 - y1; x < x1; x += 1.5 + 0.4 * r()) { ctx.moveTo(x, 0); ctx.lineTo(x + y1 * 0.55, y1) }
    ctx.strokeStyle = css(t.shade, 0.14)
  } else if (grain === 'straw') {
    for (let y = 1; y < y1; y += 1.25) { ctx.moveTo(x0, y); ctx.lineTo(x1, y + (r() - 0.5) * 0.4) }
    ctx.strokeStyle = css(t.shade, 0.22)
  } else {
    // Nylon: a few long soft creases catching the light.
    for (let i = 0; i < 5; i++) {
      const x = x0 + (x1 - x0) * (0.15 + 0.7 * r()), y = 3 + (y1 - 6) * r()
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1.5 * (r() - 0.5), y + 3, x + 2 * (r() - 0.5), y + 6 + 4 * r())
    }
    ctx.strokeStyle = css(t.lit, 0.35 + 0.35 * it.shine)
  }
  ctx.stroke()
}
