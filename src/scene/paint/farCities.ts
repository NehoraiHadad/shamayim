import type { LayerOf } from '../model/types'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * The far towns in the enriched hand. MEDIUM: the scene's flat opaque bodies, one-sided light, haze by distance, no
 * outlines. ORDER, far tier to near: each tier's mass (the town as the eye resolves it, soft-edged by its strength steps),
 * the blocks in shade, then their faces toward the light (a narrow lit strip on the light's side; under a sky with no
 * side, the blocks take the mean of lit and shade); last the lit windows by night, each a point with a faint halo. One
 * path per tone, so a town of a thousand blocks is a handful of fills.
 */
export function paintFarCities(ctx: Ctx2D, desc: LayerOf<'farCities'>, env: PaintEnv): void {
  const hair = 1 / env.scale
  for (const tier of desc.tiers) {
    // The town's mass in the mean of its lit and shaded stone, one fill per strength step.
    const stone = mix(tier.lit, tier.shade, 0.45)
    for (const { alpha, boxes } of tier.mass) {
      if (!boxes.length) continue
      ctx.beginPath()
      for (const m of boxes) ctx.rect(m.x, m.y, m.w, m.h)
      ctx.fillStyle = css(stone, alpha)
      ctx.fill()
    }
    if (!tier.blocks.length) continue
    ctx.beginPath()
    for (const b of tier.blocks) ctx.rect(b.x, b.base - b.h, Math.max(hair, b.w), Math.max(hair, b.h))
    ctx.fillStyle = css(desc.litSide ? tier.shade : tier.lit, desc.litSide ? 1 : 0.85)
    ctx.fill()
    if (!desc.litSide) continue
    ctx.beginPath()
    for (const b of tier.blocks) {
      // The lit face: the half of the block toward the light (against the light a rim), at least a device px.
      const w = Math.max(hair, b.w * (desc.litFace ?? 0.55))
      ctx.rect(desc.litSide === 'left' ? b.x : b.x + b.w - w, b.base - b.h, w, Math.max(hair, b.h))
    }
    ctx.fillStyle = css(tier.lit)
    ctx.fill()
  }
  if (!desc.lights.length) return
  // Lights by strength (four steps), each with a halo of three times its size.
  const steps = [0.25, 0.5, 0.75, 1]
  const peak = Math.max(...desc.lights.map((l) => l.alpha))
  for (const [scale, a] of [[2.6, 0.16], [1, 1]] as const) {
    for (const step of steps) {
      ctx.beginPath()
      let any = false
      for (const l of desc.lights) {
        const k = l.alpha / peak
        if (k > step || k <= step - 0.25) continue
        const r = Math.max(hair * 0.8, l.r * scale)
        ctx.moveTo(l.x + r, l.y)
        ctx.arc(l.x, l.y, r, 0, Math.PI * 2)
        any = true
      }
      if (!any) continue
      ctx.fillStyle = css(desc.lightRgb, peak * (step - 0.125) * a)
      ctx.fill()
    }
  }
}
