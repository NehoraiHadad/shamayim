import type { LayerOf, OutsideLandDesc, RGB, SeaDesc, Shine, Tones, TreeDesc } from '../../../../src/scene/model/types'
import { paintTownGlyph } from '../../../../src/scene/paint/drawn/townGlyph'
import { skyFormIn } from '../../../../src/scene/paint/drawn/outsideOwn'
import { townBodies } from '../../../../src/scene/paint/drawn/townBlocks'
import { townLight } from '../../../../src/scene/paint/drawn/townLight'
import { css, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { running, twinkling } from '../../../../src/scene/paint/shared/land/water'
import { castShadow, TOWER_CAST, TOWER_CONTACT } from '../../../../src/scene/paint/shared/town/castShadow'
import { drawLamps, glyphLight, glyphShadow } from '../../../../src/scene/paint/shared/town/glyphs'
import type { Lamp } from '../../../../src/scene/paint/shared/town/glyphs/kit'
import { rockOf } from '../../../../src/scene/paint/shared/town/marks'
import { stripPhase } from '../../../../src/scene/paint/shared/town/stripPhase'
import { cutBlock, cutTower } from './townBody'
import { cutTree } from './townTree'
import { mixed } from './townTones'
import { pigment } from './palette'
import { dashes, flat } from './water'

/*
 * The place seen from outside, cut from paper: the model's land, sea, houses, towers, trees and marks in their own order
 * and places, each body three clean planes (front, lit side, shade side) of warm stone against cool shade.
 */

const GROWN = 1.25, GROWN_MIN = 2.6

export function paintCutOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s } = desc, form = skyFormIn(desc)
  if (!form) return
  const light = townLight(s, form), lateral = glyphLight(s), tiers = desc.tiers.map(mixed)
  if (desc.land) land(ctx, desc.land, s)
  if (desc.sea) sea(ctx, desc.sea, s, stripPhase(desc, env))
  for (const item of desc.items) {
    if (item.kind === 'tower') castShadow(ctx, item, tiers[item.tier], s.cast, TOWER_CONTACT, TOWER_CAST)
    else if (item.kind === 'mark') glyphShadow(ctx, item.glyph, s)
  }
  const lamps: Lamp[] = []
  for (const { block, item } of townBodies(desc.items)) {
    if (block) cutBlock(ctx, block, tiers[block.tier], light, lamps, s.windows)
    else if (item.kind === 'tower') cutTower(ctx, item, tiers[item.tier], light, s, lamps)
    else if (item.kind === 'tree') cutTree(ctx, grown(item.tree), tiers[item.tier], s, lateral, rockOf(desc, env, item.tree.seed))
    else lamps.push(...paintTownGlyph(ctx, { ...item.glyph, tones: mixed(item.glyph.tones) }, s))
  }
  drawLamps(ctx, lamps, 1 / env.scale)
}

export function paintCutMarks(ctx: Ctx2D, desc: LayerOf<'marks'>, env: PaintEnv): void {
  const glyphs = [...desc.glyphs].sort((a, b) => a.base - b.base)
  for (const g of glyphs) glyphShadow(ctx, g, desc.shine)
  drawLamps(ctx, glyphs.flatMap((g) => paintTownGlyph(ctx, { ...g, tones: mixed(g.tones) }, desc.shine)), 1 / env.scale)
}

function grown(tree: TreeDesc): TreeDesc {
  const by = Math.max(GROWN, GROWN_MIN / tree.w)
  return { ...tree, w: tree.w * by, h: tree.h * Math.min(by, 1.2) }
}

/** The place's own ground: its tone stops as patches with slanted edges, and its crest. */
function land(ctx: Ctx2D, l: OutsideLandDesc, shine: Shine) {
  outline(ctx, [...l.top, ...[...l.base].reverse()])
  ctx.fillStyle = css(pigment(l.tone, 0.2))
  ctx.fill()
  const x0 = l.top[0][0], w = l.top[l.top.length - 1][0] - x0
  ctx.save()
  ctx.clip()
  l.stops.forEach(([t, rgb], i) => {
    const from = i ? (l.stops[i - 1][0] + t) / 2 : -1, to = i < l.stops.length - 1 ? (t + l.stops[i + 1][0]) / 2 : 2
    const y0 = Math.min(...l.top.map((p) => p[1])), y1 = Math.max(...l.base.map((p) => p[1])), skew = (y1 - y0) * 0.6
    ctx.fillStyle = css(pigment(rgb, i % 2 ? 0.35 : -0.1))
    outline(ctx, [[x0 + from * w + skew, y0], [x0 + to * w + skew + 1, y0], [x0 + to * w - skew + 1, y1], [x0 + from * w - skew, y1]])
    ctx.fill()
  })
  ctx.restore()
  ctx.beginPath()
  l.top.forEach(([x, y], i) => (i && l.base[i][1] - y > 2.2 ? ctx.lineTo(x, y + 0.35) : ctx.moveTo(x, y + 0.35)))
  ctx.strokeStyle = css(pigment(l.rim, 0.5) as RGB, 0.6 * (1 - 0.5 * shine.night))
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function sea(ctx: Ctx2D, s: SeaDesc, shine: Shine, t: number) {
  const xs = s.points.map((p) => p[0])
  outline(ctx, s.points)
  flat(ctx, s.stops, Math.min(...xs), Math.max(...xs), s.top, s.bottom, 91)
  ctx.save()
  outline(ctx, s.points)
  ctx.clip()
  const ripples = running(s.ripples, t, s.drift ?? 0, 0), lit = 1 - 0.5 * shine.night
  dashes(ctx, ripples, pigment(s.light, 0.2), 0.8 * lit)
  dashes(ctx, ripples.map((r) => ({ ...r, y: r.y + 1 })), pigment(s.dark, -0.4), 0.6)
  if (s.glint) dashes(ctx, twinkling(s.glint.sparks, t), pigment(s.glint.rgb, 0.4), 0.9, 1)
  ctx.restore()
  ctx.fillStyle = css(pigment(s.horizon.rgb), s.horizon.alpha * lit)
  ctx.fillRect(s.horizon.x0, s.horizon.y - 0.3, s.horizon.x1 - s.horizon.x0, 0.6)
  ctx.strokeStyle = css(pigment(s.shore, 0.5), 0.8 - 0.4 * shine.night)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  s.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

/** The far towns' tiers in the hand's colours. */
export function mixedTiers<T>(value: T): T {
  if (Array.isArray(value)) {
    if (value.length === 3 && value.every((c) => typeof c === 'number' && c >= 0 && c <= 1)) return pigment(value as unknown as RGB, 0.2) as unknown as T
    return value.map(mixedTiers) as unknown as T
  }
  return value
}
