import type { LayerOf } from '../model/types'
import { outline, type Ctx2D, type PaintEnv } from './hand'
import { paintVegCrowns } from './landVegCrowns'
import { paintVegLight } from './landVegLight'
import { paintVegTufts } from './landVegTufts'

/** Both passes use the same plane mask and avoid the label zones when a mark bends into them. */
function mask(ctx: Ctx2D, desc: LayerOf<'canopy'>) {
  for (const zone of desc.clear) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
  }
  ctx.globalCompositeOperation = 'destination-in'
  outline(ctx, desc.outline)
  ctx.fillStyle = '#000'
  ctx.fill()
}

export function paintCanopy(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void {
  ctx.save()
  const wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  paintVegTufts(ctx, desc.vegetation, wind, env.phase)
  paintVegCrowns(ctx, desc.vegetation, wind, env.phase)
  mask(ctx, desc)
  ctx.restore()
}

export function paintCanopyLight(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void {
  if (!desc.lift) return
  ctx.save()
  const wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  paintVegLight(ctx, desc.vegetation, desc.lift, wind, env.phase)
  mask(ctx, desc)
  ctx.restore()
}
