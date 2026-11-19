import type { GlyphKind } from '../../../world/glyphSpecs'
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

/**
 * The glyph library (stage C4): the 18 drawn mark kinds and the 4 hand-drawn icons, each a function of its kit (tones,
 * the shared light, its seed), its drawn height and its desc. A glyph is drawn with the light on the left and mirrored
 * when the light is on the right; the icons whose shape is not symmetric (the Western Wall's margins, Azrieli's three
 * towers, the Chords Bridge's lean) keep their shape and take the light's side as `side` instead.
 */
type Draw = (k: Kit, h: number, d: GlyphDesc, side: 1 | -1 | 0) => void

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
  westernWall: (k, h, _d, side) => westernWall(k, h, side),
  babShrine: (k, h) => babShrine(k, h),
  azrieli: (k, h, _d, side) => azrieli(k, h, side),
  chordsBridge: (k, h, _d, side) => chordsBridge(k, h, side),
}

/** Glyphs drawn for the light's side rather than mirrored; fields, which follow the ground, are never mirrored. */
const SIDED = new Set<GlyphKind>(['westernWall', 'azrieli', 'chordsBridge', 'orchard', 'vineyard', 'solar'])
const FIELDS = new Set<GlyphKind>(['orchard', 'vineyard', 'solar'])

export const isField = (kind: GlyphKind) => FIELDS.has(kind)

/** The glyph's cast shadow on the ground, away from the light, and its contact shade (screen px). */
export function glyphShadow(ctx: Ctx2D, d: GlyphDesc, shine: Shine) {
  if (FIELDS.has(d.kind)) return
  const half = d.w / 2
  const height = d.h * d.scale
  ctx.fillStyle = css(d.tones.deep, 0.55)
  ctx.fillRect(d.x - half - 0.2, d.base - 0.3, d.w + 0.4, 0.9)
  if (shine.cast.alpha <= 0.01 || !shine.cast.dx) return
  const dir = Math.sign(shine.cast.dx)
  const reach = Math.min(14, shine.cast.length * height * 0.6 + 1)
  const from = d.x + dir * (half - 1), to = d.x + dir * (half + reach)
  const g = ctx.createLinearGradient(from, 0, to, 0)
  g.addColorStop(0, css(d.tones.shade, shine.cast.alpha))
  g.addColorStop(1, css(d.tones.shade, 0))
  ctx.beginPath()
  ctx.moveTo(d.x - dir * (half - 1), d.base)
  ctx.lineTo(d.x + dir * half, d.base - 0.2)
  ctx.lineTo(to, d.base + 0.6)
  ctx.lineTo(to - dir * 1.2, d.base + 1.3)
  ctx.lineTo(d.x - dir * (half - 1), d.base + 1.3)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

/**
 * Draws one glyph's body at its base (screen px, the layer's transform), the light on its side; returns its lamps in
 * screen px, to be laid after the grain.
 */
export function drawGlyph(ctx: Ctx2D, d: GlyphDesc, shine: Shine): Lamp[] {
  const side = d.litSide === 'left' ? 1 : d.litSide === 'right' ? -1 : 0
  const mirror = side < 0 && !SIDED.has(d.kind) ? -1 : 1
  ctx.save()
  ctx.translate(d.x, d.base)
  ctx.scale(d.scale * mirror, d.scale)
  const k = new Kit(ctx, d.tones, shine, d.seed, side === 0)
  DRAW[d.kind](k, d.h, d, side)
  ctx.restore()
  return k.lamps.map((l) => ({ ...l, x: d.x + l.x * d.scale * mirror, y: d.base + l.y * d.scale, r: l.r * Math.max(0.7, d.scale) }))
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
