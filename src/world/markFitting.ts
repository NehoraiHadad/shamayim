import { neighbourSize } from './neighbourSize'
import { neighbourRule } from './neighbourPolicy'
import type { PlacedMark } from '../data/landmarks/types'
import { seat } from '../data/landmarks/seat'
import { settlementReach, type SettlementStyle } from '../data/landmarks/settlement'
import { fieldReach, GLYPH_SPECS, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, SHEET_CLEAR, shifts, VISIBLE_BOTTOM, type Box, type Point } from './layout'
import type { WorldMark } from './markGeometry'
import type { MarksInput } from './marks'
import { angularMark, kmAlong } from './markPerspective'

/** Owned marks may lift by six px to clear the sheet edge; far owned portraits retain their 0.6 scale. */
const MAX_LIFT = 6, FAR_SCALE = .6
/** Minimum field depth below the crest (px), shared with owned-field reprojection. */
export const MIN_FIELD_DEPTH = 1
type Ground = (x: number) => number
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Where a building glyph stands: its base, drawn height, scale and box; null when it cannot stand there. */
function building(mark: PlacedMark, kind: NonNullable<ReturnType<typeof glyphOf>>, x: number, ground: Ground, far:
  boolean) {
  const spec = GLYPH_SPECS[kind]
  if (mark.layer === 'plain') {
    const h = spec.h(mark.hPx)
    const scale = mark.hPx / h
    const base = mark.visibleTopY === undefined ? mark.baseY : mark.visibleTopY + mark.hPx
    return { h, scale, base }
  }
  const depth = clamp01(Math.abs(mark.dy) / 1.5)
  // The plane a near mark stands on (R1): among the roofs or on the line; well behind the line a little smaller and
  // higher; in front of it, down the face.
  const plane = far || mark.absorbed || mark.portrait || mark.landmark ? 'line' : mark.dy < -.3 ? 'face' :
    mark.dy > .3 && kind !== 'castle' ? 'behind' : 'line'
  const h = spec.h(far && mark.sightKm === undefined ? mark.hPx / FAR_SCALE : mark.hPx)
  const scale = mark.sightKm !== undefined ? mark.hPx / h : far ? FAR_SCALE : plane === 'behind' ? 1 - .2 * depth : 1
  const seated = seat(ground, x, spec.w * scale, 0, far || Boolean(mark.absorbed || mark.portrait || mark.landmark))
  if (!seated) return null
  const base = plane === 'face' ? ground(x) + 3 + 9 * depth : seated.baseY + (plane === 'behind' ?
    .25 * depth * h * scale : 0)
  return { h, scale, base }
}

/** A field's box at a depth under the ground (px). */
function fieldBox(kind: 'orchard' | 'vineyard' | 'solar', x: number, depth: number, ground: Ground): Box {
  const w = GLYPH_SPECS[kind].w
  const ys = [0, .25, .5, .75, 1].map((t) => ground(x - w / 2 + t * w))
  return { left: x - w / 2, right: x + w / 2, top: Math.min(...ys) + depth - 1.6, bottom:
    Math.max(...ys) + depth + fieldReach(kind) }
}

/**
 * The place's mark among its roofs slides up toward the crest when its true x falls down a steep face below where the
 * houses reach (across the dot if need be), to the nearest spot inside the town.
 */
function intoTown(x: number, w: number, ground: Ground, dot: Point, style: SettlementStyle) {
  const reach = settlementReach(style).down / 2
  const base = (at: number) => Math.max(ground(at - w / 2), ground(at + w / 2)) - dot.y
  if (base(x) <= reach) return x
  const clear = DOT_R + w / 2 + 1
  const toward = Math.sign(dot.x - x) || 1
  for (let at = x; Math.abs(at - x) <= 80; at += toward * 2) {
    if (Math.abs(at - dot.x) >= clear && base(at) <= reach) return at
  }
  return x
}

/** One placed mark seated and fitted to what shows; null when it does not fit. */
export function fit(mark: PlacedMark, input: MarksInput, ground: Ground, farGround: Ground): WorldMark | null {
  const { dot, width, terrain } = input
  const kind = glyphOf(mark)
  if (!kind) return null
  const spec = GLYPH_SPECS[kind]
  const named = mark.landmark ?? false
  let x = mark.xPct / 100 * width
  const km = mark.km ?? kmAlong(terrain, x, mark.layer === 'far' ? 'far' : 'near', width)
  const common = { ...mark, glyphKind: kind, named, plane: mark.layer, km }
  const famous = mark.sightKm !== undefined && neighbourRule(kind, named) === 'landmark'
  if (famous) x = mark.bearingX ?? x
  if (mark.layer === 'near' && spec.field && mark.sightKm === undefined) {
    // A field slides onto the visible face under the crest, out of the dot.
    const want = 2 + 6 * clamp01(Math.abs(mark.dy) / 1.5)
    const field = kind as 'orchard' | 'vineyard' | 'solar'
    for (const at of shifts(48, 4).map((shift) => x + shift)) {
      if (at - spec.w / 2 < 8 || at + spec.w / 2 > width - 8) continue
      const depth = Math.min(want, VISIBLE_BOTTOM - 2 - fieldBox(field, at, 0, ground).bottom)
      if (depth < MIN_FIELD_DEPTH || overlaps(fieldBox(field, at, depth, ground), boxAround(dot.x, dot.y,
        DOT_R))) continue
      const box = fieldBox(field, at, depth, ground)
      return { ...common, xPct: at / width * 100, x: at, base: box.top + 1.6, h: box.bottom - box.top - 1.6, scale: 1,
        w: spec.w,
        depth, km: Math.min(km, input.reachKm), baseY: ground(at) }
    }
    return null
  }
  if (mark.layer === 'near' && mark.absorbed) x = intoTown(x, spec.w, ground, dot, input.style)
  const geometryAt = (at: number) => famous
    ? { ...neighbourSize(kind, mark.hPx, true)!, base: mark.sourceGroundY ?? mark.baseY }
    : building(mark, kind, at, mark.layer === 'far' ? farGround : ground, mark.layer === 'far')
  let geometry = geometryAt(x)
  if (!geometry) return null
  if (mark.layer === 'near' || famous) {
    const half = spec.w * geometry.scale / 2
    const box = { left: x - half, right: x + half, top: geometry.base - geometry.h * geometry.scale, bottom:
      geometry.base }
    if (!mark.absorbed && overlaps(box, boxAround(dot.x, dot.y, DOT_R))) {
      x = dot.x + Math.sign(x - dot.x || 1) * (half + DOT_R + 1)
      geometry = geometryAt(x)
      if (!geometry) return null
    }
    const need = geometry.base - (VISIBLE_BOTTOM - SHEET_CLEAR)
    if (need > 0) {
      if (!(mark.landmark || mark.absorbed || mark.portrait) || need > MAX_LIFT) return null
      geometry = { ...geometry, base: geometry.base - need }
    }
  }
  const portraitKm = mark.portrait ? Math.min(km, input.reachKm) : km
  return angularMark({ ...common, xPct: x / width * 100, x, ...geometry,
    w: spec.w * geometry.scale, km: portraitKm, baseY: geometry.base }, terrain.horizonY)
}

