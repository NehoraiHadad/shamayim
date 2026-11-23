import type { LayerOf, ShaftDesc } from '../model/types'
import { rng } from './core'
import { css, type Ctx2D, type PaintEnv } from './hand'

/*
 * A curtain of rain or snow (stage C7; reference in `weather.ts`): one soft body leaning downwind, densest in its middle
 * under the base and thinning to its edges and toward the ground, and broad fibres of heavier fall inside it. Soft edges
 * by nested copies (no filter). Pure: the shaft alone, seeded.
 */

/** Nested copies of the body and their widths against the shaft's: many faint ones, so no edge shows. */
const LAYERS = 9, WIDEST = 1.2, NARROWEST = 0.3
/** The fall's density down the curtain: [height from the base, share], for rain and for snow. */
const RAIN_DOWN = [[0, 0], [0.1, 0.85], [0.3, 1], [0.7, 0.8], [1, 0.5]] as const
const SNOW_DOWN = [[0, 0], [0.1, 0.8], [0.6, 0.65], [1, 0.3]] as const
/** Shaft px per fibre; a fibre's width (px) at least and the spread over it; its strength against the body's. */
const FIBRE_PX = 11, FIBRE_W = 3, FIBRE_SPREAD = 7, FIBRE = 0.3
/** Nested copies of one fibre: a soft edge on each. */
const FIBRE_LAYERS = [1, 0.7, 0.4]

export function curtain(ctx: Ctx2D, s: Omit<ShaftDesc, 'id'>, snow: boolean) {
  const { x, top, bottom, w, lean, rgb, alpha, seed } = s
  const h = bottom - top
  if (h <= 1 || alpha < 0.01) return
  const body = ctx.createLinearGradient(0, top, 0, bottom)
  for (const [at, share] of snow ? SNOW_DOWN : RAIN_DOWN) body.addColorStop(at, css(rgb, share))
  ctx.save()
  ctx.fillStyle = body
  // So many copies over one another come to `alpha` in the middle.
  ctx.globalAlpha *= 1 - (1 - Math.min(0.95, alpha)) ** (1 / LAYERS)
  for (let i = 0; i < LAYERS; i++) slab(ctx, x, w * (WIDEST - ((WIDEST - NARROWEST) * i) / (LAYERS - 1)), top, bottom, lean)
  ctx.restore()
  // The fibres: bunched in the middle, of seeded widths, some stopping short of the ground (virga).
  const r = rng(seed)
  const fibres = Math.max(2, Math.round(w / FIBRE_PX))
  ctx.save()
  for (let i = 0; i < fibres; i++) {
    const across = (r() + r() - 1) * 0.5
    const reach = r() < 0.3 ? 0.55 + 0.4 * r() : 1
    const fw = Math.min(w * 0.4, FIBRE_W + FIBRE_SPREAD * r() ** 2)
    const foot = top + h * reach
    const g = ctx.createLinearGradient(0, top, 0, foot)
    const strength = alpha * FIBRE * (0.4 + 0.6 * r()) / FIBRE_LAYERS.length
    g.addColorStop(0, css(rgb, 0))
    g.addColorStop(0.2, css(rgb, strength))
    g.addColorStop(reach < 1 ? 0.5 : 0.75, css(rgb, strength * 0.8))
    g.addColorStop(1, css(rgb, reach < 1 ? 0 : strength * 0.4))
    ctx.fillStyle = g
    for (const k of FIBRE_LAYERS) slab(ctx, x + across * w, fw * k, top, foot, lean * reach)
  }
  ctx.restore()
}

/** A leaning column `w` wide, its foot `lean` px downwind. */
function slab(ctx: Ctx2D, x: number, w: number, top: number, bottom: number, lean: number) {
  ctx.beginPath()
  ctx.moveTo(x - w / 2, top)
  ctx.lineTo(x + w / 2, top)
  ctx.lineTo(x + w / 2 + lean, bottom)
  ctx.lineTo(x - w / 2 + lean, bottom)
  ctx.closePath()
  ctx.fill()
}

/** The curtains under the far banks that rain or snow, on their cloud layer's band (each also a period over, to wrap). */
export function paintShafts(ctx: Ctx2D, desc: LayerOf<'shafts'>, _env: PaintEnv): void {
  const { bounds, period } = desc
  for (const s of desc.shafts) {
    for (const k of [-1, 0, 1]) {
      const x = s.x + k * period
      if (x + s.w + Math.abs(s.lean) < bounds.x || x - s.w - Math.abs(s.lean) > bounds.x + bounds.w) continue
      curtain(ctx, { ...s, x }, desc.precip === 'snow')
    }
  }
}
