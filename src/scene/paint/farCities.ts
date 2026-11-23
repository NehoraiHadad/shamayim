import type { LayerOf } from '../model/types'
import { boxFaces, capDepth, topPlane } from './buildingFaces'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'
import { paintPass } from './paintPass'

/** Averaged town fabric, emerging facets, then lit windows and their halos. */
export function paintFarCities(ctx: Ctx2D, desc: LayerOf<'farCities'>, env: PaintEnv): void {
  const hair = 1 / env.scale
  for (const tier of desc.tiers) {
    for (const { alpha, boxes } of tier.mass) {
      if (!boxes.length) continue
      ctx.beginPath()
      for (const m of boxes) ctx.rect(m.x, m.y, m.w, m.h)
      ctx.fillStyle = css(tier.unresolved, alpha)
      ctx.fill()
    }
    if (!tier.blocks.length) continue
    // The same base footprint stays under the detail at every size.
    ctx.beginPath()
    for (const b of tier.blocks) ctx.rect(b.x, b.base - b.h, Math.max(hair, b.w), Math.max(hair, b.h))
    ctx.fillStyle = css(tier.unresolved, .86)
    ctx.fill()
    for (const b of tier.blocks) {
      const { detail } = b
      if (!detail) continue
      const faces = { ...tier.resolved[b.receiver], unresolved: tier.unresolved }
      const y = b.base - b.h, cap = capDepth(b.w, b.h, env.scale)
      ctx.save()
      ctx.globalAlpha *= detail
      boxFaces(ctx, b.x, y + cap, b.w, b.h - cap, faces, 1, 0)
      topPlane(ctx, b.x, y, b.w, cap, mix(tier.unresolved, faces.top, .65))
      ctx.restore()
    }
  }
  if (desc.lights.length) paintPass(ctx, 'emission', () => paintCityLights(ctx, desc, hair))
}

function paintCityLights(ctx: Ctx2D, desc: LayerOf<'farCities'>, hair: number) {
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
