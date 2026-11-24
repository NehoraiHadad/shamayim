import { localTownAt } from './markContext'
import type { Place } from '../config/place'
import { lieBaseY, outsideProject, type OutsideFrame, type PlaceLie } from '../data/city/outsideView'
import type { CityResult, CityTower } from '../data/city/types'
import { isGenericHighrise, placeMarks } from '../data/landmarks/placeMarks'
import { offsetKm } from '../data/landmarks/project'
import { groundFn } from '../data/landmarks/seat'
import { type SettlementStyle } from '../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../data/landmarks/types'
import type { NoteBox } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import { beyondMarks } from './beyondMarks'
import { beyondKm, type SeatMark } from './beyondSeat'
import { fieldReach, GLYPH_SPECS } from './glyphSpecs'
import { DOT_R, SHEET_CLEAR, VISIBLE_BOTTOM, type Point } from './layout'
import { markCandidates } from './markCandidates'
import type { SeatedWorldMark, WorldMark } from './markGeometry'
import { markPerspective } from './markPerspective'
import { lookOf } from './outside'
import { heldToHouses, isOwnLandmark } from './village/landmarks'
import type { VillageLie } from './village/lay'

/**
 * The place's marks (stage C4): which landmarks show, where and how large, by the portrait and outside rules, for every
 * place alike. The choice is the data layer's (`placeMarks`: rank, fame, the side rule of the portrait, the few
 * landmarks a portrait keeps); this module seats each on the land it stands on and fits it to what shows. It replaced
 * the SVG scene's `hillScene` (deleted at C9) and runs without composing a settlement, neighbours or a data skyline,
 * which is what made the cold world slow.
 */

import { fit, MIN_FIELD_DEPTH } from './markFitting'

export interface MarksInput {
  place: Place
  city?: CityResult | null
  terrain: SceneTerrain
  landmarks: readonly Landmark[]
  /** Extra settlement-kind marks within skyline reach carried solely for beyond-town seating (never the own portrait). */
  seatCandidates?: readonly Landmark[]
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
  outside: { frame: OutsideFrame; isCity: boolean; lie: PlaceLie; baseKm: number; seatMark: SeatMark | null
    /** The village laid on it: its own landmarks stand among its houses, held to their size. */
    village?: VillageLie | null
    /** The place's own ground over the ridge line (C5b): a mark moved across stands on what is there. */
    land?: { top: readonly (readonly [number, number])[] } | null } | null
}

/**
 * The marks of a place, seated and fitted, in px at `width`. A portrait's marks stand by their side of the place (the data
 * layer's rule); an outside view's marks of the place stand where the one outside projection puts them (east left, north
 * nearer and lower), its far marks only when named and famous or huge, and a city's own high-rises left to its towers.
 */
export function marksOf(input: MarksInput): { marks: WorldMark[]; seatPool: SeatedWorldMark[] } {
  const { place, terrain, width, dot, outside } = input
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  const { own, beyond } = markCandidates(input)
  const inBox = (mark: WorldMark) => mark.x - mark.w / 2 >= 0 && mark.x + mark.w / 2 <= width
  const fitted = (placed: PlacedMark[]) => placed.flatMap((mark) => fit(mark, input, ground, farGround) ?? [])
  if (!outside) {
    const marks = fitted(placeMarks(place, terrain, own, width, input.homeHalf, false, { reachKm: input.reachKm }, input.notes, 'landmark'))
    return { marks: marks.filter(inBox), seatPool: [] }
  }
  // The outside view: the place's own marks by the one projection; the marks beyond it at their true bearing.
  const perspective = markPerspective(place, terrain, outside.frame, outside.baseKm, input.city)
  const { other, seated, seatPool } = beyondMarks(place, beyond, width, outside.seatMark, dot, input.notes,
    mark => localTownAt(input.city, mark) === true)
  const ownMarks = placeMarks(place, terrain, own, width, undefined, false, { reachKm: input.reachKm }, input.notes, 'landmark')
  const ownPlaced = new Set(ownMarks.filter((mark) => mark.portrait).map((mark) => mark.id))
  const otherMarks = placeMarks(place, terrain, other, width, undefined, false, undefined,
    input.notes, 'landmark', perspective)
  const placed = [...ownMarks, ...otherMarks]
  let marks = [...fitted(placed), ...seated]
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  const { isCity, baseKm, village } = outside
  const townLook = lookOf(outside.frame)
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
    const inVillage = village && isOwnLandmark(village.village, dx, dy) ? village : null
    const { frame, lie } = inVillage ?? outside, look = inVillage ? lookOf(frame, inVillage.village) : townLook
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
    const km = beyondKm(outside.frame, baseKm, dx, dy)
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
    const held = inVillage ? heldToHouses(h, source.heightM, inVillage.village, at.k / frame.k) : 1
    return { ...mark, xPct: x / width * 100, x, hPx, h, scale: held, w: spec.w * held, base, baseY: base, km }
  }).filter((mark, i, all) => !mark.portrait || mark.absorbed || GLYPH_SPECS[mark.glyphKind].field
    || all.every((other, j) => j >= i || !other.portrait || GLYPH_SPECS[other.glyphKind].field || Math.abs(other.x - mark.x) >= 6))
  const kept = isCity ? marks.filter((mark) => !(mark.portrait && ownPlaced.has(mark.id) && isGenericHighrise(mark.kind, mark.glyph))) : marks
  return { marks: kept.filter(inBox), seatPool }
}
