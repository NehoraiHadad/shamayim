import type { HouseDesc, LayerOf, Shine, Tones, TreeDesc } from '../model/types'
import { rng } from './core'
import { drawGlyph, drawLamps, glyphShadow } from './glyphs'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D, type PaintEnv, type Scratch } from './hand'

/*
 * The marks and the village portrait (stage C4) in the enriched hand. MEDIUM: the scene's flat opaque bodies cut from the
 * ridge colour, one-sided light from the world's light, haze by distance (in the tones), no outlines. ORDER: the cast
 * shadows on the ground first (under everything); then the bodies back to front by their base (houses, trees, the
 * marks among them); then the material grain over all of it (source-atop: only what is drawn takes it, 1 device px
 * cells over a 4 px mottle, invisible at 1× and felt at 2×); last the lamps and their halos, which no grain dulls.
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
function grain(ctx: Ctx2D, env: PaintEnv, seed: number, amount: number) {
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
  grain(ctx, env, 7, 1 - 0.4 * desc.shine.night)
  drawLamps(ctx, lamps, 1 / env.scale)
}

/** A house: walls, the lit face toward the light, the shade strip, windows by storey, a tiled hip or a flat roof. */
function house(ctx: Ctx2D, h: HouseDesc, t: Tones, s: Shine, side: 1 | -1 | 0, lamps: Lamp[]) {
  const r = rng(h.seed * 31 + 3)
  const x0 = h.x, y0 = h.base - h.h, x1 = h.x + h.w
  const wall = mix(t.wall, t.stone, 0.2 + 0.6 * h.tint)
  const lit = side ? mix(t.lit, t.stoneLit, 0.4 * h.tint) : mix(wall, t.rim, 0.15)
  const face = Math.max(0.8, Math.min(1.8, h.w * 0.28))
  const shadeW = Math.min(1.2, h.w * 0.2)
  ctx.fillStyle = css(wall)
  ctx.fillRect(x0, y0, h.w, h.h)
  if (side) {
    ctx.fillStyle = css(lit)
    ctx.fillRect(side > 0 ? x0 : x1 - face, y0, face, h.h)
  }
  ctx.fillStyle = css(t.shade, side ? 0.7 : 0.3)
  ctx.fillRect(side >= 0 ? x1 - shadeW : x0, y0, shadeW, h.h)
  // Windows: a row a storey, a few lit by night (the world's lit share).
  const inner0 = side > 0 ? x0 + face + 0.4 : x0 + shadeW + 0.4, inner1 = side > 0 ? x1 - shadeW - 0.3 : x1 - face - 0.3
  const storey = (h.h - 1) / Math.max(1, h.storeys)
  for (let k = 0; k < h.storeys; k++) {
    const wy = y0 + 1 + k * storey + Math.max(0.3, storey * 0.25)
    if (wy + 0.9 > h.base - 0.6) continue
    for (let wx = inner0; wx + 0.7 <= inner1; wx += 1.7) {
      if (r() < 0.35) continue
      const on = r() < s.windows
      ctx.fillStyle = on ? css(mix(wall, t.win, 0.92)) : css(t.deep, 0.65 - 0.2 * s.night)
      ctx.fillRect(wx, wy, 0.7, 0.9)
      if (on && s.night > 0.6 && r() < 0.25) lamps.push({ x: wx + 0.35, y: wy + 0.45, r: 1.6, c: t.win, a: 0.35 * s.night })
    }
  }
  if (h.roof === 'tile') {
    // A hipped roof: the plane toward the light lit, the other in the roof's own tone.
    ctx.fillStyle = css(t.roof)
    ctx.beginPath()
    ctx.moveTo(x0 - 0.5, y0 + 0.2); ctx.lineTo(x0 + h.w * 0.35, y0 - 2.2); ctx.lineTo(x0 + h.w * 0.65, y0 - 2.2); ctx.lineTo(x1 + 0.5, y0 + 0.2)
    ctx.closePath()
    ctx.fill()
    if (side) {
      ctx.fillStyle = css(t.roofLit)
      ctx.beginPath()
      if (side > 0) { ctx.moveTo(x0 - 0.5, y0 + 0.2); ctx.lineTo(x0 + h.w * 0.35, y0 - 2.2); ctx.lineTo(x0 + h.w * 0.5, y0 - 2.2); ctx.lineTo(x0 + h.w * 0.3, y0 + 0.2) }
      else { ctx.moveTo(x1 + 0.5, y0 + 0.2); ctx.lineTo(x0 + h.w * 0.65, y0 - 2.2); ctx.lineTo(x0 + h.w * 0.5, y0 - 2.2); ctx.lineTo(x0 + h.w * 0.7, y0 + 0.2) }
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = css(t.shade, 0.5)
    ctx.fillRect(x0, y0 + 0.2, h.w, 0.4)
  } else {
    // A flat roof: the parapet catching the light, a solar water heater on some.
    ctx.fillStyle = css(side ? t.lit : t.rim, 0.75)
    ctx.fillRect(x0, y0, h.w, 0.5)
    if (h.heater && h.w > 3.2) {
      const hx = x0 + h.w * (0.3 + 0.4 * h.tint)
      ctx.fillStyle = css(mix(t.stoneLit, t.lit, 0.3))
      ctx.fillRect(hx, y0 - 1, 1.3, 0.6)
      ctx.fillStyle = css(t.panel)
      ctx.beginPath()
      ctx.moveTo(hx - 1.4, y0); ctx.lineTo(hx - 0.2, y0 - 0.9); ctx.lineTo(hx - 0.2, y0)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.fillStyle = css(t.deep, 0.5)
  ctx.fillRect(x0 - 0.2, h.base - 0.4, h.w + 0.4, 0.7)
}

/** A house's cast shadow on the ground beside it, away from the light. */
function houseShadow(ctx: Ctx2D, h: HouseDesc, t: Tones, s: Shine) {
  if (s.cast.alpha <= 0.01 || !s.cast.dx) return
  const dir = Math.sign(s.cast.dx)
  const length = Math.min(8, s.cast.length * h.h * 0.7 + 0.5)
  const from = dir > 0 ? h.x + h.w : h.x
  const g = ctx.createLinearGradient(from, 0, from + dir * length, 0)
  g.addColorStop(0, css(t.shade, 0.8 * s.cast.alpha))
  g.addColorStop(1, css(t.shade, 0))
  ctx.fillStyle = g
  ctx.fillRect(Math.min(from, from + dir * length), h.base - 1.2, length, 1.6)
}

/** A tree: a round pine or olive (two lobes and a lit crown), a cypress (a flame, its lit half), a palm; leaning in the wind. */
function tree(ctx: Ctx2D, tr: TreeDesc, t: Tones, s: Shine, side: 1 | -1 | 0) {
  const { x, base, w, h } = tr
  const r = rng(tr.seed)
  const lean = s.lean * (0.6 + 0.4 * r())
  ctx.save()
  ctx.translate(x, base)
  ctx.transform(1, 0, -lean, 1, 0, 0)
  const sd = side || 1
  ctx.fillStyle = css(t.deep, 0.45)
  ctx.fillRect(-w * 0.45, -0.3, w * 0.9 + 0.6, 0.6)
  if (tr.kind === 'cypress') {
    ctx.fillStyle = css(t.green)
    ctx.beginPath()
    ctx.moveTo(0, -h); ctx.quadraticCurveTo(w * 0.62, -h * 0.45, 0.35, 0); ctx.lineTo(-0.35, 0); ctx.quadraticCurveTo(-w * 0.62, -h * 0.45, 0, -h)
    ctx.fill()
    if (side) {
      ctx.fillStyle = css(t.greenLit, 0.8)
      ctx.beginPath()
      ctx.moveTo(0, -h); ctx.quadraticCurveTo(-sd * w * 0.62, -h * 0.45, -sd * 0.35, 0); ctx.lineTo(-sd * 0.05, 0); ctx.quadraticCurveTo(-sd * w * 0.2, -h * 0.5, 0, -h)
      ctx.fill()
    }
  } else if (tr.kind === 'palm') {
    ctx.fillStyle = css(mix(t.wall, t.deep, 0.35))
    ctx.fillRect(-0.35, -h + 1, 0.7, h - 1)
    ctx.fillStyle = css(t.green)
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55, l = w * (0.45 + 0.12 * r())
      ctx.beginPath()
      ctx.moveTo(0, -h + 1)
      ctx.quadraticCurveTo(Math.cos(a) * l * 0.6, -h + 1 + Math.sin(a) * l * 0.6 - 0.5, Math.cos(a) * l, -h + 1 + Math.sin(a) * l + 1.4)
      ctx.lineTo(Math.cos(a) * l * 0.8, -h + 1 + Math.sin(a) * l * 0.8 + 1.6)
      ctx.closePath()
      ctx.fill()
    }
  } else {
    const rr = w / 2
    ctx.fillStyle = css(t.green)
    ctx.beginPath()
    ctx.arc(0, -rr - 0.4, rr, 0, Math.PI * 2)
    ctx.arc(sd * rr * 0.7, -rr * 0.75 - 0.4, rr * 0.72, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(t.shade, 0.35)
    ctx.beginPath()
    ctx.arc(sd * rr * 0.55, -rr * 0.55 - 0.4, rr * 0.55, 0, Math.PI * 2)
    ctx.fill()
    if (side) {
      ctx.fillStyle = css(t.greenLit, 0.8)
      ctx.beginPath()
      ctx.arc(-sd * rr * 0.35, -rr * 1.25 - 0.4, rr * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** The village portrait and the marks among its roofs, back to front. */
export function paintPortrait(ctx: Ctx2D, desc: LayerOf<'portrait'>, env: PaintEnv): void {
  const { tones: t, shine: s } = desc
  const side = desc.litSide === 'left' ? 1 : desc.litSide === 'right' ? -1 : 0
  for (const h of desc.houses) houseShadow(ctx, h, t, s)
  for (const g of desc.glyphs) glyphShadow(ctx, g, s)
  const lamps: Lamp[] = []
  const items: { base: number; draw: () => void }[] = [
    ...desc.houses.map((h) => ({ base: h.base, draw: () => house(ctx, h, t, s, side, lamps) })),
    ...desc.trees.map((tr) => ({ base: tr.base + 0.05, draw: () => tree(ctx, tr, t, s, side) })),
    // A field lies on the face under its first row; a building stands on its base.
    ...desc.glyphs.map((g) => ({ base: g.ground ? g.base - 0.5 : g.base, draw: () => { lamps.push(...drawGlyph(ctx, g, s)) } })),
  ]
  items.sort((a, b) => a.base - b.base)
  for (const item of items) item.draw()
  grain(ctx, env, 11, 1 - 0.4 * s.night)
  drawLamps(ctx, lamps, 1 / env.scale)
}
