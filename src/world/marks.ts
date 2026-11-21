import type { Place } from '../config/place'
import { inSkylineReach, isOwnSpot, lieBaseY, outsideProject, sameTower, type OutsideFrame, type PlaceLie } from '../data/city/outsideView'
import type { CityTower } from '../data/city/types'
import { industrialNamed, landmarkBeyond } from '../data/landmarks/industrial'
import { isGenericHighrise, placeMarks } from '../data/landmarks/placeMarks'
import { PORTRAIT_MARGIN_KM } from '../data/landmarks/portrait'
import { distanceOf, offsetKm } from '../data/landmarks/project'
import { groundFn, seat } from '../data/landmarks/seat'
import { settlementReach, type SettlementStyle } from '../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import { beyondMarks, nearBeyondKept } from './beyondMarks'
import { rowKm, type SeatMark } from './beyondSeat'
import { fieldReach, GLYPH_SPECS, glyphOf } from './glyphSpecs'
import { boxAround, DOT_R, overlaps, SHEET_CLEAR, shifts, VISIBLE_BOTTOM, type Box, type Point } from './layout'
import { lookOf } from './outside'
import type { WorldMark } from './types'

/**
 * The place's marks (stage C4): which landmarks show, where and how large, by the portrait and outside rules, for every
 * place alike. The choice is the data layer's (`placeMarks`: rank, fame, the side rule of the portrait, the few
 * landmarks a portrait keeps); this module seats each on the land it stands on and fits it to what shows. It replaced
 * the SVG scene's `hillScene` (deleted at C9) and runs without composing a settlement, neighbours or a data skyline,
 * which is what made the cold world slow.
 */

/** How much a mark of the place may be lifted off the sheet edge (px) rather than dropped. */
const MAX_LIFT = 6
const FAR_SCALE = .6
const MIN_FIELD_DEPTH = 1

type Ground = (x: number) => number
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * A landmark needs a name (owner, 2026-11-19): an unnamed mark keeps its kind, not its fame, for every place; an
 * industrial structure's name must be a name (`industrial.ts`: not a status or construction note, not its operator),
 * else it is unnamed too. The place's own houses and the hand-drawn icons are named by definition.
 */
export function namedOnly(landmarks: readonly Landmark[]): Landmark[] {
  return landmarks.map((given) => {
    const mark = industrialNamed(given)
    return mark.source === 'place' || mark.source === 'curated' || mark.nameHe || !mark.fame ? mark : { ...mark, fame: undefined }
  })
}

/** Whether a mark is of the place: the shared outside ownership rule (`isOwnSpot`), or in its portrait reach (+1 km). */
function ofPlace(place: Place, mark: Landmark, reachKm: number, outside: MarksInput['outside']) {
  const { dx, dy } = offsetKm(place, mark)
  if (!outside) return Math.hypot(dx, dy) <= reachKm + PORTRAIT_MARGIN_KM
  return isOwnSpot(outside.frame, outside.lie, dx, dy)
}

/** A generic high-rise the place's own raster towers stand for (the outside view draws those; C5). */
function rasterReplaced(place: Place, landmarks: readonly Landmark[], towers: readonly CityTower[] | null) {
  if (!towers?.length) return new Set<string>()
  return new Set(landmarks.filter((mark) => mark.source === 'osm' && isGenericHighrise(mark.kind, mark.glyph)
    && inSkylineReach(distanceOf(place, mark)) && towers.some((tower) => sameTower(mark, tower))).map((mark) => mark.id))
}

export interface MarksInput {
  place: Place
  terrain: SceneTerrain
  landmarks: readonly Landmark[]
  width: number
  dot: Point
  reachKm: number
  /** Half the portrait's houses (px): other marks of the place stand outside it, its halls and towers among them. */
  homeHalf: number
  style: SettlementStyle
  /** The notes written on the land (the datum, the water's names): a mark moves aside or is left out. */
  notes: readonly NoteBox[]
  /** The place's own raster towers when it has a skyline (their generic OSM twins are left to them). */
  rasterTowers: readonly CityTower[] | null
  /**
   * The outside view for a city seen from outside (variant B, `outside.ts`): its frame, its own boundary and slope
   * (`lie`), and the near ridge's distance at the dot (the haze of its nearest row); null for a portrait.
   */
  outside: { frame: OutsideFrame; isCity: boolean; lie: PlaceLie; baseKm: number; seatMark: SeatMark
    /** The place's own ground over the ridge line (C5b): a mark moved across stands on what is there. */
    land?: { top: readonly (readonly [number, number])[] } | null } | null
}

/** Distance (km) of the land along a line of points at px x (the plane's own distances). */
function kmAlong(terrain: SceneTerrain, x: number, layer: 'near' | 'far', width: number): number {
  const sight = terrain.sightAt?.(x * 375 / width)
  if (!sight) return layer === 'near' ? 1 : 20
  return layer === 'near' ? sight.nearKm : sight.farShows ? sight.farKm : sight.nearKm
}

/** Where a building glyph stands: its base, drawn height, scale and box; null when it cannot stand there. */
function building(mark: PlacedMark, kind: NonNullable<ReturnType<typeof glyphOf>>, x: number, ground: Ground, far: boolean) {
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
  const plane = far || mark.absorbed || mark.portrait || mark.landmark ? 'line' : mark.dy < -.3 ? 'face' : mark.dy > .3 && kind !== 'castle' ? 'behind' : 'line'
  const h = spec.h(far ? mark.hPx / FAR_SCALE : mark.hPx)
  const scale = far ? FAR_SCALE : plane === 'behind' ? 1 - .2 * depth : 1
  const seated = seat(ground, x, spec.w * scale, 0, far || Boolean(mark.absorbed || mark.portrait || mark.landmark))
  if (!seated) return null
  const base = plane === 'face' ? ground(x) + 3 + 9 * depth : seated.baseY + (plane === 'behind' ? .25 * depth * h * scale : 0)
  return { h, scale, base }
}

/** A field's box at a depth under the ground (px). */
function fieldBox(kind: 'orchard' | 'vineyard' | 'solar', x: number, depth: number, ground: Ground): Box {
  const w = GLYPH_SPECS[kind].w
  const ys = [0, .25, .5, .75, 1].map((t) => ground(x - w / 2 + t * w))
  return { left: x - w / 2, right: x + w / 2, top: Math.min(...ys) + depth - 1.6, bottom: Math.max(...ys) + depth + fieldReach(kind) }
}

/** The box a placed mark covers (px), for the label and the portrait to keep clear of. */
export function markBox(mark: WorldMark): Box {
  if (mark.depth !== undefined) {
    return { left: mark.x - mark.w / 2, right: mark.x + mark.w / 2, top: mark.base - 1.6, bottom: mark.base + mark.h }
  }
  return { left: mark.x - mark.w / 2, right: mark.x + mark.w / 2, top: mark.base - mark.h * mark.scale, bottom: mark.base }
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
function fit(mark: PlacedMark, input: MarksInput, ground: Ground, farGround: Ground): WorldMark | null {
  const { dot, width, terrain } = input
  const kind = glyphOf(mark)
  if (!kind) return null
  const spec = GLYPH_SPECS[kind]
  const named = mark.landmark ?? false
  let x = mark.xPct / 100 * width
  const km = mark.layer === 'plain' ? mark.km ?? 10 : kmAlong(terrain, x, mark.layer, width)
  const common = { ...mark, glyphKind: kind, named, plane: mark.layer, km }
  if (mark.layer === 'near' && spec.field) {
    // A field slides onto the visible face under the crest, out of the dot.
    const want = 2 + 6 * clamp01(Math.abs(mark.dy) / 1.5)
    const field = kind as 'orchard' | 'vineyard' | 'solar'
    for (const at of shifts(48, 4).map((shift) => x + shift)) {
      if (at - spec.w / 2 < 8 || at + spec.w / 2 > width - 8) continue
      const depth = Math.min(want, VISIBLE_BOTTOM - 2 - fieldBox(field, at, 0, ground).bottom)
      if (depth < MIN_FIELD_DEPTH || overlaps(fieldBox(field, at, depth, ground), boxAround(dot.x, dot.y, DOT_R))) continue
      const box = fieldBox(field, at, depth, ground)
      return { ...common, xPct: at / width * 100, x: at, base: box.top + 1.6, h: box.bottom - box.top - 1.6, scale: 1, w: spec.w,
        depth, km: Math.min(km, input.reachKm), baseY: ground(at) }
    }
    return null
  }
  if (mark.layer === 'near' && mark.absorbed) x = intoTown(x, spec.w, ground, dot, input.style)
  let geometry = building(mark, kind, x, mark.layer === 'far' ? farGround : ground, mark.layer === 'far')
  if (!geometry) return null
  if (mark.layer === 'near') {
    const half = spec.w * geometry.scale / 2
    const box = { left: x - half, right: x + half, top: geometry.base - geometry.h * geometry.scale, bottom: geometry.base }
    if (!mark.absorbed && overlaps(box, boxAround(dot.x, dot.y, DOT_R))) {
      x = dot.x + Math.sign(x - dot.x || 1) * (half + DOT_R + 1)
      geometry = building(mark, kind, x, ground, false)
      if (!geometry) return null
    }
    const need = geometry.base - (VISIBLE_BOTTOM - SHEET_CLEAR)
    if (need > 0) {
      if (!(mark.landmark || mark.absorbed || mark.portrait) || need > MAX_LIFT) return null
      geometry = { ...geometry, base: geometry.base - need }
    }
  }
  const portraitKm = mark.portrait ? Math.min(km, input.reachKm) : km
  return { ...common, xPct: x / width * 100, x, ...geometry, w: spec.w * geometry.scale, km: portraitKm, baseY: geometry.base }
}

/**
 * The marks of a place, seated and fitted, in px at `width`. A portrait's marks stand by their side of the place (the data
 * layer's rule); an outside view's marks of the place stand where the one outside projection puts them (east left, north
 * nearer and lower), its far marks only when named and famous or huge, and a city's own high-rises left to its towers.
 */
export function marksOf(input: MarksInput): WorldMark[] {
  const { place, terrain, width, dot, outside } = input
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  // Beyond the place keep landmarks, settlement kinds within skyline reach (seated by px), and tall structures (C5, C9).
  const landmarks = namedOnly(input.landmarks).filter((mark) => ofPlace(place, mark, input.reachKm, outside) || landmarkBeyond(mark)
    || (outside && nearBeyondKept(place, mark)))
  const replaced = rasterReplaced(place, landmarks, input.rasterTowers)
  const kept = landmarks.filter((mark) => !replaced.has(mark.id))
  const inBox = (mark: WorldMark) => mark.x - mark.w / 2 >= 0 && mark.x + mark.w / 2 <= width
  const fitted = (placed: PlacedMark[]) => placed.flatMap((mark) => fit(mark, input, ground, farGround) ?? [])
  if (!outside) {
    return fitted(placeMarks(place, terrain, kept, width, input.homeHalf, false, { reachKm: input.reachKm }, input.notes, 'landmark'))
      .filter(inBox)
  }
  // The outside view: the place's own marks by the one projection; the marks beyond it at their true bearing.
  const own = kept.filter((mark) => ofPlace(place, mark, input.reachKm, outside))
  const { other, seated } = beyondMarks(place, kept.filter((mark) => !own.includes(mark)), width, outside.seatMark, dot, input.notes)
  const ownMarks = placeMarks(place, terrain, own, width, undefined, false, { reachKm: input.reachKm }, input.notes, 'landmark')
  const ownPlaced = new Set(ownMarks.filter((mark) => mark.portrait).map((mark) => mark.id))
  const placed = [...ownMarks, ...placeMarks(place, terrain, other, width, undefined, false, undefined, input.notes, 'landmark')]
  let marks = [...fitted(placed), ...seated]
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  const { frame, isCity, lie, baseKm } = outside
  const look = lookOf(frame)
  const landTop = outside.land?.top
  /** The land's top at x: the ridge line, or the place's own ground where it rises over it. */
  const surfaceAt = (x: number) => {
    const line = ground(x) + 1
    if (!landTop?.length || x < landTop[0][0] || x > landTop.at(-1)![0]) return line
    const i = Math.min(landTop.length - 1, Math.max(0, Math.round(x - landTop[0][0])))
    return Math.min(line, landTop[i][1] + 1)
  }
  marks = marks.map((mark) => {
    const source = own.find((item) => item.id === mark.id)
    if (!source || !mark.portrait || !ownPlaced.has(mark.id)) return mark
    const { dx, dy } = offsetKm(place, source)
    const at = outsideProject(frame, dx, dy)
    const scale = Math.max(.75, Math.min(1.3, at.k / frame.k))
    const tall = source.heightM >= 40 && (source.kind === 'custom' || source.kind === 'highrise')
    const hPx = tall && isCity ? Math.round(look.px(source.heightM, at.k)) : Math.round(mark.hPx * scale)
    const spec = GLYPH_SPECS[mark.glyphKind]
    // Clear of the dot, on its own side.
    const clear = DOT_R + 2 + spec.w / 2
    let x = Math.abs(at.x - dot.x) >= clear ? at.x : dot.x + (dx > 0 ? -clear : clear)
    // Out of the notes written on the land (the datum, the water's names), to the nearer side.
    for (const note of input.notes) {
      const base = lieBaseY(lie, ground, x, at.near, floor, 0, dx, dy)
      if (x + spec.w / 2 <= note.left || x - spec.w / 2 >= note.right || base <= note.top || base - spec.h(mark.hPx) >= note.bottom) continue
      const left = note.left - spec.w / 2 - 1, right = note.right + spec.w / 2 + 1
      x = Math.abs(x - left) <= Math.abs(right - x) ? left : right
    }
    const km = rowKm(frame, baseKm, dy)
    if (spec.field) {
      // A field lies on the face under the crest at its depth, its row's drop added (down the slope with its row); on the
      // place's own ground (C5b) its row's ground is the crest it lies under.
      const ridge = Math.min(...[0, .25, .5, .75, 1].map((t) => ground(x - mark.w / 2 + t * mark.w)))
      const own = lie.baseY ? lieBaseY(lie, ground, x, at.near, floor, 0, dx, dy) - 1 : null
      const under = own ?? ridge
      const lift = own === null ? lie.lift?.(dx, dy) ?? 0 : 0
      const depth = Math.max(MIN_FIELD_DEPTH, Math.min((mark.depth ?? 2) + Math.max(0, lift), floor - under - fieldReach(mark.glyphKind)))
      return { ...mark, xPct: x / width * 100, x, base: under + depth, baseY: under + depth, depth, km }
    }
    const h = spec.h(hPx)
    // On its own ground; moved across (off the dot, out of a note), never above the land that stands there.
    const base = Math.max(lieBaseY(lie, ground, x, at.near, floor, 0, dx, dy), Math.min(floor, surfaceAt(x)))
    return { ...mark, xPct: x / width * 100, x, hPx, h, scale: 1, w: spec.w, base, baseY: base, km }
  }).filter((mark, i, all) => !mark.portrait || mark.absorbed || GLYPH_SPECS[mark.glyphKind].field
    || all.every((other, j) => j >= i || !other.portrait || GLYPH_SPECS[other.glyphKind].field || Math.abs(other.x - mark.x) >= 6))
  return (isCity ? marks.filter((mark) => !(mark.portrait && ownPlaced.has(mark.id) && isGenericHighrise(mark.kind, mark.glyph)))
    : marks).filter(inBox)
}
