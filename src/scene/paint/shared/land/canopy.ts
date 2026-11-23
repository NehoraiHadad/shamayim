import type { LayerOf } from '../../../model/types'
import { outline, type Ctx2D, type PaintEnv } from '../base/hand'
import { paintVegCrowns } from './landVegCrowns'
import { paintVegTufts } from './landVegTufts'
import { receiverBrush } from './receiverBrush'

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

/** Paints tufts, crowns, and optional sunlit crown lift in one pass (formless light layer), masked to the plane once. */
export function paintCanopy(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void {
  ctx.save()
  env.shade?.save()
  const wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  const tones = desc.tones, shade = env.shade && desc.shadedTones
  const time = desc.animated?.frames ? env.phase : 0
  const brush = receiverBrush(ctx, env.shade)
  paintVegTufts(brush, desc.vegetation, wind, time, tones?.tufts, shade?.tufts)
  paintVegCrowns(brush, desc.vegetation, wind, time, tones?.trees, shade?.trees)
  mask(ctx, desc)
  ctx.restore()
  if (env.shade) {
    mask(env.shade, desc)
    env.shade.restore()
  }
}
