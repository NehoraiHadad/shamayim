import type { LayerOf } from '../../../model/types'
import { outline, type Ctx2D, type PaintEnv } from '../base/hand'
import { paintVegCrowns, type CrownHand } from './landVegCrowns'
import { paintVegTufts } from './landVegTufts'
import { receiverBrush } from './receiverBrush'

/** A style's own hand on the canopy: the plants' inks as it mixes them, and its own part in the crowns. */
export interface CanopyHand extends CrownHand { inks(bytes: Uint8Array): Uint8Array }

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
  paintVegCrowns(brush, desc.vegetation, wind, time, inks(tones?.trees), inks(shade?.trees), hand)
  mask(ctx, desc)
  ctx.restore()
  if (env.shade) {
    mask(env.shade, desc)
    env.shade.restore()
  }
}
