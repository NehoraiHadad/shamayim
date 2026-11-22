import { smoothstep } from '../../domain/smoothstep'
import { trailAt } from '../model/contrailMotion'
import type { LayerOf, Pt } from '../model/types'
import { css, type Ctx2D } from './hand'
import { stroke } from './life'

/** A soft ribbon composed at the supplied phase. Each emission keeps its own deterministic width variation. */
export function paintContrail(ctx: Ctx2D, layer: LayerOf<'contrail'>, phase: number, still: boolean, dpr: number) {
  const puffs = trailAt(layer, phase, still)
  if (puffs.length < 2) return
  const { bounds, rgb, shade } = layer
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineCap = 'butt'
  for (let i = 1; i < puffs.length; i++) {
    const a = puffs[i - 1], b = puffs[i]
    const alpha = (a.alpha + b.alpha) / 2
    if (alpha < 0.001) continue
    const [x0, y0] = a.point, [x1, y1] = b.point
    // Mean style over one 20 s emission interval. The widest pass is 2.8 times that mean, plus up to 10% lumpiness.
    const width = (a.width + b.width) / 2
    const pad = 1.55 * width + 1
    if (Math.max(x0, x1) < -pad || Math.min(x0, x1) > bounds.w + pad ||
      Math.max(y0, y1) < -pad || Math.min(y0, y1) > bounds.h + pad) continue
    const lump = 0.9 + 0.2 * (((a.seed ?? 0) >>> 0) % 1000) / 1000
    const run = [a.point, b.point]
    const below: Pt[] = [[x0, y0 + width * 0.3], [x1, y1 + width * 0.3]]
    const veil = smoothstep(2.4, 2.6, width)
    if (veil > 0) stroke(ctx, run, width * 2.8 * lump, css(rgb, alpha * 0.08 * veil))
    stroke(ctx, below, width * 1.3 * lump, css(shade, alpha * 0.18))
    stroke(ctx, run, width * 1.7 * lump, css(rgb, alpha * 0.22))
    stroke(ctx, run, width * 1.1 * lump, css(rgb, alpha * 0.3))
    stroke(ctx, run, width * 0.55 * lump, css(rgb, alpha * 0.45))
  }
  ctx.restore()
}
