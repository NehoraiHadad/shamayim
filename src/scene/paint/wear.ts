import type { LayerOf, RGB, WearItem } from '../model/types'
import { hangingOf } from '../model/wearKit'
import { rng } from './core'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * The clothesline in the scene's hand (`model/wear.ts`). MEDIUM: the scene's tone shapes, lit from the light's true side
 * (a falloff across the cloth from a lit edge with its rim to a shade side, the drape and sleeve shadows on the side away
 * from it), a cloth grain (a weave, a knit, a twill), seams and stitches in a thin line, and a soft ink edge so the cloth
 * reads on paper as the old drawing did. The garments' shapes are the old line's own (`ui/wear/*.tsx`, now gone), in
 * the same frame: (0, 0) where the rope passes, y down. ORDER (each garment): the parts as the old drawing stacked them,
 * each cloth part filled, lit, grained, wetted and snowed inside its own outline, then edged; the pegs last.
 * Pure: randomness only from the garment's seed; worker-safe (Path2D, no DOM).
 */

/** A part of a garment: its outline (SVG path data) and how it is drawn; `t`: [deg, dx, dy] turn and shift first. */
interface Part { d: string; as: 'cloth' | 'shade' | 'inner' | 'tag' | 'seam' | 'stitch' | 'strong' | 'dot' | 'crook' | 'glint' | 'cord' | 'water'
  t?: readonly [number, number, number] }
type Grain = 'weave' | 'knit' | 'twill' | 'nylon' | 'straw' | 'none'
interface Shape { parts: Part[]; grain: Grain }

const NECK = 'M-6 1.2Q0 6.5 6 1.2'
/** Between the pegs the front neckline sags open and the inside of the back shows, with its little care label. */
const INSIDE: Part[] = [
  { d: 'M-7.2 1.1Q0 2.9 7.2 1.1Q0 6.6-7.2 1.1Z', as: 'inner' },
  { d: 'M-1.1 1.9H1.1V3.5L0 3.9-1.1 3.5Z', as: 'tag' },
]
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const UMBRELLA: readonly [number, number, number] = [6.2, 2.6, -3]
const HAT: readonly [number, number, number] = [0, 0, 8]

const SHAPES: Record<string, Shape> = {
  // Short sleeves stick out, a chest pocket; the neck dips where the pegs pull the shoulders.
  tee: { grain: 'weave', parts: [
    { d: 'M-8 1Q-13.4 3.2-16.2 7.6L-15 15.6Q-12.6 15.4-10.4 14.2V33Q-5 33.8 0 33.4T10.4 33V14.2Q12.6 15.4 15 15.6L16.2 7.6Q13.4 3.2 8 1Q0 7-8 1Z', as: 'cloth' },
    ...INSIDE,
    { d: 'M7.6 2.6Q5.6 17 4.4 33.4Q7.4 33.3 9.6 33V11.2Z', as: 'shade' },
    { d: 'M11.2 13.6Q12.6 14.6 14.4 14.8L15 9.4Q12.6 9.6 11.2 13.6Z', as: 'shade' },
    { d: NECK, as: 'seam' },
    { d: 'M-15.2 13.4Q-12.8 13.4-10.6 12.2M15.2 13.4Q12.8 13.4 10.6 12.2M-9.6 31Q0 32.6 9.6 31', as: 'stitch' },
    { d: 'M-8.4 14.5H-3.6V18.4Q-6 19.6-8.4 18.4Z', as: 'seam' },
    { d: 'M-8 15.7h4', as: 'stitch' },
  ] },
  // Thin long sleeve: the sleeves fall straight down beside the body, narrow cuffs.
  longSleeve: { grain: 'weave', parts: [
    { d: 'M-8 1L-17 5-20.5 29.5-16.6 30.4-11 13V35Q0 36.4 11 35V13L16.6 30.4 20.5 29.5 17 5 8 1Q0 7-8 1Z', as: 'cloth' },
    ...INSIDE,
    { d: 'M7.6 2.6Q5.4 18 4.4 35.4Q7.6 35.3 10.2 35V13.4Z', as: 'shade' },
    { d: 'M12 14L17 29.6 18.4 29.2 14.2 11.4Z', as: 'shade' },
    { d: NECK, as: 'seam' },
    { d: 'M-2.6 6.6Q-3.6 20-2.4 34', as: 'seam' },
    { d: 'M-20.2 27.4l3.9.9M20.2 27.4l-3.9.9M-10.2 33.2Q0 34.6 10.2 33.2', as: 'stitch' },
  ] },
  // Knit sweater: rounder, heavier, ribbed hem and cuffs, a double crew neck, a cable down the front.
  sweater: { grain: 'knit', parts: [
    { d: 'M-8.5 1Q-15 2.5-18 7L-21 29.6-16 31-12 15V35.5Q0 37.5 12 35.5V15L16 31 21 29.6 18 7Q15 2.5 8.5 1Q0 7.5-8.5 1Z', as: 'cloth' },
    ...INSIDE,
    { d: 'M8.2 2.8Q6 18 5 32.8Q8.6 32.6 11.2 32.2V15Z', as: 'shade' },
    { d: 'M12.8 16.4L16.6 29.4 18.6 28.8 15.6 11.2Z', as: 'shade' },
    { d: NECK, as: 'seam' },
    { d: 'M-7.2 2.6Q0 9 7.2 2.6', as: 'seam' },
    { d: 'M-1.6 10q3.2 2 0 4t0 4 0 4 0 4 0 4M1.6 10q-3.2 2 0 4t0 4 0 4 0 4 0 4', as: 'seam' },
    { d: 'M-12 32.4Q0 34.4 12 32.4M-8 33.4v2.8M-4 33.8v2.9M0 34v3M4 33.8v2.9M8 33.4v2.8', as: 'seam' },
    { d: 'M-20.6 26.8l4.5 1.4M20.6 26.8l-4.5 1.4', as: 'seam' },
  ] },
  // Zip jacket: stand collar, a zip with its pull, two slanted pockets, banded cuffs.
  jacket: { grain: 'nylon', parts: [
    { d: 'M-8.5 1L-18 5.5-21 30-16.6 31-12.4 14V36H12.4V14L16.6 31 21 30 18 5.5 8.5 1-6 1Z', as: 'cloth' },
    { d: 'M1 1.2V35.2H11.6V14.4L8.4 2Z', as: 'shade' },
    { d: 'M13.2 15.4L17 29.8 19 29.4 16 9.4Z', as: 'shade' },
    { d: 'M-6 1L-5 -2H5L6 1', as: 'seam' },
    { d: 'M0 -2V36', as: 'seam' },
    { d: 'M-0.9 3.4h1.8v3h-1.8z', as: 'strong' },
    { d: 'M-9.5 24l3.5-3M9.5 24l-3.5-3M-20.4 27.4l4.3 1M20.4 27.4l-4.3 1M-12.4 33.4H12.4', as: 'seam' },
  ] },
  // Long coat: past the knees, lapels, two buttons, a belt, flap pockets.
  coat: { grain: 'twill', parts: [
    { d: 'M-9 1L-18.5 6-21.5 32-17 33-13 15V48.5H13V15L17 33 21.5 32 18.5 6 9 1Z', as: 'cloth' },
    { d: 'M2.6 15.4L1 22V47.8H12.2V15.4L9 2Z', as: 'shade' },
    { d: 'M13.8 16.6L17.4 31.6 19.6 31.2 16.6 10.6Z', as: 'shade' },
    { d: 'M-9 1L-2 14 0 22M9 1L2 14 0 22V48.5', as: 'seam' },
    { d: 'M-13 30H13M-11 36.5h6M5 36.5h6', as: 'seam' },
    { d: 'M-12.2 46.4H12.2', as: 'stitch' },
    { d: circle(-3, 25.5, 1), as: 'dot' },
    { d: circle(-3, 36, 1), as: 'dot' },
  ] },
  // Closed umbrella hung by its crook: furled canopy held by a snapped strap, tip at the bottom. Drawn in its own frame
  // (shaft on x = 0), then hung: the crook's inner top rests on the rope and its weight hangs straight under it.
  umbrella: { grain: 'nylon', parts: [
    { d: 'M0 9V4.2A2.6 2.6 0 0 0-5.2 4.2V5.4Q-5.2 6.6-4.2 6.8', as: 'crook', t: UMBRELLA },
    { d: 'M-0.5 4.2A2.1 2.1 0 0 0-4.7 4.2', as: 'glint', t: UMBRELLA },
    { d: 'M-1.2 9H1.2L1.5 11.6H-1.5Z', as: 'dot', t: UMBRELLA },
    { d: 'M0 11.4C-5.4 17-5.8 35-0.8 43.2 -0.3 44 0.3 44 0.8 43.2 5.8 35 5.4 17 0 11.4Z', as: 'cloth', t: UMBRELLA },
    { d: 'M0.6 13.4C4.4 20 4.6 34 0.8 41.6 3.2 33 3 21 0.6 13.4Z', as: 'shade', t: UMBRELLA },
    { d: 'M0 14C-2.4 21-2.1 33 0 40.6M0 14C2.4 23 2.8 32 1.4 38.6M-0.3 15.4Q-3.6 26-2.2 36.4', as: 'seam', t: UMBRELLA },
    { d: 'M-3.8 25.6Q0 28 4.2 25.2', as: 'strong', t: UMBRELLA },
    { d: circle(0.4, 26.6, 0.9), as: 'dot', t: UMBRELLA },
    { d: 'M0 43.6v2.6', as: 'strong', t: UMBRELLA },
  ] },
  // Light rain jacket: a hood falling back behind the neck, drawstrings, a zip, a storm flap pocket.
  rainJacket: { grain: 'nylon', parts: [
    { d: 'M-8.5 1L-17.5 5.5-20 28-16 29-12 13V33.5Q0 35.5 12 33.5V13L16 29 20 28 17.5 5.5 8.5 1Z', as: 'cloth' },
    { d: 'M1 14V34.4Q6 34.2 11.2 33.6V13.4L8.2 2.2Q7 13.4 1 14Z', as: 'shade' },
    { d: 'M12.8 14.4L16.4 27.8 18.4 27.4 15.6 8.8Z', as: 'shade' },
    { d: 'M-7 2Q-6.5 13 0 13.5 6.5 13 7 2', as: 'seam' },
    { d: 'M-2.5 13.4v5.5M2.5 13.4v4.4', as: 'seam' },
    { d: 'M0 13.5V33.5M-10 22.6h5.4M5 24.6l4.4-2', as: 'seam' },
  ] },
  // Sun hat hung by its chin cord looped over the rope: a wide brim with its shaded underside, a band, a ribbon tail.
  sunHat: { grain: 'straw', parts: [
    { d: 'M-1.3 2.4A1.8 1.8 0 1 1 1.3 2.4L6.8 15.4M-1.3 2.4L-6.8 15.4', as: 'cord' },
    { d: 'M7.4 9.4Q11.6 12 11.2 18.6L9.4 17 8 18.8Q8.2 13.4 5.6 10.4Z', as: 'cloth', t: HAT },
    { d: 'M-15 12.5Q-14 6.5 0 6.2 14 6.5 15 12.5 9 16.5 0 16.5-9 16.5-15 12.5Z', as: 'cloth', t: HAT },
    { d: 'M-12.6 13.6Q0 17.4 12.6 13.6 8 15.6 0 15.6-8 15.6-12.6 13.6Z', as: 'shade', t: HAT },
    { d: 'M-8 10.8Q-8.2 1.5 0 1.2 8.2 1.5 8 10.8', as: 'cloth', t: HAT },
    { d: 'M2.4 2.2Q6.8 3.6 7 9.6L3.4 9.8Q4 5 2.4 2.2Z', as: 'shade', t: HAT },
    { d: 'M-5.6 4.4Q-4.4 2.6-2.4 2.2', as: 'glint', t: HAT },
    { d: 'M-8 8.6Q0 10.6 8 8.6', as: 'strong', t: HAT },
    { d: 'M-0.6 1.6Q0 4 0 6.2M-12.2 12.6Q0 15.8 12.2 12.6', as: 'stitch', t: HAT },
  ] },
  // Water bottle hanging by the loop of its cap: the water inside, a glint down the side.
  water: { grain: 'none', parts: [
    { d: 'M-2.4 3.4A3 3 0 1 1 2.4 3.4', as: 'crook' },
    { d: 'M-2.6 4H2.6V7.5Q6 9.5 6 13V30Q6 32 4 32H-4Q-6 32-6 30V13Q-6 9.5-2.6 7.5Z', as: 'cloth' },
    { d: 'M-5.2 17.4Q-2.6 16.2 0 17.4T5.2 17.4V29.6Q5.2 31.2 3.6 31.2H-3.6Q-5.2 31.2-5.2 29.6Z', as: 'water' },
    { d: 'M-2.6 6.2H2.6M-1.3 4.2v2M0 4.2v2M1.3 4.2v2', as: 'seam' },
    { d: 'M-3.8 12.6V27', as: 'glint' },
  ] },
}

/** The peg: a spring clothespin pushed down over the line (rope at y = 0), its levers above and its jaws on the cloth. */
const PEG = 'M-1.15 -4.8H1.15L0.95 -2.2 1.25 -1.5 0.85 2.9Q0 3.6-0.85 2.9L-1.25 -1.5-0.95 -2.2Z'

/** Path2D per path string: a pure function of the string, so caching it is legal (as the noise tables are). */
const paths = new Map<string, Path2D>()
function path(d: string): Path2D {
  let p = paths.get(d)
  if (!p) {
    p = new Path2D(d)
    if (paths.size > 512) paths.clear()
    paths.set(d, p)
  }
  return p
}

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

function stroke(ctx: Ctx2D, p: Path2D, rgb: RGB, width: number, alpha: number) {
  ctx.strokeStyle = css(rgb, alpha)
  ctx.lineWidth = width
  ctx.stroke(p)
}

/** How much light a cloth lets through from behind (a thin weave glows, a coat barely; gear none). */
const THIN: Record<Grain, number> = { weave: 0.9, nylon: 0.75, straw: 0.45, knit: 0.4, twill: 0.2, none: 0.15 }

/**
 * A piece of cloth (the living light): its body tone; inside its outline the sky's light from above (an even light), the
 * side light's falloff (lit edge → body → shade, from its side, by its strength: the two blend as the light comes round),
 * the light on its face, the light through it from behind (thin cloth glows in its own colour, its edges catching a rim),
 * a soft shade gathering at the hem, the grain, the wet's darkening and beads, the snow on its top edge, the rim on the lit
 * edge; then its soft ink edge.
 */
function cloth(ctx: Ctx2D, p: Path2D, it: WearItem, grain: Grain, [x0, x1, y1]: [number, number, number], px: number) {
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

/** The cloth's grain at a low alpha, seeded: a weave, a knit's rows of stitches, a coat's twill, nylon's sheen, straw. */
function grainOf(ctx: Ctx2D, it: WearItem, grain: Grain, x0: number, x1: number, y1: number, px: number) {
  if (grain === 'none') return
  const r = rng(it.seed)
  const t = it.tones
  ctx.lineWidth = Math.max(0.35, 0.8 * px)
  ctx.beginPath()
  if (grain === 'weave') {
    for (let y = 1.5; y < y1; y += 1.7) {
      for (let x = x0 + r() * 2; x < x1; x += 2 + 1.6 * r()) { ctx.moveTo(x, y + r() * 0.4); ctx.lineTo(x + 0.9 + 0.6 * r(), y + r() * 0.4) }
    }
    ctx.strokeStyle = css(t.shade, 0.16)
  } else if (grain === 'knit') {
    for (let y = 2; y < y1; y += 1.9) {
      for (let x = x0 + (y % 2); x < x1; x += 1.8) { ctx.moveTo(x - 0.55, y - 0.5); ctx.lineTo(x, y + 0.35); ctx.lineTo(x + 0.55, y - 0.5) }
    }
    ctx.strokeStyle = css(t.shade, 0.26)
  } else if (grain === 'twill') {
    for (let x = x0 - y1; x < x1; x += 1.5 + 0.4 * r()) { ctx.moveTo(x, 0); ctx.lineTo(x + y1 * 0.55, y1) }
    ctx.strokeStyle = css(t.shade, 0.14)
  } else if (grain === 'straw') {
    for (let y = 1; y < y1; y += 1.25) { ctx.moveTo(x0, y); ctx.lineTo(x1, y + (r() - 0.5) * 0.4) }
    ctx.strokeStyle = css(t.shade, 0.22)
  } else {
    // Nylon: a few long soft creases catching the light.
    for (let i = 0; i < 5; i++) {
      const x = x0 + (x1 - x0) * (0.15 + 0.7 * r()), y = 3 + (y1 - 6) * r()
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1.5 * (r() - 0.5), y + 3, x + 2 * (r() - 0.5), y + 6 + 4 * r())
    }
    ctx.strokeStyle = css(t.lit, 0.35 + 0.35 * it.shine)
  }
  ctx.stroke()
}

function peg(ctx: Ctx2D, x: number, tilt: number, t: WearItem['tones'], px: number) {
  ctx.fillStyle = css(t.deep, 0.55)
  ctx.beginPath()
  ctx.ellipse(x, 2.4, 2.6, 0.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(x, 0)
  ctx.rotate(tilt)
  const body = path(PEG)
  const g = ctx.createLinearGradient(-1.25, 0, 1.25, 0)
  g.addColorStop(0, css(t.pegLight))
  g.addColorStop(0.45, css(t.peg))
  g.addColorStop(1, css(mix(t.peg, t.pegEdge, 0.35)))
  ctx.fillStyle = g
  ctx.fill(body)
  stroke(ctx, body, t.pegEdge, 0.9 * px, 1)
  stroke(ctx, path('M0 -4.6V3'), t.pegEdge, 0.6 * px, 0.8)
  ctx.fillStyle = css(t.spring)
  ctx.beginPath()
  ctx.roundRect(-1.6, -2.5, 3.2, 1.1, 0.45)
  ctx.fill()
  stroke(ctx, path('M-1.1 -2.5v1.1M-0.35 -2.5v1.1M0.4 -2.5v1.1M1.15 -2.5v1.1'), mix(t.spring, t.tag, 0.55), 0.5 * px, 0.9)
  ctx.restore()
}

/** The rope (or a hook's stretch of it): the cord, the lay of its twist, the snow on it, the beads of rain, the ties. */
export function paintWearRope(ctx: Ctx2D, desc: LayerOf<'wearRope'>, env: PaintEnv) {
  const pts = desc.points
  if (pts.length < 2) return
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const trace = () => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  }
  for (const end of desc.ends) {
    ctx.fillStyle = css(end.rgb)
    ctx.beginPath()
    ctx.roundRect(end.x - end.w / 2, end.y - 1, end.w, end.w * 0.85, 1)
    ctx.fill()
  }
  trace()
  ctx.strokeStyle = css(desc.rgb)
  ctx.lineWidth = desc.width
  ctx.stroke()
  // The lay of a twisted cord: short pale strokes slanted across the line, following its bends.
  const step = 2.4 * (desc.width / 1.5)
  ctx.beginPath()
  let walked = 0
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    if (len <= 0) continue
    const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx
    for (let s = (step - walked) % step; s < len; s += step) {
      const x = ax + tx * s, y = ay + ty * s
      const dx = (0.55 * tx + 0.7 * nx) * (desc.width / 1.5), dy = (0.55 * ty + 0.7 * ny) * (desc.width / 1.5)
      ctx.moveTo(x - dx, y - dy)
      ctx.lineTo(x + dx, y + dy)
    }
    walked = (walked + len) % step
  }
  ctx.strokeStyle = css(desc.lay)
  ctx.lineWidth = Math.max(0.5 / env.scale, desc.width * 0.3)
  ctx.stroke()
  for (const end of desc.ends) {
    // The line wrapped twice round each tab (drawn for the left tab, mirrored for the right).
    const m = -end.side, k = end.w / 6
    ctx.beginPath()
    ctx.moveTo(end.x - 2.2 * k * m, end.y - 1.8 * k); ctx.lineTo(end.x + 0.4 * k * m, end.y + 2.6 * k)
    ctx.moveTo(end.x, end.y - 2 * k); ctx.lineTo(end.x + 2.6 * k * m, end.y + 2.4 * k)
    ctx.strokeStyle = css(desc.rgb)
    ctx.lineWidth = desc.width * 0.75
    ctx.stroke()
  }
  if (desc.snow > 0.05) {
    // Snow lying along the top of the line, in seeded lumps: its shaded edge, then the white.
    const r = rng(desc.seed + 3)
    const lumps: [number, number, number][] = []
    for (let i = 1; i < pts.length; i++) {
      if (r() < 0.3 * (1 - desc.snow)) continue
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
      lumps.push([(ax + bx) / 2, (ay + by) / 2 - desc.width * 0.8, desc.width * (0.7 + 0.5 * r()) * Math.min(1, desc.snow + 0.4)])
    }
    for (const [fill, grow] of [[desc.lay, 0.45], [[0.97, 0.98, 1] as RGB, 0]] as const) {
      ctx.fillStyle = css(fill, 0.95)
      ctx.beginPath()
      for (const [x, y, rr] of lumps) { ctx.moveTo(x + rr * 2.2 + grow, y); ctx.ellipse(x, y, rr * 2.2 + grow, rr * 0.8 + grow, 0, 0, Math.PI * 2) }
      ctx.fill()
    }
  }
  for (const b of desc.beads) {
    ctx.fillStyle = css(mix(desc.lay, [0.75, 0.85, 0.95], 0.35), 0.85)
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.85, b.r, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = css([1, 1, 1], 0.75)
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2); ctx.fill()
  }
}

/** A drop falling from wet cloth: a bead of the cloth's water with its glint. */
export function paintWearDrip(ctx: Ctx2D, desc: LayerOf<'wearDrip'>) {
  const { x, y, r } = desc
  ctx.fillStyle = css(desc.rgb, 0.9)
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.5)
  ctx.quadraticCurveTo(x + r, y - r * 0.2, x + r, y + 0.2 * r)
  ctx.arc(x, y + 0.2 * r, r, 0, Math.PI)
  ctx.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.5)
  ctx.fill()
  ctx.fillStyle = css(desc.lit, 0.8)
  ctx.beginPath(); ctx.arc(x - r * 0.35, y, r * 0.3, 0, Math.PI * 2); ctx.fill()
}
