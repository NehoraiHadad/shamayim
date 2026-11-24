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
import type { SceneTerrain } from '../data/terrain/terrain'
import type { LandCover } from '../data/land/landData'
import { settlementOf } from '../data/village/settlementOf'
import type { VillageTile } from '../data/village/tile'
import type { WaterMask } from '../data/water/waterMask'
import { SHEET_CLEAR, VISIBLE_BOTTOM } from './layout'
import type { SeatedWorldMark, WorldMark } from './markGeometry'
import { marksOf } from './marks'
import { drawnTerrain, outsidePlace, type NearLine } from './outside'
import type { CoastalSea, OutsideView } from './types'
import { watersShown } from './watersShown'

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
  /** The places' own boundaries (C5: the outside view's frame is cut at the place's). */
  bounds?: BoundsFile | null
  /** The large water (C5: a coastal place's own sea seen from outside). */
  waterMask?: WaterMask | null
  /** The land cover (C5: every place's built cells and trees). */
  cover?: LandCover | null
  /** The footprint tile the place is in (null: none). */
  village?: VillageTile | null
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
 * spires where high), its trees, towers and marks, by true east–west and north–south. Layout is
 * independent of the hour (`night.litShare` controls lit windows).
 */
export function placeOf(input: PlaceInput): { place3: OutsideView; marks: WorldMark[]; seatPool: SeatedWorldMark[];
  ownSkyline: boolean; watersShown: string[]; coastalSea: CoastalSea | null; nearLine: NearLine | null } {
  const { place, terrain, city, width } = input
  const landmarks = [...input.landmarks]
  const reachKm = portraitReach(city?.clusters, place.nameHe)
  const towers = city?.raster?.towers ?? city?.towers ?? []
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
    bounds: input.bounds, mask: input.waterMask, cover: input.cover,
    settlement: settlementOf(place, { tile: input.village ?? null, cover: input.cover ?? null, raster: city?.raster }) })
  // The land as drawn: the near land the outside view lays (the place's own ground and what truly stands behind it, on its
  // scale), the panorama's ridge beyond the place's span; the marks stand on it.
  const drawn = drawnTerrain(terrain, view.nearLine)
  const drawnGround = groundFn(drawn.nearPoints, width)
  // The dot on the place's one vertical scale (owner decision 14: under the near ridge's crest by the crest's height over
  // it); without the local ground, on the drawn ridge (not on the raw middle sample, which can float over the curve).
  const dot = { x: centerX, y: view.vscale?.dotY ?? drawnGround(centerX) }
  const { marks, seatPool } = marksOf({ place, city, terrain: drawn, landmarks, seatCandidates: input.seatCandidates, width, dot, reachKm,
    homeHalf: homeHalf(reachKm, known), style: style.style, rasterTowers: ownSkyline ? towers : null,
    outside: { frame: view.frame, isCity: true, lie: view.lie, baseKm: view.baseKm, land: view.land, seatMark: view.seatMark, village: view.village } })
  return { marks, seatPool, ownSkyline, watersShown: watersShown(terrain.water ?? [], view, drawnGround, width), coastalSea: view.sea, nearLine: view.nearLine, place3: { kind: 'outside', dot, reachKm, seed, skyline: view.skyline,
    frame: view.frame, bounds: view.bounds, topM: view.topM, beyond: view.beyond, beyondTowns: view.beyondTowns, baseKm: view.baseKm,
    trees: view.trees, fabric: view.fabric, roofs: style.roofs, land: view.land,
    vscale: view.vscale ? { s: view.vscale.s, h0: view.vscale.h0 } : null } }
}
