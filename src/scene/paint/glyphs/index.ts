import { GLYPH_SPECS, type GlyphKind } from '../../../world/glyphSpecs'
import type { GlyphDesc, Shine } from '../../model/types'
import { css, type Ctx2D } from '../hand'
import { azrieli } from '../icons/azrieli'
import { babShrine } from '../icons/babShrine'
import { chordsBridge } from '../icons/chordsBridge'
import { westernWall } from '../icons/westernWall'
import { castle, church, homes, minaret, synagogue, waterTower } from './buildings'
import { chimney, cooling, highrise, silo } from './industry'
import { Kit, type Lamp } from './kit'
import { orchard, palms, solar, vineyard } from './nature'
import { bridge, lighthouse, mast, turbine } from './structures'

/** Glyph form has fixed handedness. Signed light is measured in glyph space. */
type Draw = (k: Kit, h: number, d: GlyphDesc) => void

const DRAW: Record<GlyphKind, Draw> = {
  minaret: (k, h) => minaret(k, h),
  church: (k, h) => church(k, h),
  synagogue: (k) => synagogue(k),
  waterTower: (k, h) => waterTower(k, h),
  castle: (k, h) => castle(k, h),
  homes: (k, h) => homes(k, h),
  chimney: (k, h) => chimney(k, h),
  highrise: (k, h) => highrise(k, h),
  cooling: (k, h) => cooling(k, h),
  silo: (k, h) => silo(k, h),
  mast: (k, h) => mast(k, h),
  lighthouse: (k, h) => lighthouse(k, h),
  turbine: (k, h) => turbine(k, h),
  bridge: (k, h) => bridge(k, h),
  palms: (k, h) => palms(k, h),
  orchard: (k, h, d) => orchard(k, h, d),
  vineyard: (k, h, d) => vineyard(k, h, d),
  solar: (k, h, d) => solar(k, h, d),
  westernWall,
  babShrine: (k, h) => babShrine(k, h),
  azrieli,
  chordsBridge,
}

export const isField = (kind: GlyphKind) => Boolean(GLYPH_SPECS[kind].field)

/** The glyph's cast shadow on the ground, away from the light, and its contact shade (screen px). */
export function glyphShadow(ctx: Ctx2D, d: GlyphDesc, shine: Shine) {
  if (isField(d.kind)) return
  const half = d.w / 2
  const height = d.h * d.scale
  ctx.fillStyle = css(d.tones.deep, 0.55)
  ctx.fillRect(d.x - half - 0.2, d.base - 0.3, d.w + 0.4, 0.9)
  if (shine.cast.alpha <= 0 || !shine.cast.dx) return
  const dir = Math.sign(shine.cast.dx)
  // The shadow's reach across the screen is its run's across part: a light straight ahead or behind casts it toward or
  // away from the eye, foreshortened to a stub (it shrinks to the contact shade, never flips at full length).
  const reach = Math.min(14, shine.cast.length * height * 0.6 * Math.min(1, Math.abs(shine.cast.dx) * 1.6))
  if (reach <= 0) return
  const from = d.x + dir * half, to = d.x + dir * (half + reach)
  const g = ctx.createLinearGradient(from, 0, to, 0)
  // Fade the cast through its last screen pixel, leaving only the contact shade.
  g.addColorStop(0, css(d.tones.shade, shine.cast.alpha * Math.min(1, reach)))
  g.addColorStop(1, css(d.tones.shade, 0))
  ctx.beginPath()
  ctx.moveTo(d.x - dir * half, d.base)
  ctx.lineTo(d.x + dir * half, d.base - 0.2)
  ctx.lineTo(to, d.base + 0.6)
  ctx.lineTo(to - dir * Math.min(1.2, reach), d.base + 1.3)
  ctx.lineTo(d.x - dir * half, d.base + 1.3)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

/**
 * Draws one glyph's body at its base (screen px, the layer's transform), the light on its side; returns its lamps in
 * screen px, to be laid after the grain.
 */
export function drawGlyph(ctx: Ctx2D, d: GlyphDesc, shine: Shine): Lamp[] {
  const { hand } = d
  ctx.save()
  ctx.translate(d.x, d.base)
  ctx.scale(d.scale * hand, d.scale)
  const k = new Kit(ctx, d.tones, shine, d.seed, hand * glyphLight(shine))
  DRAW[d.kind](k, d.h, d)
  ctx.restore()
  return k.lamps.map((l) => ({ ...l, x: d.x + l.x * d.scale * hand, y: d.base + l.y * d.scale, r: l.r * Math.max(0.7, d.scale) }))
}

/** Signed lateral light, positive from screen-left. */
export function glyphLight(shine: Shine): number {
  const f = shine.faces
  return f ? Math.max(-1, Math.min(1, f.left - f.right)) : 0
}

/** Lamps: a soft halo, then the hot core (screen px). */
export function drawLamps(ctx: Ctx2D, lamps: readonly Lamp[], hair: number) {
  for (const l of lamps) {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r)
    g.addColorStop(0, css(l.c, 0.55 * l.a))
    g.addColorStop(0.35, css(l.c, 0.18 * l.a))
    g.addColorStop(1, css(l.c, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(l.c, Math.min(1, l.a + 0.1))
    const s = Math.max(hair, 0.5)
    ctx.fillRect(l.x - s / 2, l.y - s / 2, s, s)
  }
}
