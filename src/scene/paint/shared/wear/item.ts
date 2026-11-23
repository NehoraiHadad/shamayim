import type { LayerOf } from '../../../model/types'
import { hangingOf } from '../../../model/wearKit'
import { css, mix, type Ctx2D, type PaintEnv } from '../base/hand'
import { cloth, THIN } from './cloth'
import { path, stroke } from './path'
import { peg } from './peg'
import type { Part } from './shape'
import { SHAPES } from './shapes'

/*
 * The clothesline in the scene's hand (`model/wear.ts`). MEDIUM: the scene's tone shapes, lit from the light's true side
 * (a falloff across the cloth from a lit edge with its rim to a shade side, the drape and sleeve shadows on the side away
 * from it), a cloth grain (a weave, a knit, a twill), seams and stitches in a thin line, and a soft ink edge so the cloth
 * reads on paper as the old drawing did. The garments' shapes are the old line's own (`ui/wear/*.tsx`, now gone), in
 * the same frame: (0, 0) where the rope passes, y down. ORDER (each garment): the parts as the old drawing stacked them,
 * each cloth part filled, lit, grained, wetted and snowed inside its own outline, then edged; the pegs last.
 * Pure: randomness only from the garment's seed; worker-safe (Path2D, no DOM).
 */

function placed(ctx: Ctx2D, part: Part, draw: () => void) {
  if (!part.t) return draw()
  ctx.save()
  ctx.rotate((part.t[0] * Math.PI) / 180)
  ctx.translate(part.t[1], part.t[2])
  draw()
  ctx.restore()
}

/** A garment or a piece of gear (`WearItem`), at its place on the line. */
export function paintWearItem(ctx: Ctx2D, desc: LayerOf<'wearItem'>, env: PaintEnv) {
  const it = desc.item
  const shape = SHAPES[it.garment]
  const hanging = hangingOf(it.garment)
  if (!shape || !hanging) return
  const t = it.tones
  // One device px in garment units: the edges and seams keep their weight at any size.
  const px = 1 / (it.scale * env.scale)
  ctx.save()
  ctx.translate(it.x, it.y)
  ctx.rotate(it.tilt)
  ctx.scale(it.scale, it.scale * it.hang)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const [bx0, , bx1, by1] = hanging.box
  // The cloth's outline as one region (a hat is three pieces): the shade shapes and the light keep inside it.
  const clothPath = () => {
    const all = new Path2D()
    for (const part of shape.parts) {
      if (part.as !== 'cloth') continue
      const m = part.t ? new DOMMatrix().rotate(part.t[0]).translate(part.t[1], part.t[2]) : undefined
      all.addPath(path(part.d), m)
    }
    return all
  }
  const hasDomMatrix = typeof DOMMatrix !== 'undefined'
  const region = hasDomMatrix ? clothPath() : null
  for (const part of shape.parts) {
    const p = path(part.d)
    placed(ctx, part, () => {
      switch (part.as) {
        case 'cloth': cloth(ctx, p, it, shape.grain, [bx0, bx1, by1], px); break
        case 'shade': {
          // The drape and the inner sleeve fall on the side away from the light: drawn as they are for a light from the
          // left, mirrored for one from the right, the two crossfaded by the side light's strength (half each with the
          // light straight ahead, behind or absent), so the shade turns with the light and never flips.
          const a = 0.5 + (0.05 + 0.4 * it.shine) * Math.abs(it.across)
          const right = (1 + it.across) / 2
          for (const [mirror, w] of [[false, 1 - right], [true, right]] as const) {
            if (w <= 0.004 || (mirror && part.t)) continue
            ctx.save()
            if (region && !part.t) ctx.clip(region)
            else ctx.clip(p)
            if (mirror) ctx.scale(-1, 1)
            ctx.fillStyle = css(t.shade, a * (part.t ? 1 : w))
            ctx.fill(p)
            ctx.restore()
          }
          break
        }
        case 'inner': ctx.fillStyle = css(t.deep); ctx.fill(p); stroke(ctx, p, t.edge, 0.9 * px, 0.6); break
        case 'tag': ctx.fillStyle = css(t.tag); ctx.fill(p); break
        case 'water': ctx.fillStyle = css(t.water); ctx.fill(p); break
        case 'dot': ctx.fillStyle = css(mix(t.edge, t.body, 0.15)); ctx.fill(p); break
        case 'seam': stroke(ctx, p, t.seam, 0.9 * px, 0.85); break
        case 'stitch': ctx.setLineDash([1.3, 1.1]); stroke(ctx, p, t.seam, 0.8 * px, 0.8); ctx.setLineDash([]); break
        case 'strong': stroke(ctx, p, t.edge, 1.3 * px, 0.9); break
        case 'crook': stroke(ctx, p, t.edge, 1.9 * px, 1); stroke(ctx, p, mix(t.edge, t.rim, 0.3 * it.shine), 0.7 * px, 0.7); break
        case 'glint': stroke(ctx, p, t.glint, 1.2 * px, 0.6 * (0.4 + 0.6 * Math.max(it.shine, 1 - it.wet))); break
        case 'cord': stroke(ctx, p, t.cord, 1 * px, 1); break
      }
    })
  }
  // Two-peg tops: the cloth's weight hangs from each peg in a long gravity fold toward the hem, a drag crease toward the
  // slack middle; then the pegs.
  // The rope's shadow across the cloth under it: on its face where the light comes from the front, through it where the
  // light is behind a thin cloth (a darker line seen through the glow).
  const thin = THIN[shape.grain]
  const ropeShade = it.shine * (0.3 * it.front + 0.3 * it.back * thin) * (1 - 0.6 * it.wet)
  if (region && ropeShade > 0.01) {
    ctx.save()
    ctx.clip(region)
    const dy = 1.2 + 2.2 * (1 - it.up), dx = -1.5 * it.across
    stroke(ctx, path(`M${bx0 - 2 + dx} ${dy}L${bx1 + 2 + dx} ${dy}`), t.shade, 1.3, ropeShade)
    stroke(ctx, path(`M${bx0 - 2 + dx} ${dy + 0.9}L${bx1 + 2 + dx} ${dy + 0.9}`), t.shade, 1.4, ropeShade * 0.4)
    ctx.restore()
  }
  // A neighbour's shadow, when the light runs along the line: its outline where the light carries it, on this cloth only.
  const near = it.cast && SHAPES[it.cast.garment]
  if (region && near && it.cast) {
    const shadow = new Path2D()
    for (const part of near.parts) {
      if (part.as !== 'cloth') continue
      const m = new DOMMatrix().translate(it.cast.dx, it.cast.dy)
      shadow.addPath(path(part.d), part.t ? m.rotate(part.t[0]).translate(part.t[1], part.t[2]) : m)
    }
    ctx.save()
    ctx.clip(region)
    ctx.fillStyle = css(t.shade, it.cast.alpha)
    ctx.fill(shadow)
    ctx.restore()
  }
  hanging.pegs.forEach((x, j) => {
    const hem = hanging.pegs.length > 1 ? hanging.hem : undefined
    if (hem) {
      const mid = (3.4 + hem) / 2
      ctx.save()
      if (region) ctx.clip(region)
      ctx.fillStyle = css(t.shade, 0.38)
      ctx.fill(path(`M${x - 0.4} 3.4Q${x - 1.7} ${mid} ${x * 0.86} ${hem - 2.5}Q${x + 0.4} ${mid} ${x + 0.6} 3.4Z`))
      ctx.restore()
      stroke(ctx, path(`M${x * 0.86} 3Q${x * 0.74} 6 ${x * 0.5} 7.8`), t.seam, 0.7 * px, 0.6)
    }
    peg(ctx, x, it.pegTilts[j] ?? 0, t, px)
  })
  ctx.restore()
}
