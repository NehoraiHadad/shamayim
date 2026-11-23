import { isField, type GlyphKind } from '../../../world/glyphSpecs'
import type { GlyphDesc, Shine } from '../../model/types'
import { castShadow } from '../castShadow'
import { css, type Ctx2D } from '../hand'
import { paintPass } from '../paintPass'
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
  babShrine,
  azrieli,
  chordsBridge,
}

const GLYPH_CONTACT = { alpha: .55, height: .9 }
const GLYPH_CAST = { alpha: 1, inset: 0, edgeY: -.2, tipY: .6, bottomY: 1.3, tipInset: (reach: number) => Math.min(1.2, reach) }

/** The glyph's cast shadow on the ground, away from the light, and its contact shade (screen px). */
export function glyphShadow(ctx: Ctx2D, d: GlyphDesc, shine: Shine) {
  if (isField(d.kind)) return
  const shadow = () => castShadow(ctx, { x: d.x, base: d.base, w: d.w, h: d.h * d.scale },
    d.shadowTones ?? d.tones, shine.cast, GLYPH_CONTACT, GLYPH_CAST)
  if (d.kind === 'palms') paintPass(ctx, 'background', shadow)
  else shadow()
}

/**
 * Draws one glyph at its base (screen px, the layer's transform) with signed glyph-space light. Returns its lamps in
 * screen px, to be laid after the grain.
 */
export function drawGlyph(ctx: Ctx2D, d: GlyphDesc, shine: Shine): Lamp[] {
  return placeGlyph(ctx, d, () => {
    const k = new Kit(ctx, d.tones, shine, d.seed, d.hand * glyphLight(shine), d.surfaces, d.windowWall, d.shadowTones?.deep)
    if (isField(d.kind) || d.kind === 'palms') paintPass(ctx, 'background', () => drawGlyphShape(k, d))
    else drawGlyphShape(k, d)
    return k.lamps
  })
}

export const drawGlyphShape = (kit: Kit, glyph: GlyphDesc) => DRAW[glyph.kind](kit, glyph.h, glyph)

export function placeGlyph(ctx: Ctx2D, d: GlyphDesc, draw: () => Lamp[]): Lamp[] {
  const { hand } = d
  ctx.save()
  ctx.translate(d.x, d.base)
  ctx.scale(d.scale * hand, d.scale)
  const lamps = draw()
  ctx.restore()
  return lamps.map((l) => ({ ...l, x: d.x + l.x * d.scale * hand, y: d.base + l.y * d.scale,
    r: l.r * Math.max(0.7, d.scale),
    ...(d.contrast === undefined ? {} : { fade: (l.fade ?? 1) * Math.cbrt(d.contrast) }) }))
}

/** Signed lateral light, positive from screen-left. */
export function glyphLight(shine: Shine): number {
  const f = shine.faces
  return f ? Math.max(-1, Math.min(1, f.left - f.right)) : 0
}

/** Lamps: a soft halo, then the hot core (screen px). */
export function drawLamps(ctx: Ctx2D, lamps: readonly Lamp[], hair: number) {
  if (lamps.length) paintPass(ctx, 'emission', () => paintLamps(ctx, lamps, hair))
}

function paintLamps(ctx: Ctx2D, lamps: readonly Lamp[], hair: number) {
  for (const l of lamps) {
    const fade = l.fade ?? 1
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r)
    g.addColorStop(0, css(l.c, 0.55 * l.a * fade))
    g.addColorStop(0.35, css(l.c, 0.18 * l.a * fade))
    g.addColorStop(1, css(l.c, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(l.c, Math.min(1, l.a + 0.1) * fade)
    const s = Math.max(hair, 0.5)
    ctx.fillRect(l.x - s / 2, l.y - s / 2, s, s)
  }
}
