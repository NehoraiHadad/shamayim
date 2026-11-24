import type { LayerOf } from '../../../model/types'
import type { Ctx2D, PaintEnv } from '../../shared/base/hand'
import { hairOf, layBody, layGlints, layRim, loopAt } from '../../shared/land/water'
import { layWaves, rising, sparkle, type Water } from './waves'

/** A lake or a bay: the model's body, its far shore's light soft on the water, the wind's waves, the light's path over them. */

/** The far rim's strokes: their width (px) and their share of its strength. */
const RIM = [[3.2, 0.25], [1.4, 0.45]] as const
const LONG = [2, 1.5] as const, STRONG = 1.1

export function paintRealWater(ctx: Ctx2D, desc: LayerOf<'water'>, env: PaintEnv): void {
  layBody(ctx, desc)
  if (!desc.bands.length) return
  const hair = hairOf(env), t = loopAt(desc, env), { ruffle } = desc
  const water: Water = { top: Math.min(...desc.bands.map((b) => b.top)), bottom: Math.max(...desc.bands.map((b) => b.bottom)), clear: desc.clear, long: LONG }
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.lineJoin = 'round'
  for (const [width, share] of RIM) layRim(ctx, desc, hair, width, share)
  layWaves(ctx, water, rising(ruffle.shade, t, ruffle.drift, 0), ruffle.dark, [ruffle.light, 0.3], hair, STRONG)
  layWaves(ctx, water, rising(ruffle.lit, t, ruffle.drift, 0.5), ruffle.light, [ruffle.dark, 0.5], hair, STRONG)
  layGlints(ctx, desc, t, hair * 1.6, sparkle)
  ctx.restore()
}
