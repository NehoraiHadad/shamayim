import type { LayerOf } from '../../../model/types'
import { outline, type Ctx2D, type PaintEnv } from '../base/hand'
import { paintVegCrowns, type Crown } from './landVegCrowns'
import { paintVegTufts } from './landVegTufts'
import { receiverBrush, type ReceiverBrush } from './receiverBrush'

/** A style's own hand on the canopy: the plants' inks as it mixes them, and what it lays over a crown. */
export interface CanopyHand { inks(bytes: Uint8Array): Uint8Array; dress(brush: ReceiverBrush, crown: Crown): void }

/** Both passes use the same plane mask and avoid the spot's clearing when a mark bends into them. */
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
export function paintCanopy(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv, hand?: CanopyHand): void {
  ctx.save()
  env.shade?.save()
  const wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  const tones = desc.tones, shade = env.shade && desc.shadedTones
  const time = desc.animated?.frames ? env.phase : 0
  const brush = receiverBrush(ctx, env.shade), inks = (bytes: Uint8Array | undefined) => (hand && bytes ? hand.inks(bytes) : bytes)
  paintVegTufts(brush, desc.vegetation, wind, time, inks(tones?.tufts), inks(shade?.tufts))
  paintVegCrowns(brush, desc.vegetation, wind, time, inks(tones?.trees), inks(shade?.trees), hand?.dress)
  mask(ctx, desc)
  ctx.restore()
  if (env.shade) {
    mask(env.shade, desc)
    env.shade.restore()
  }
}
