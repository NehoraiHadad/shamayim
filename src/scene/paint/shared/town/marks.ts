import type { LayerOf, Shine, Tones, TreeDesc } from '../../../model/types'
import { rng } from '../base/core'
import { drawGlyph, drawLamps, glyphShadow } from './glyphs'
import { paintPass } from '../base/paintPass'
import { css, mix, type Ctx2D, type PaintEnv, type Scratch } from '../base/hand'

/*
 * The marks (stage C4) and the trees the outside view stands among its houses, in the enriched hand. MEDIUM: the scene's
 * flat opaque bodies cut from the ridge colour, one-sided light from the world's light, haze by distance (in the tones),
 * no outlines. ORDER: the cast shadows on the ground first (under everything); then the bodies back to front by their
 * base; then the material grain over all of it (source-atop: only what is drawn takes it, 1 device px cells over a 4 px
 * mottle, invisible at 1× and felt at 2×); last the lamps and their halos, which no grain dulls.
 */

/** The grain tile in device px: ±4 % fine noise over a coarser mottle, as white or black with that alpha. */
const TILE = 64
const tiles = new Map<number, Scratch>()

function grainTile(env: PaintEnv, seed: number): Scratch {
  const cached = tiles.get(seed)
  if (cached) return cached
  const tile = env.canvas(TILE, TILE)
  const r = rng(seed * 131 + 17)
  const mottle = Array.from({ length: (TILE / 4) ** 2 }, () => r() - 0.5)
  const data = tile.ctx.createImageData(TILE, TILE)
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = (r() - 0.5) * 0.7 + mottle[(y >> 2) * (TILE / 4) + (x >> 2)] * 0.6
      const i = (y * TILE + x) * 4, a = Math.min(255, Math.round(Math.abs(v) * 0.1 * 255 * (v < 0 ? 1.2 : 1)))
      const c = v > 0 ? 255 : 0
      data.data[i] = c; data.data[i + 1] = c; data.data[i + 2] = c; data.data[i + 3] = a
    }
  }
  tile.ctx.putImageData(data, 0, 0)
  if (tiles.size > 8) tiles.clear()
  tiles.set(seed, tile)
  return tile
}

/** The grain over everything drawn so far on the layer (device px, anchored to the layer). */
export function grain(ctx: Ctx2D, env: PaintEnv, seed: number, amount: number) {
  const pattern = ctx.createPattern(grainTile(env, seed).canvas as CanvasImageSource, 'repeat')
  if (!pattern) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = amount
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}

/** The far ridge's and the plain's marks. */
export function paintMarks(ctx: Ctx2D, desc: LayerOf<'marks'>, env: PaintEnv): void {
  const glyphs = [...desc.glyphs].sort((a, b) => a.base - b.base)
  for (const g of glyphs) glyphShadow(ctx, g, desc.shine)
  const lamps = glyphs.flatMap((g) => drawGlyph(ctx, g, desc.shine))
  paintPass(ctx, 'background', () => grain(ctx, env, 7, 1 - 0.4 * desc.shine.night))
  drawLamps(ctx, lamps, 1 / env.scale)
}

/**
 * A tree: a round pine or olive (two lobes and a lit crown), a cypress (a flame, its lit half), a palm; leaning in the wind.
 * The second lobe is seeded. The fixed halves take signed lateral light, with even-sky shade underneath.
 */
export function tree(ctx: Ctx2D, tr: TreeDesc, t: Tones, s: Shine, l: number, rock = 0) {
  const { x, base, w, h } = tr
  const r = rng(tr.seed)
  // C7: the gusts rock each crown about its lean (`rock`, −1…1 over the strip's loop), a little out of step tree to tree.
  const lean = s.lean * (0.6 + 0.4 * r()) + (s.sway ?? 0) * rock * (0.7 + 0.3 * Math.sin(tr.seed))
  ctx.save()
  ctx.translate(x, base)
  ctx.transform(1, 0, -lean, 1, 0, 0)
  const k = Math.abs(l)
  const halves = [[1, Math.max(0, l)], [-1, Math.max(0, -l)]] as const
  ctx.fillStyle = css(t.deep, 0.45)
  ctx.fillRect(-w * 0.45, -0.3, w * 0.9 + 0.6, 0.6)
  if (tr.kind === 'cypress') {
    ctx.fillStyle = css(t.green)
    ctx.beginPath()
    ctx.moveTo(0, -h); ctx.quadraticCurveTo(w * 0.62, -h * 0.45, 0.35, 0); ctx.lineTo(-0.35, 0); ctx.quadraticCurveTo(-w * 0.62, -h * 0.45, 0, -h)
    ctx.fill()
    for (const [sd, weight] of halves) {
      ctx.fillStyle = css(t.greenLit, 0.8 * weight)
      ctx.beginPath()
      ctx.moveTo(0, -h); ctx.quadraticCurveTo(-sd * w * 0.62, -h * 0.45, -sd * 0.35, 0); ctx.lineTo(-sd * 0.05, 0); ctx.quadraticCurveTo(-sd * w * 0.2, -h * 0.5, 0, -h)
      ctx.fill()
    }
  } else if (tr.kind === 'palm') {
    ctx.fillStyle = css(mix(t.wall, t.deep, 0.35))
    ctx.fillRect(-0.35, -h + 1, 0.7, h - 1)
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55, len = w * (0.45 + 0.12 * r())
      ctx.fillStyle = css(mix(t.green, t.greenLit, Math.min(1, Math.max(0, -l * Math.cos(a)))))
      ctx.beginPath()
      ctx.moveTo(0, -h + 1)
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.6, -h + 1 + Math.sin(a) * len * 0.6 - 0.5, Math.cos(a) * len, -h + 1 + Math.sin(a) * len + 1.4)
      ctx.lineTo(Math.cos(a) * len * 0.8, -h + 1 + Math.sin(a) * len * 0.8 + 1.6)
      ctx.closePath()
      ctx.fill()
    }
  } else {
    const rr = w / 2
    const lobe = tr.seed % 2 ? 1 : -1
    ctx.fillStyle = css(t.green)
    ctx.beginPath()
    ctx.arc(0, -rr - 0.4, rr, 0, Math.PI * 2)
    ctx.arc(lobe * rr * 0.7, -rr * 0.75 - 0.4, rr * 0.72, 0, Math.PI * 2)
    ctx.fill()
    // The crown's shade: under an even sky its underside; with a side to the light, the half away from it.
    ctx.fillStyle = css(t.shade, 0.3 * (1 - k))
    ctx.beginPath()
    ctx.arc(0, -rr * 0.45 - 0.4, rr * 0.6, 0, Math.PI * 2)
    ctx.fill()
    for (const [sd, weight] of halves) {
      ctx.fillStyle = css(t.shade, 0.35 * weight)
      ctx.beginPath()
      ctx.arc(sd * rr * 0.55, -rr * 0.55 - 0.4, rr * 0.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = css(t.greenLit, 0.8 * weight)
      ctx.beginPath()
      ctx.arc(-sd * rr * 0.35, -rr * 1.25 - 0.4, rr * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/**
 * A tree's sway at this frame of its layer's strip (C7): a sine over the loop, its phase a quarter turn at most from
 * its neighbours' (one gust passing), periodic over the loop; 0 for a still layer.
 */
export function rockOf(desc: { animated?: LayerOf<'outside'>['animated'] }, env: PaintEnv, seed: number): number {
  const frames = desc.animated?.frames
  if (!frames) return 0
  const loop = frames.count / frames.fps
  return Math.sin(2 * Math.PI * (env.phase / loop) + (Math.abs(seed) % 100) / 100 * (Math.PI / 2))
}
