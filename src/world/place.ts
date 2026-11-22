import type { Place } from '../config/place'
import { homeCluster } from '../data/city/homeCluster'
import type { BoundsFile } from '../data/city/bounds'
import type { CityResult } from '../data/city/types'
import { clusterRoofs, clusterStyle } from '../data/landmarks/villageStyle'
import { hashId } from '../data/landmarks/hash'
import { isPlaceHomes, settlementSize } from '../data/landmarks/placeMarks'
import { portraitReach } from '../data/landmarks/portrait'
import { groundFn } from '../data/landmarks/seat'
import { desertSettlement, settlementStyle } from '../data/landmarks/settlement'
import type { Landmark } from '../data/landmarks/types'
import { noteBoxes, sceneNotes, type SceneNote } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { LandCover } from '../data/land/landData'
import type { WaterMask } from '../data/water/waterMask'
import { heightText } from '../text/isolate'
import { DOT_R, LABEL_H, LABEL_PX, overlaps, SHEET_CLEAR, textWidth, VISIBLE_BOTTOM } from './layout'
import { markBox, type SeatedWorldMark, type WorldMark } from './markGeometry'
import { marksOf } from './marks'
import { drawnTerrain, outsidePlace, type NearLine } from './outside'
import { datumOfRow, datumOnLand } from './datum'
import type { CoastalSea, OutsideView, WorldLabels } from './types'

/**
 * The house style and roofs of a place. Roofs only from evidence about the roofs (5+ mapped roof shapes, the majority
 * deciding; a town of blocks or a desert place flat), else mixed (owner, 2026-11-19).
 */
export function portraitStyle(place: Place, landmarks: readonly Landmark[], city: CityResult | null | undefined) {
  const homes = landmarks.find(isPlaceHomes)
  const size = homes ? settlementSize(homes) : 'small'
  const style = settlementStyle(place, size)
  const home = homeCluster(city?.clusters ?? [], place.nameHe)
  const footprint = home ? clusterStyle(home, desertSettlement(place)) : null
  const known = Boolean(home && footprint && (footprint !== 'tile' || clusterRoofs(home) !== undefined))
  const roofs: OutsideView['roofs'] = known ? (footprint === 'tile' ? 'tile' : 'flat') : style === 'tile' ? 'mixed' : 'flat'
  return { size, style: known && footprint ? footprint : style, roofs }
}

export interface PlaceInput {
  place: Place
  terrain: SceneTerrain
  landmarks: readonly Landmark[]
  /** Extra settlement-kind marks within skyline reach carried solely for beyond-town seating (never the own portrait). */
  seatCandidates?: readonly Landmark[]
  city?: CityResult | null
  /** The figure's width (px) the marks are laid out in. */
  width: number
  /** The place's height (m): the label it keeps clear of, and the "פני הים" datum below sea level. */
  elevation: number
  /** The places' own boundaries (C5: the outside view's frame is cut at the place's). */
  bounds?: BoundsFile | null
  /** The large water (C5: a coastal place's own sea seen from outside). */
  waterMask?: WaterMask | null
  /** The land cover (C5: every place's built cells and trees). */
  cover?: LandCover | null
}

/** Half the place's own houses (px), from its built-up reach (km); a place with no known area a small one: the other marks
 * of the place stand outside it (`marks.ts` `homeHalf`). */
export function homeHalf(reachKm: number, known: boolean): number {
  const built = known ? Math.max(0.3, reachKm - 1) : 0.5
  return Math.max(24, Math.min(64, 20 + 18 * built))
}

/**
 * The place and its marks (stages C4–C5), once its land is known (a panorama; `world.ts` keeps an unknown place while it
 * is not). Every place is seen from outside and built from its own data by one builder (`outside.ts`, owner 2026-11-19):
 * its built cells at their real heights (houses with roofs where low and sparse, blocks where dense, the jagged mass with
 * spires where high), its trees, towers and marks, by true east–west and north–south. The height label beside the dot
 * clears the budgeted marks. Layout is independent of the hour (`night.litShare` controls lit windows).
 */
export function placeOf(input: PlaceInput): { place3: OutsideView; marks: WorldMark[]; seatPool: SeatedWorldMark[]; labels: WorldLabels;
  ownSkyline: boolean; coastalSea: CoastalSea | null; nearLine: NearLine | null } {
  const { place, terrain, city, width, elevation } = input
  const landmarks = [...input.landmarks]
  const reachKm = portraitReach(city?.clusters, place.nameHe)
  const towers = city?.raster?.towers ?? city?.towers ?? []
  const rounded = Math.round(elevation)
  const label = { text: heightText(rounded), below: elevation < 0 }
  const ground = groundFn(terrain.nearPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  const seed = hashId(place.id)
  // The place's own city skyline (its raster towers within reach): the far towns start beyond it.
  const ownSkyline = Boolean(city?.raster && terrain.groundAt && terrain.angleY && terrain.sightAt)
  const style = portraitStyle(place, landmarks, city)
  const known = Boolean(homeCluster(city?.clusters ?? [], place.nameHe))
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  // Seen from outside (C5): its own frame, boundary and slope, its mass and spires, the towers beyond, its sea.
  const view = outsidePlace({ place, terrain, landmarks, city, width, centerX, reachKm, ground, floor,
    bounds: input.bounds, mask: input.waterMask, cover: input.cover })
  // The land as drawn: the near land the outside view lays (the place's own ground and what truly stands behind it, on its
  // scale), the panorama's ridge beyond the place's span; the marks and the datum stand on it.
  const drawn = drawnTerrain(terrain, view.nearLine)
  const drawnGround = groundFn(drawn.nearPoints, width)
  // The dot on the place's one vertical scale (owner decision 14: under the near ridge's crest by the crest's height over
  // it); without the local ground, on the drawn ridge (not on the raw middle sample, which can float over the curve).
  const dot = { x: centerX, y: view.vscale?.dotY ?? drawnGround(centerX) }
  // Below sea level, the "פני הים" datum where the picture's own scale puts 0 m (`datum.ts`), cut against the slopes that
  // reach it.
  const seaLevel = elevation < 0 && view.seaLevelY !== null && view.seaLevelY < dot.y ? { y: view.seaLevelY } : null
  const ends = seaLevel ? view.zeroAlongRow() : null
  const to375 = (x: number | null) => x === null ? null : x * 375 / width
  // A contour lies on land: the line only where it stands over the drawn land (the near land, the far land over it).
  const farY = groundFn(drawn.farPoints, width), landY = (x375: number) => Math.min(drawnGround(x375 * width / 375), farY(x375 * width / 375))
  const row = seaLevel && ends ? datumOfRow(seaLevel.y, centerX * 375 / width, { left: to375(ends.left), right: to375(ends.right) }) : null
  const datum = row ? datumOnLand(row, landY, centerX * 375 / width) : null
  const notes0 = sceneNotes(datum ? { ...terrain, seaY: datum.y } : terrain, Boolean(datum), width, datum ?? undefined)
  const notes = notesOnWater(notes0, terrain, view, dot, width)
  const { marks, seatPool } = marksOf({ place, terrain: drawn, landmarks, seatCandidates: input.seatCandidates, width, dot, reachKm,
    homeHalf: homeHalf(reachKm, known), style: style.style, notes: noteBoxes(notes), rasterTowers: ownSkyline ? towers : null,
    outside: { frame: view.frame, isCity: true, lie: view.lie, baseKm: view.baseKm, land: view.land, seatMark: view.seatMark } })
  // The label sits beside the dot, level with it, on a small backing (`backed`, C9 defect 4), whatever the place builds
  // round it, so it always reads as the dot's; clear of the marks and the datum's dashed line, the near side first.
  const line = (datum?.segments ?? []).map((seg) => ({ left: seg.x1 * width / 375, right: seg.x2 * width / 375, top: datum!.y - 1, bottom: datum!.y + 1 }))
  const spot = besideDot(dot, label.text, width, [...marks.filter((m) => m.plane !== 'far').map(markBox), ...line], notes)
  const labels: WorldLabels = { height: { ...label, x: spot.x, y: spot.y, backed: true }, notes, datum }
  return { marks, seatPool, labels, ownSkyline, coastalSea: view.sea, nearLine: view.nearLine, place3: { kind: 'outside', dot, reachKm, seed, skyline: view.skyline,
    frame: view.frame, bounds: view.bounds, topM: view.topM, beyond: view.beyond, beyondTowns: view.beyondTowns, baseKm: view.baseKm,
    trees: view.trees, fabric: view.fabric, roofs: style.roofs, land: view.land,
    vscale: view.vscale ? { s: view.vscale.s, h0: view.vscale.h0 } : null } }
}

/** Air between the dot's ring and the label's backing, and the backing's own margin round the text (px). */
const BESIDE_GAP = 2
export const BACKING_PAD = 2.5

/**
 * The height label beside the dot (C9 defect 4), for every place seen from outside: level with the dot, on the right of
 * it, else on its left, else a few px up or down, clear of the marks and the notes and inside the figure; its backing
 * (`BACKING_PAD` round the text) carries it over the place's mass, so the mass does not give way to it. Returns its centre
 * x and top.
 */
export function besideDot(dot: { x: number; y: number }, text: string, width: number, obstacles: { left: number; right: number; top: number; bottom: number }[],
  notes: WorldLabels['notes']): { x: number; y: number } {
  const w = textWidth(text, LABEL_PX)
  const off = DOT_R + BESIDE_GAP + BACKING_PAD + w / 2
  const all = [...obstacles, ...notes.map((n) => ({ left: n.left, right: n.left + n.width, top: n.top, bottom: n.top + n.height }))]
  const top0 = dot.y - LABEL_H / 2
  // Level first, a little up or down; then a few px farther out; then higher or lower still.
  const tries = [...[0, -2, 2, -4, 4, -6, 6, -9, 9].map((d) => [d, 0]), ...[4, 8, 14].flatMap((o) => [0, -4, 4].map((d) => [d, o])),
    ...[-12, 12, -15, 15].map((d) => [d, 0])]
  // No spot free (a dot ringed by marks): the one that covers least of them, on its backing.
  let least: { x: number; y: number; cover: number } | null = null
  for (const [dy, out] of tries) {
    for (const side of [1, -1]) {
      const x = dot.x + side * (off + out), y = Math.min(VISIBLE_BOTTOM - 1 - LABEL_H - BACKING_PAD, top0 + dy)
      const box = { left: x - w / 2 - BACKING_PAD, right: x + w / 2 + BACKING_PAD, top: y - BACKING_PAD, bottom: y + LABEL_H + BACKING_PAD }
      if (box.left < 2 || box.right > width - 2) continue
      const cover = all.reduce((sum, o) => sum + Math.max(0, Math.min(box.right, o.right) - Math.max(box.left, o.left))
        * Math.max(0, Math.min(box.bottom, o.bottom) - Math.max(box.top, o.top)), 0)
      if (cover === 0 && all.every((o) => !overlaps(box, o, 0.5))) return { x, y }
      if (!least || cover < least.cover) least = { x, y, cover }
    }
  }
  return least ? { x: least.x, y: least.y } : { x: dot.x + off, y: Math.min(VISIBLE_BOTTOM - 1 - LABEL_H - BACKING_PAD, top0) }
}

/**
 * A water name's letters (the note's box less its line's air: Hebrew at the notes' small type stands ~7 px tall, 3 px
 * under the box's top) stay inside its water by this much (px) and above the sheet's edge (`VISIBLE_BOTTOM`).
 */
const GLYPH = { top: 3, bottom: 10 }
const NOTE_INSET = 1

/**
 * The water's names over a place seen from outside (C9 defect 5): **a name is written on its water's surface as drawn**,
 * never in the sky over a thin far edge nor among what the place builds. On its body's own water where the surface shows
 * deep enough under the far shore for the text (along the stretch, nearest its middle first), clear of the place's mass,
 * towers, trees, the towers beyond and the dot; else, for the sea, on the outside view's own coastal sea (its polygon, the
 * same clearances); else unnamed. The datum's note stays as it is.
 */
export function notesOnWater(notes: readonly SceneNote[], terrain: Pick<SceneTerrain, 'water'>, view: Pick<OutsideView, 'skyline' | 'trees' | 'beyond' | 'beyondTowns'> & { sea: CoastalSea | null },
  dot: { x: number; y: number }, width: number): SceneNote[] {
  const scale = width / 375
  const blocks = [...view.skyline.boxes.map((b) => ({ left: b.x - b.w / 2, right: b.x + b.w / 2, top: b.top - 2.5, bottom: b.foot })),
    ...[...view.skyline.towers, ...view.beyond].map((t) => ({ left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.baseY - t.h, bottom: t.baseY })),
    ...view.trees.map((t) => ({ left: t.x - t.w, right: t.x + t.w, top: t.base - t.h, bottom: t.base })),
    ...(view.beyondTowns ?? []).map((b) => ({ left: b.x - b.w / 2, right: b.x + b.w / 2, top: b.baseY - b.h, bottom: b.baseY })),
    { left: dot.x - DOT_R - 1, right: dot.x + DOT_R + 1, top: dot.y - DOT_R - 1, bottom: dot.y + DOT_R + 1 }]
    .map((b) => ({ left: b.left * scale, right: b.right * scale, top: b.top, bottom: b.bottom }))
  const out: SceneNote[] = notes.filter((n) => n.kind !== 'water')
  const clear = (n: SceneNote) => n.top + GLYPH.bottom <= VISIBLE_BOTTOM - 0.5 && n.left >= 4 && n.left + n.width <= width - 4
    && blocks.every((b) => !overlaps({ left: n.left, right: n.left + n.width, top: n.top, bottom: n.top + n.height }, b, 1))
    && out.every((o) => !overlaps({ left: n.left, right: n.left + n.width, top: n.top, bottom: n.top + n.height },
      { left: o.left, right: o.left + o.width, top: o.top, bottom: o.top + o.height }, 1))
  for (const note of notes.filter((n) => n.kind === 'water')) {
    const spans = (terrain.water ?? []).filter((sp) => sp.name === note.text)
    let placed: SceneNote | null = null
    // On its own water: every ray of every stretch where the text's box fits between the far shore and the near edge.
    const spots: { x: number; d: number; top: number }[] = []
    for (const sp of spans) {
      const mid = (sp.from + sp.to) / 2
      for (const e of sp.edges) {
        const half = note.width / scale / 2
        if (e.x - half < sp.from || e.x + half > sp.to) continue
        const near = sp.edges.filter((o) => Math.abs(o.x - e.x) <= half)
        // The shore's own raggedness (a cove, a spit) under a letter or two is let pass: the most of the text on water.
        const q = (v: number[], t: number) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(t * v.length))]
        const far = q(near.map((o) => o.farY), .8), nearY = q(near.map((o) => o.nearY), .2)
        if (nearY - far >= GLYPH.bottom - GLYPH.top + 2 * NOTE_INSET) spots.push({ x: e.x, d: Math.abs(e.x - mid), top: far + NOTE_INSET - GLYPH.top })
      }
    }
    spots.sort((a, b) => a.d - b.d)
    for (const sp of spots) {
      const n = { ...note, left: sp.x * scale - note.width / 2, top: sp.top }
      if (clear(n)) { placed = n; break }
    }
    // Else the sea on the outside view's coastal sea: its rows from the horizon down, nearest the coast's open side first.
    const sea = view.sea
    if (!placed && sea && spans.some((sp) => sp.kind === 'sea')) {
      const poly = sea.points.map(([x, y]) => [x * scale, y] as const)
      const inside = (x: number, y: number) => {
        let hit = false
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i], [xj, yj] = poly[j]
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
        }
        return hit
      }
      const xs = poly.map(([x]) => x)
      const x0 = Math.min(...xs), x1 = Math.max(...xs)
      search: for (let top = sea.top + NOTE_INSET - GLYPH.top; top + GLYPH.bottom <= Math.min(sea.bottom, VISIBLE_BOTTOM - 0.5); top += 1) {
        const order = sea.side === 'right' ? 1 : -1
        for (let k = 0; k <= (x1 - x0); k += 3) {
          const left = order > 0 ? x1 - note.width - NOTE_INSET - k : x0 + NOTE_INSET + k
          const n = { ...note, left, top }
          const corners = [[left, top + GLYPH.top], [left + note.width, top + GLYPH.top], [left, top + GLYPH.bottom], [left + note.width, top + GLYPH.bottom]] as const
          if (corners.every(([x, y]) => inside(x, y)) && clear(n)) { placed = n; break search }
        }
      }
    }
    if (placed) out.push(placed)
  }
  return out
}
