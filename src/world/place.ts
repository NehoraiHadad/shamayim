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
import { noteBoxes, sceneNotes } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { LandCover } from '../data/land/landData'
import type { WaterMask } from '../data/water/waterMask'
import { heightText } from '../text/isolate'
import { SHEET_CLEAR, VISIBLE_BOTTOM } from './layout'
import type { SeatedWorldMark, WorldMark } from './markGeometry'
import { heightLabelMarks } from './heightLabelMarks'
import { besideDot } from './heightLabel'
import { notesOnWater } from './notesOnWater'
import { portraitLabelObstacles } from './heightLabelObstacles'
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
 * spires where high), its trees, towers and marks, by true east–west and north–south. The height label by the dot
 * clears the portrait and budgeted marks. Layout is independent of the hour (`night.litShare` controls lit windows).
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
  const { marks, seatPool } = marksOf({ place, city, terrain: drawn, landmarks, seatCandidates: input.seatCandidates, width, dot, reachKm,
    homeHalf: homeHalf(reachKm, known), style: style.style, notes: noteBoxes(notes), rasterTowers: ownSkyline ? towers : null,
    outside: { frame: view.frame, isCity: true, lie: view.lie, baseKm: view.baseKm, land: view.land, seatMark: view.seatMark } })
  // A one-pixel margin on each side protects the datum stroke and antialiasing.
  const line = (datum?.segments ?? []).map(seg => ({
    left: seg.x1, right: seg.x2, top: datum!.y - 1, bottom: datum!.y + 1, priority: 'note' as const,
  }))
  const noteObstacles = noteBoxes(notes)
  const spot = besideDot(dot, label.text, [
    ...portraitLabelObstacles(view),
    ...heightLabelMarks(marks, view, drawn, noteObstacles, width),
    ...line,
    ...noteObstacles.map(note => ({ ...note, priority: 'note' as const, fixed: 'left' as const })),
  ])
  const { x, y } = spot ?? dot
  const labels: WorldLabels = { height: { ...label, x, y, backed: true }, notes, datum }
  return { marks, seatPool, labels, ownSkyline, coastalSea: view.sea, nearLine: view.nearLine, place3: { kind: 'outside', dot, reachKm, seed, skyline: view.skyline,
    frame: view.frame, bounds: view.bounds, topM: view.topM, beyond: view.beyond, beyondTowns: view.beyondTowns, baseKm: view.baseKm,
    trees: view.trees, fabric: view.fabric, roofs: style.roofs, land: view.land,
    vscale: view.vscale ? { s: view.vscale.s, h0: view.vscale.h0 } : null } }
}
