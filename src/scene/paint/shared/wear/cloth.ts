import type { WearItem } from '../../../model/types'
import { rng } from '../base/core'
import { css, mix, type Ctx2D } from '../base/hand'
import { grainOf } from './clothGrain'
import { stroke } from './path'
import type { Grain } from './shape'

/** How much light a cloth lets through from behind (a thin weave glows, a coat barely; gear none). */
export const THIN: Record<Grain, number> = { weave: 0.9, nylon: 0.75, straw: 0.45, knit: 0.4, twill: 0.2, none: 0.15 }

/**
 * A piece of cloth (the living light): its body tone; inside its outline the sky's light from above (an even light), the
 * side light's falloff (lit edge → body → shade, from its side, by its strength: the two blend as the light comes round),
 * the light on its face, the light through it from behind (thin cloth glows in its own colour, its edges catching a rim),
 * a soft shade gathering at the hem, the grain, the wet's darkening and beads, the snow on its top edge, the rim on the lit
 * edge; then its soft ink edge.
 */
export function cloth(ctx: Ctx2D, p: Path2D, it: WearItem, grain: Grain, [x0, x1, y1]: [number, number, number], px: number) {
  const t = it.tones
  const k = Math.abs(it.across)
  const thin = THIN[grain] * (1 - 0.5 * it.wet)
  ctx.fillStyle = css(t.body)
  ctx.fill(p)
  ctx.save()
  ctx.clip(p)
  if (k < 0.996) {
    const g = ctx.createLinearGradient(0, 0, 0, y1)
    g.addColorStop(0, css(t.lit, 0.45 * (1 - k)))
    g.addColorStop(0.45, css(t.body, 0))
    ctx.fillStyle = g
    ctx.fillRect(x0 - 2, -6, x1 - x0 + 4, y1 + 10)
  }
  if (k > 0.004) {
    const g = ctx.createLinearGradient(it.across < 0 ? x0 : x1, 0, it.across < 0 ? x1 : x0, 0)
    g.addColorStop(0, css(t.lit, 0.95 * k))
    g.addColorStop(0.32, css(t.lit, 0.35 * k))
    g.addColorStop(0.55, css(t.body, 0))
    g.addColorStop(0.8, css(t.shade, 0.3 * it.shine * k))
    g.addColorStop(1, css(t.shade, (0.55 * it.shine + 0.1) * k))
    ctx.fillStyle = g
    ctx.fillRect(x0 - 2, -6, x1 - x0 + 4, y1 + 10)
  }
  if (it.front > 0.004) {
    ctx.fillStyle = css(t.lit, 0.45 * it.front)
    ctx.fillRect(x0 - 2, -6, x1 - x0 + 4, y1 + 10)
  }
  if (it.back > 0.004) {
    // Back-lit: the face toward the eye is in its own shade (more for a thick cloth), the light coming through a thin one.
    ctx.fillStyle = css(t.shade, 0.3 * it.back * (1 - thin))
    ctx.fillRect(x0 - 2, -6, x1 - x0 + 4, y1 + 10)
    const g = ctx.createLinearGradient(0, 0, 0, y1)
    g.addColorStop(0, css(t.glow, 0.7 * it.back * thin))
    g.addColorStop(0.6, css(t.glow, 0.5 * it.back * thin))
    g.addColorStop(1, css(t.glow, 0.25 * it.back * thin))
    ctx.fillStyle = g
    ctx.fillRect(x0 - 2, -6, x1 - x0 + 4, y1 + 10)
  }
  // The cloth hangs: its lower part turns from the light a little, and the hem gathers shade (more when wet).
  const hem = ctx.createLinearGradient(0, y1 * 0.55, 0, y1)
  hem.addColorStop(0, css(t.shade, 0))
  hem.addColorStop(1, css(t.shade, 0.22 + 0.3 * it.wet))
  ctx.fillStyle = hem
  ctx.fillRect(x0 - 2, y1 * 0.5, x1 - x0 + 4, y1 * 0.6)
  grainOf(ctx, it, grain, x0, x1, y1, px)
  if (it.wet > 0.15) {
    // Water standing on the cloth: a few bright beads, each with its shadow below.
    const r = rng(it.seed + 101)
    const count = Math.round(4 + 10 * it.wet)
    for (let i = 0; i < count; i++) {
      const x = x0 + (x1 - x0) * r(), y = 2 + (y1 - 2) * r(), s = 0.45 + 0.4 * r()
      ctx.fillStyle = css(t.deep, 0.35)
      ctx.beginPath(); ctx.arc(x + 0.15, y + 0.3, s, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = css(t.glint, 0.55)
      ctx.beginPath(); ctx.arc(x - 0.12, y - 0.12, s * 0.45, 0, Math.PI * 2); ctx.fill()
    }
  }
  if (it.snow > 0.05 && typeof DOMMatrix !== 'undefined') {
    // Snow lying on every edge that faces up (the shoulders, the sleeves' tops, a brim): the cloth less itself moved down
    // by the snow's depth, in white, its lower edge in the cloth's shade.
    const depth = 1 + 1.6 * it.snow
    const down = new Path2D()
    down.addPath(p, new DOMMatrix().translate(0, depth))
    const band = new Path2D()
    band.rect(x0 - 3, -8, x1 - x0 + 6, y1 + 16)
    band.addPath(down)
    ctx.fillStyle = css(t.glint, 0.95 * Math.min(1, it.snow + 0.35))
    ctx.fill(band, 'evenodd')
    ctx.save()
    ctx.clip(band, 'evenodd')
    stroke(ctx, down, t.shade, 0.9, 0.6)
    ctx.restore()
  }
  if (k > 0.004) {
    // The rim: the outline traced again a hair toward the shade, so it lies just inside the lit edge.
    ctx.save()
    ctx.translate(-Math.sign(it.across) * 0.7, 0)
    stroke(ctx, p, t.rim, 1.4, 0.75 * it.shine * k)
    ctx.restore()
  }
  if (it.back > 0.004) {
    // Back-lit, every edge catches the light beyond the cloth: a fine bright rim just inside the outline.
    stroke(ctx, p, mix(t.rim, t.glow, 0.4), 1.2, 0.6 * it.back * (0.4 + 0.6 * thin))
  }
  ctx.restore()
  stroke(ctx, p, t.edge, 1.2 * px, 0.82)
}
