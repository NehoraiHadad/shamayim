import { solarTransmission } from '../model/planeCloudShadow'
import { vegetationLight } from './vegetationLight'
import type { LayerOf } from '../model/types'
import { outline, type Ctx2D, type PaintEnv } from './hand'
import { paintVegCrowns } from './landVegCrowns'
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

/** Paints tufts, crowns, and optional sunlit crown lift in one pass (formless light layer), masked to the plane once. */
export function paintCanopy(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void {
  ctx.save()
  const wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  const toneAt = desc.receiverField && desc.receiverBounds
    ? vegetationLight(desc.vegetation.tones, desc.receiverField, desc.outline, desc.receiverBounds, solarTransmission(desc.cloudShadow, desc.animated?.frames?.from === undefined ? 0 : env.phase))
    : undefined
  paintVegTufts(ctx, desc.vegetation, wind, env.phase, toneAt)
  paintVegCrowns(ctx, desc.vegetation, wind, env.phase, toneAt)
  mask(ctx, desc)
  ctx.restore()
}
