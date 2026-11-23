import { apparentHeight, baseAngle, MARK_MIN_PX } from '../data/terrain/apparentHeight'
import { boundsForPlace, boundsHoldKm, type BoundsFile, type PlaceBounds } from '../data/city/bounds'
import { LON_STEP } from '../data/city/grid'
import {
  baseYAt, budget, dedupeTowers, frameOfBox, GLYPH_M, GLYPH_W, HOUSE_TOP_M, inFrame, inSkylineReach, isOwnSpot, lieBaseY, MAX_GLYPHS, NEAR_DROP, outsideFrame,
  outsideProject, outsideSkyline, SILHOUETTE_W, towerFame, type FabricCell, type FrameScale, type Ground, type OutsideFrame,
  type OutsideLook, type OutsideSkyline, type PlaceLie,
} from '../data/city/outsideView'
import { roofHeight, STOREY_M } from '../data/city/skylineHeight'
import { hashId, seeded } from '../data/landmarks/hash'
import { groundFn } from '../data/landmarks/seat'
import { COVER, LAND_STEP } from '../data/land/grid'
import type { LandCover } from '../data/land/landData'
import type { CityResult } from '../data/city/types'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import { apparentAngle, LOCAL_REACH_KM, LOCAL_STEP_KM } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { WaterMask } from '../data/water/waterMask'
import { beyondKm, beyondTowns, builtSquares, outsideDistance, overTheCrest, rowKm, type SeatMark } from './beyondSeat'
import { ridgeHeightAt } from './datum'
import { VISIBLE_BOTTOM } from './layout'
import { SCENE_H } from './sceneBox'
import type { BeyondBlock, BeyondTower, CoastalSea, OutsideTreeSite, OutsideView, Pt } from './types'

export { rowKm } from './beyondSeat'

/**
 * The place seen from outside, the canvas scene's rules (CANVAS-SCENE-PLAN.md C5; SKYLINE.md variant B and its open
 * items), for every place alike:
 *
 * - **The frame is the place's own** (item 6): its built squares within its own boundary (`bounds.ts`: the mapped
 *   administrative boundary that holds it, else its weighted cell among the place points), within its reach; a city grown
 *   into its neighbours shows only itself. Without boundary data, its built-up cluster as before.
 * - **Rows climb the slope** (item 2; owner decision 14): the ground under each row (the panorama's local grid, every
 *   direction) sets how far above or below the dot it stands, on the place's one vertical scale (`lieOf`). A flat city
 *   barely moves; a city on a mountain face climbs it.
 * - **Mass and spires** (B): `outsideSkyline` with the boundary and the slope.
 * - **Towers beyond the place** (item 3): those within the near skyline's reach (6 km) but outside the place, at their
 *   true bearing on the true land, with the same levels of detail: the famous and ≥ 150 m a full glyph, the others a
 *   silhouette (thinned per screen slot by A's soft budget, the tallest first, so a neighbouring city reads dense
 *   without turning to mush).
 * - **The coastal sea** (item 1): where the water mask has sea (a lake is seen at its true bearing and distance, as
 *   water in view) reaching the screen's edge across the place's rows, a band of water from the coast to that edge at the place's depth, on the rows' own line (sea level, so it lies
 *   under the lowest rows).
 */

/** Rows of the coastal sea across the place's depth. */
const SEA_ROWS = 16
/** Px between samples along a row of the coastal sea. */
const SEA_STEP = 2
/** The sea counts as the place's when its coast lies within the frame or this many km of it. */
const SEA_MARGIN_KM = 1
/** Silhouettes beyond the place per 10 px slot (A's soft budget). */
const BEYOND_SLOT = 10
const BEYOND_CAP = 2

export interface OutsidePlace {
  frame: OutsideFrame
  skyline: OutsideSkyline
  bounds: { source: PlaceBounds['source'] | 'cluster'; name?: string }
  /** The place's top (m: its built squares' 95th percentile); null when its ground is unknown. */
  topM: number | null
  lie: PlaceLie
  beyond: BeyondTower[]
  /** C9: the towns beyond the place within the skyline's reach (6 km), where the far towns do not reach. */
  beyondTowns: BeyondBlock[]
  seatMark: SeatMark | null
  sea: CoastalSea | null
  /** The near ridge's distance at the dot (km): the place's nearest row takes this haze. */
  baseKm: number
  /** The place's trees (layout px), and where its fabric came from (the land cover's cells, or the raster's squares). */
  trees: OutsideTreeSite[]
  fabric: 'cover' | 'raster'
  /** The place's own ground where it rises over the ridge line (C5b). */
  land: OutsideView['land']
  /**
   * The place's one vertical scale (owner decision 14): `s` px a metre above and below the dot alike, the dot's y on it
   * (`placeDotY`), and the place point's ground (m). Null without the local ground (the dot on the ridge line, as before).
   */
  vscale: { s: number; dotY: number; h0: number } | null
  /** Sea level (y, px) at the dot's depth on the place's own scale (the datum below sea level); null without it. */
  seaLevelY: number | null
  /**
   * The near land as drawn (`nearLineOf`: the place's own ground and the terrain behind it on its scale, the panorama's
   * ridge beyond its span), as many points as the panorama's ridge, with its height (m); the world draws the near plane on it. Null: the
   * panorama's ridge as it is (no local ground).
   */
  nearLine: NearLine | null
  /**
   * Where the dot's row rises through 0 m on each side of the dot (layout px; null: its ground stays below 0 m as far as
   * the local ground is known and in view): the datum's ends (`datum.ts` `datumOfRow`). Worked out when asked.
   */
  zeroAlongRow: () => { left: number | null; right: number | null }
}

export interface OutsideInput {
  place: Coordinate & { nameHe?: string }
  terrain: SceneTerrain
  landmarks: readonly Landmark[]
  city: CityResult | null | undefined
  width: number
  centerX: number
  reachKm: number
  ground: Ground
  floor: number
  bounds: BoundsFile | null | undefined
  mask: WaterMask | null | undefined
  /** The land cover (WorldCover, ~60 × 50 m): the place's built cells and its trees. */
  cover: LandCover | null | undefined
}

/**
 * One frame scale for every place (the owner's one algorithm, C5), continuous in the place's extent (its larger half
 * width, km): it takes half the width by that extent (a village a little of the middle, a city the width), and its
 * heights one vertical exaggeration that grows as the place shrinks, as the scene's relief exaggerates the land: 0.18 px
 * a metre at 5 km (a 300 m tower over Tel Aviv ≈ 54 px, as the study had it), ~1 px a metre for a village of 0.6 km
 * (a two-storey house ≈ 7 px, the portrait's size). Within a place every height keeps its true order.
 */
export const FRAME_SCALE: FrameScale = {
  halfPx: (extentKm) => 30 + 35 * extentKm,
  k: (extentKm) => Math.min(1.2, .18 * (5 / Math.max(.3, extentKm)) ** .8),
}
/** The frame takes the place's built cells between these quantiles each way: a lone shed far out does not widen it. */
const FRAME_Q = .02
/** A built cell's roof where the city raster knows nothing of it: a one- or two-storey house. */
const HOUSE_M = [STOREY_M + 1.5, 2 * STOREY_M + 1.5] as const
/** Trees stand where the cover has them within this many km of a built cell (the place's gardens, yards, streets). */
const TREE_NEAR_KM = .12
/**
 * A built cell's frontage (C9): the root of its square's built share, scaled (a block's face is longer than its share of
 * the ground: about 1.6 × its root, so a square half under roofs reads nearly closed), never under this share of the cell.
 */
const FRONT_K = 1.6
const MIN_FRONT = .4
/** At most this many trees a place (the nearest kept): beyond them a tree is under a px. */
const MAX_TREES = 900

/** A tree of the place: km east / north, its height (m) and kind (seeded: round crowns, cypresses, a few palms). */
export interface PlaceTree { dx: number; dy: number; heightM: number; kind: 'tree' | 'cypress' | 'palm'; seed: number }

const BUILT = COVER.indexOf('built'), TREE = COVER.indexOf('tree')

/**
 * The place's built cells and trees from the land cover within its reach (and its boundary): each built cell at the land
 * cover's own size, its roof from the city raster's square under it (storeys, p90) or a house's when the raster has
 * none; trees where the cover has them near a built cell. Without the cover, the city raster's squares (~118 × 232 m).
 */
function fabricOf(place: Coordinate, input: OutsideInput, inPlace: ((dx: number, dy: number) => boolean) | undefined,
  within: { w: number; e: number; s: number; n: number } | null) {
  const { cover, city, reachKm } = input
  const raster = city?.raster
  const cos = Math.cos(place.lat * Math.PI / 180)
  const cells: FabricCell[] = []
  const trees: PlaceTree[] = []
  const heightAt = (lat: number, lon: number, u: number) => {
    const at = raster?.at(lat, lon)
    return at && at.built >= .2 ? roofHeight(at.levels, at.p90, u) : HOUSE_M[u < .6 ? 0 : 1]
  }
  if (cover) {
    const step = LAND_STEP
    // Only the place's own box (its boundary's extent) within the reach is read.
    const box = within ?? { w: -reachKm, e: reachKm, s: -reachKm, n: reachKm }
    const south = place.lat + box.s / 111.32, north = place.lat + box.n / 111.32
    const west = place.lon + box.w / (111.32 * cos), east = place.lon + box.e / (111.32 * cos)
    const wKm = step * 111.32 * cos
    const treeSpots: { dx: number; dy: number; lat: number; lon: number }[] = []
    const builtRows = new Map<number, number[]>()
    for (let row = Math.floor(south / step); row <= Math.floor(north / step); row++) {
      for (let col = Math.floor(west / step); col <= Math.floor(east / step); col++) {
        const lat = (row + .5) * step, lon = (col + .5) * step
        const c = cover.coverAt(lat, lon)
        if (c !== BUILT && c !== TREE) continue
        const dx = (lon - place.lon) * 111.32 * cos, dy = (lat - place.lat) * 111.32
        if (Math.hypot(dx, dy) > reachKm * 1.42 || !(inPlace?.(dx, dy) ?? true)) continue
        if (c === TREE) { treeSpots.push({ dx, dy, lat, lon }); continue }
        const seed = hashId(`${row}:${col}`)
        const random = seeded(seed)
        const heightM = heightAt(lat, lon, random())
        // C9 (defect 10): a built cell is as wide as its buildings' frontage, not wall to wall: its width by the root of
        // the raster square's built share (the share of the ground under roofs; a row of blocks shows about its root
        // across), at a seeded spot inside the cell, so the streets and yards between them open and the rows behind,
        // with their own heights, show through. A cell the raster knows nothing of is whole.
        const built = raster?.at(lat, lon).built ?? 0
        const front = built > 0 ? Math.min(1, Math.max(MIN_FRONT, Math.sqrt(built) * FRONT_K)) : 1
        const shift = (random() - .5) * (1 - front) * wKm
        cells.push({ dx: dx + shift, dy, wKm: wKm * front, heightM, seed })
        const list = builtRows.get(row)
        if (list) list.push(col)
        else builtRows.set(row, [col])
      }
    }
    // Trees near the built cells, nearest the place first.
    const near = (lat: number, lon: number) => {
      const r = Math.round(TREE_NEAR_KM / (step * 111.32))
      const row = Math.floor(lat / step), col = Math.floor(lon / step)
      for (let d = -r; d <= r; d++) if (builtRows.get(row + d)?.some((c) => Math.abs(c - col) <= r)) return true
      return false
    }
    for (const spot of treeSpots.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))) {
      if (trees.length >= MAX_TREES) break
      if (!near(spot.lat, spot.lon)) continue
      const seed = hashId(`tree:${spot.lat.toFixed(5)}:${spot.lon.toFixed(5)}`)
      const u = seeded(seed)()
      trees.push({ dx: spot.dx, dy: spot.dy, seed, kind: u < .22 ? 'cypress' : u > .94 ? 'palm' : 'tree',
        heightM: u < .22 ? 11 : u > .94 ? 12 : 6 + 3 * u })
    }
    return { cells, trees, source: 'cover' as const }
  }
  for (const sq of builtSquares(place, city, reachKm)) {
    if (!(inPlace?.(sq.dx, sq.dy) ?? true)) continue
    const lat = place.lat + sq.dy / 111.32, lon = place.lon + sq.dx / (111.32 * cos)
    const seed = hashId(`${sq.dx.toFixed(3)}:${sq.dy.toFixed(3)}`)
    cells.push({ dx: sq.dx, dy: sq.dy, wKm: LON_STEP * 111.32 * cos, heightM: heightAt(lat, lon, seeded(seed)()), seed })
  }
  return { cells, trees, source: 'raster' as const }
}

const quantile = (values: ArrayLike<number>, q: number) => {
  if (!values.length) return null
  const sorted = Float64Array.from(values).sort()
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

/** The place's own ground is sampled every this many km for its silhouette and its rows' room (the local grid is 250 m). */
const GROUND_STEP = .125
/**
 * The near ridge's crest may stand this far (px) over a row of the place in front of it: the scene's land pass (C9 defect 1,
 * `landBehind`) lets a foot show this far over the line before it counts as seen against the sky.
 */
export const ABOVE_PAD = 6
/**
 * The land area the place's picture is laid in (px at the scene's scale): from this height down to the sheet (`floor`). About
 * the highest the scene's near ridges stand (Tiberias's ridge over the Kinneret, 46 px); the sky above it is the sky's.
 */
export const LAND_TOP = 40
/**
 * The place's one vertical scale (owner decision 14, "uniform per place"): px per metre, the same above and below the dot,
 * for its ground, its rows, its water and the near ridge's crest behind it. Its total relief R (m: the land's top or the
 * crest, down to its lowest built row or its water) takes `fill × room × R / (R + r0)` px of the land area's room: a band
 * that grows with the relief and saturates, so a flat city keeps a low band and a mountain city a tall one, never the whole
 * room. Never more than the room itself, and between `min` and `max` px a metre: a 60 m flat city is not blown up into a
 * hill, a 600 m mountain face not crushed to a line.
 */
export const VSCALE = { fill: .93, r0: 150, min: .06, max: .3 }

/** The place's one vertical scale (px / m) for a relief of `reliefM` in a land area `roomPx` high (`VSCALE`). */
export function verticalScale(reliefM: number, roomPx: number): number {
  const r = Math.max(1, reliefM)
  return Math.max(VSCALE.min, Math.min(VSCALE.max, VSCALE.fill * roomPx / (r + VSCALE.r0), roomPx / r))
}

/**
 * Where the dot (the place point's ground, a base's y) stands, on the place's one scale `s` (owner decision 14): under the
 * near ridge's crest at the dot (`ridgeY`, a base on it) by the crest's height over the place, `(crestM − h0) × s` (over it
 * where the place stands higher); then moved, as little as it takes, so the picture stays in the land area: its top (`up`,
 * px over the dot, ≤ 0) no higher than `landTop`, its bottom (`down`, px under the dot) no lower than `floor`, and a coastal
 * place's shore (`shore`, px under the dot, 0 m at its near edge) no higher than the sea's true horizon, where the panorama
 * shows the sea. The bottom wins over the top and the shore (the place's rows stay on the sheet).
 */
export function placeDotY(at: { ridgeY: number; crestM: number; h0: number; s: number; up: number; down: number;
  shore: number | null; landTop: number; floor: number; horizon: number }): number {
  const { ridgeY, crestM, h0, s, up, down, shore, landTop, floor, horizon } = at
  let y = ridgeY + (Number.isFinite(crestM) ? (crestM - h0) * s : 0)
  y = Math.max(y, landTop - up)
  if (shore !== null) y = Math.max(y, horizon - shore)
  return Math.min(y, floor - down)
}

/** The place's silhouette eases into the ridge line over this many px at its ends. */
const LAND_EASE = 14
/** A two-storey house (m): the legible house's reference height. */
const HOUSE_REF_M = 2 * STOREY_M + 1.5

/**
 * The smallest legible house (C5b item 3), continuous in the place's extent (its larger half width, km): a small place's
 * two-storey house at least ~4.2 px high and 5.2 px wide (as the portrait's), a 5 km city's 2.6 by 3.2 (its houses are
 * the fabric under the mass). The true size when it is larger.
 */
export function legibleHouse(extentKm: number) {
  const t = Math.min(1, Math.max(0, (extentKm - 1.5) / 3.5))
  return { h: 4.2 - 1.6 * t, w: 5.2 - 2 * t }
}

/**
 * How the place's things are sized (C5b item 3): heights by the frame's perspective, the low fabric (to `HOUSE_TOP_M`)
 * at least at the legible house's px a metre, the rest at the frame's own above it, so every height keeps its true order
 * and a tower stands as tall as before (plus the legible floor of its lowest storeys).
 */
export function lookOf(frame: OutsideFrame): OutsideLook {
  const extent = Math.max(-frame.w, frame.e, (frame.n - frame.s) / 2)
  const house = legibleHouse(extent)
  const kMin = Math.max(frame.k, house.h / HOUSE_REF_M)
  const low = HOUSE_TOP_M * kMin
  return {
    px: (heightM, k) => k / frame.k * (heightM <= HOUSE_TOP_M ? heightM * kMin : low + (heightM - HOUSE_TOP_M) * frame.k),
    house: { w: house.w },
  }
}

/** The place's ground sampled over its frame (and boundary): km east / north and height (m). */
function groundSamples(frame: OutsideFrame, heightNear: (dx: number, dy: number) => number | null,
  inPlace: ((dx: number, dy: number) => boolean) | undefined) {
  const out: { dx: number; dy: number; h: number }[] = []
  for (let dy = frame.s; dy <= frame.n + 1e-9; dy += GROUND_STEP) {
    for (let dx = frame.w; dx <= frame.e + 1e-9; dx += GROUND_STEP) {
      if (inPlace && !inPlace(dx, dy)) continue
      const h = heightNear(dx, dy)
      if (h !== null) out.push({ dx, dy, h })
    }
  }
  return out
}

/**
 * The place's frame, boundary and slope (items 2 and 6; C5b item 2; owner decision 14). Every row of the place stands on
 * its own ground, on **one vertical scale** `s` (px a metre, `verticalScale`, from the land area's room and the place's
 * total relief: its land, its built rows, its water, the near ridge's crest behind it, sea level below 0 m): every spot
 * above or below the dot by its ground's height over the place point's × `s`, the same above and below, and by its depth
 * (north nearer, lower). The dot itself under the near ridge's crest at the centre by the crest's height over the place × `s`
 * (`placeDotY`), so the ridge and the place agree there; moved only as far as the land area, the sheet and a coast's sea
 * horizon need. No press and no cap: where the place's ground is higher than the land behind it, it rises over the ridge
 * line as its own silhouette (`landOf`). Without the local ground, the ridge line and the slope's lift as before.
 */
function lieOf(input: OutsideInput) {
  const { place, terrain, city, reachKm, centerX, width, ground, floor } = input
  const pb = boundsForPlace(place, city?.clusters, input.bounds, reachKm)
  const inPlace = pb ? (dx: number, dy: number) => boundsHoldKm(pb, place, dx, dy) : undefined
  const fabric = fabricOf(place, input, inPlace, pb?.box ?? null)
  const squares = fabric.cells
  let frame: OutsideFrame
  if (pb || input.cover) {
    const xs = Float64Array.from(squares, (sq) => sq.dx), ys = Float64Array.from(squares, (sq) => sq.dy)
    // Half a cell round the place's built cells (its few outliers left out), so their boxes stand inside the frame.
    xs.sort(); ys.sort()
    const at = (v: Float64Array, q: number) => v[Math.min(v.length - 1, Math.floor(q * v.length))]
    const box = squares.length ? { w: at(xs, FRAME_Q) - .03, e: at(xs, 1 - FRAME_Q) + .03,
      s: at(ys, FRAME_Q) - .03, n: at(ys, 1 - FRAME_Q) + .03 } : pb?.box ?? null
    frame = frameOfBox(box, reachKm, centerX, width, true, FRAME_SCALE)
  } else frame = outsideFrame(city?.clusters, reachKm, centerX, width, true, place.nameHe)
  const bounds = { source: pb?.source ?? 'cluster' as const, ...(pb?.name ? { name: pb.name } : {}) }
  const heightNear = terrain.heightNear
  // Each built cell's ground in the frame, once (NaN outside it or the local grid).
  const cellGround = new Float64Array(squares.length).fill(NaN)
  const heights: number[] = []
  if (heightNear) squares.forEach(({ dx, dy }, i) => {
    if (!inFrame(frame, dx, dy)) return
    const h = heightNear(dx, dy)
    if (h !== null) { cellGround[i] = h; heights.push(h) }
  })
  const topM = quantile(heights, .95)
  if (!heightNear || topM === null) {
    // No local ground: the rows on the ridge line, the near drop pressed into the room down to the sheet.
    const room = Math.max(4, floor - ground(centerX) - 1)
    const press = Math.min(1, room / NEAR_DROP)
    const lift = press < 1 ? (dx: number, dy: number) => -(1 - press) * outsideProject(frame, dx, dy).near * NEAR_DROP : undefined
    const lie: PlaceLie = { ...(inPlace ? { inPlace } : {}), ...(lift ? { lift } : {}) }
    const levelY = (dx: number, dy: number) => baseYAt(ground, centerX, outsideProject(frame, dx, dy).near, floor, 0, lift?.(dx, dy) ?? 0)
    return { frame, lie, topM, fabric, bounds, levelY, spots: [], around: null, baseY: null, vscale: null }
  }
  const h0 = heightNear(0, 0) ?? topM
  const near0 = outsideProject(frame, 0, 0).near
  const samples = groundSamples(frame, heightNear, inPlace)
  // The heights the picture holds: the place's land, its built rows, its water (a lake or the sea in the frame, the
  // coastal sea's shore at 0 m), the near ridge's crest behind it at the dot, and below sea level, sea level.
  const { mask } = input
  const cos = Math.cos(place.lat * Math.PI / 180)
  const waterAt = (dx: number, dy: number) => {
    const body = mask?.bodyAt(place.lat + dy / 111.32, place.lon + dx / (111.32 * cos)) ?? null
    return body === null ? null : mask!.bodies[body]?.kind ?? 'lake'
  }
  const wet = samples.map((g) => waterAt(g.dx, g.dy))
  const coastal = wet.some((w) => w === 'sea')
  const crest = ridgeHeightAt(terrain.nearPoints, terrain.nearElevations)(centerX * 375 / width)
  let hiM = -Infinity, loM = Infinity
  samples.forEach((g, i) => { if (!wet[i]) hiM = Math.max(hiM, g.h); else loM = Math.min(loM, g.h) })
  cellGround.forEach((h) => { if (!Number.isNaN(h)) { loM = Math.min(loM, h); hiM = Math.max(hiM, h) } })
  if (coastal) loM = Math.min(loM, 0)
  // Below sea level the picture holds sea level too (the datum stands at 0 m on the same scale).
  if (h0 < 0) hiM = Math.max(hiM, 0)
  if (Number.isFinite(crest)) hiM = Math.max(hiM, crest)
  // The place's own land: its ground's spots and its built cells' own ground (a row stands on it, never over the land
  // drawn under it); water is not land. And the land drawn round it on the same scale (`landAround`): it is in the
  // picture too.
  const spots = [...samples.filter((_, i) => !wet[i]),
    ...squares.flatMap(({ dx, dy }, i) => Number.isNaN(cellGround[i]) ? [] : [{ dx, dy, h: cellGround[i] }])]
  const around = landAround(frame, heightNear, spots, width)
  // Land beyond the frame's far edge is farther than the place: one metre there is less than one at the place, by its
  // true depth (decision 14: one scale at the same distance).
  const farther = (dy: number) => dy < frame.s ? (frame.eyeN - frame.s) / (frame.eyeN - dy) : 1
  for (const row of around.rows) for (const g of row) if (g && g.x >= around.left && g.x <= around.right) hiM = Math.max(hiM, h0 + (g.h - h0) * farther(g.dy))
  if (!Number.isFinite(hiM)) hiM = h0
  if (!Number.isFinite(loM)) loM = Math.min(h0, hiM)
  const s = verticalScale(hiM - loM, floor - LAND_TOP - NEAR_DROP)
  /** Px below the dot (+) or above it (−) for ground `h` m at a spot: its depth, and its height on the place's one scale. */
  const offset = (dx: number, dy: number, h: number) => (outsideProject(frame, dx, dy).near - near0) * NEAR_DROP + (h0 - h) * s * farther(dy)
  // How far the picture reaches over the dot (its land's top, sea level) and under it (its lowest built row, its water,
  // its shore).
  let up = 0, down = 0
  samples.forEach((g, i) => {
    const o = offset(g.dx, g.dy, g.h)
    if (!wet[i]) up = Math.min(up, o)
    else down = Math.max(down, o)
  })
  squares.forEach(({ dx, dy }, i) => { if (!Number.isNaN(cellGround[i])) down = Math.max(down, offset(dx, dy, cellGround[i])) })
  if (h0 < 0) up = Math.min(up, offset(0, 0, 0))
  for (const row of around.rows) for (const g of row) if (g && g.x >= around.left && g.x <= around.right) up = Math.min(up, offset(g.dx, g.dy, g.h))
  const shore = coastal ? offset(0, frame.n, 0) : null
  if (shore !== null) down = Math.max(down, shore)
  const yDot = placeDotY({ ridgeY: ground(centerX) + 1, crestM: crest, h0, s, up, down, shore, landTop: LAND_TOP, floor,
    horizon: seaHorizonY(terrain) })
  const levelY = (dx: number, dy: number, h = 0) => Math.min(floor, yDot + offset(dx, dy, h))
  const baseY = (dx: number, dy: number) => levelY(dx, dy, heightNear(dx, dy) ?? h0)
  const lie: PlaceLie = { ...(inPlace ? { inPlace } : {}), baseY }
  return { frame, lie, topM, fabric, bounds, levelY, spots, around, baseY, vscale: { s, dotY: yDot - 1, h0 } }
}

/** The land as the outside view draws it: the near line and the far line (as many points as the panorama's ridge, evenly across 375 px), each with its heights (m). */
export interface NearLine {
  points: [number, number][]; elevations: number[]; farPoints: [number, number][]; farElevations: number[]
  /** How much of each point is the place's near land (1) rather than the panorama's ridge (0), and the place's scale. */
  own: number[]; s: number
}

/**
 * The land as drawn: the panorama's terrain with the outside view's near line (`nearLineOf`) in place of its near ridge
 * and far line, and the near snow on the place's own scale where the line is the place's (snow from each crest down to
 * the snow line, `(crest m − line m) × s` px), the panorama's elsewhere. The panorama's own when there is no near line.
 */
export function drawnTerrain(terrain: SceneTerrain, nearLine: NearLine | null): SceneTerrain {
  if (!nearLine) return terrain
  const { points, elevations, own, s } = nearLine
  const snowEdge = terrain.snowEdge
  return { ...terrain, nearPoints: points, nearElevations: elevations, farPoints: nearLine.farPoints, farElevations: nearLine.farElevations,
    ...(snowEdge ? { snowEdge: (layer: 'near' | 'far', lineM: number) => {
      const pano = snowEdge(layer, lineM)
      if (layer !== 'near') return pano
      const panoAt = groundFn(pano, 375)
      return points.map(([x, y], i): [number, number] => {
        const mine = elevations[i] >= lineM ? y + (elevations[i] - lineM) * s : y - 2
        return [x, panoAt(x) + (mine - panoAt(x)) * own[i]]
      })
    } } : {}) }
}

/**
 * The near land is laid from the local ground this many px (at 375) beyond the place's own span on each side (the land
 * beside it: a cliff at its edge, the mountain it leans on), then eased into the panorama's near ridge over at least
 * `NEAR_BLEND` px, more where the two stand far apart (a slope never steeper than about 1 px a px).
 */
export const NEAR_MARGIN = 40
export const NEAR_BLEND = 24

/** A spot of the land round the place: km east and north, its height (m) and its x on the screen (layout px). */
interface AroundSpot { dx: number; dy: number; h: number; x: number }

/**
 * The land round the place the outside view lays on the place's scale (owner decision 14, follow-up): the local ground
 * behind it (south of its frame) and beside it (east or west of its frame, never in front of its near edge), out to the
 * local ground's reach, as rows of the grid (a gap where the place's own frame or the unknown breaks a row); and the
 * screen span it is laid over (on the local grid's own 250 m): the place's own span (`spots`) widened by `NEAR_MARGIN` px each side.
 */
function landAround(frame: OutsideFrame, heightNear: (dx: number, dy: number) => number | null,
  spots: readonly { dx: number; dy: number }[], width: number): { rows: (AroundSpot | null)[][]; left: number; right: number; own: [number, number] } {
  let own0 = Infinity, own1 = -Infinity
  for (const g of spots) {
    const x = outsideProject(frame, g.dx, g.dy).x
    own0 = Math.min(own0, x); own1 = Math.max(own1, x)
  }
  const margin = NEAR_MARGIN * width / 375
  const left = Math.max(0, Math.floor(own0 - margin)), right = Math.min(Math.ceil(width), Math.ceil(own1 + margin))
  const rows: (AroundSpot | null)[][] = []
  for (let dy = frame.n; dy >= -LOCAL_REACH_KM; dy -= LOCAL_STEP_KM) {
    const row: (AroundSpot | null)[] = []
    for (let dx = -LOCAL_REACH_KM; dx <= LOCAL_REACH_KM + 1e-9; dx += LOCAL_STEP_KM) {
      // Within the frame's box the land is the place's own ground.
      const h = dx >= frame.w && dx <= frame.e && dy >= frame.s ? null : heightNear(dx, dy)
      row.push(h === null ? null : { dx, dy, h, x: outsideProject(frame, dx, dy).x })
    }
    rows.push(row)
  }
  return { rows, left, right, own: [own0, own1] }
}

/**
 * The near land in the outside view (owner decision 14, follow-up): within the place's span the land seen is the place's
 * own ground on its own scale (`spots` through the lie, `levelY`: the same data its rows stand on), and the land round it
 * (`landAround`: behind it or beside it, at its true depth, through the same lie) wherever that stands higher on the
 * screen; never the panorama's ridge, which is the place's eye's view on another scale. Past the span, eased into the
 * panorama's near ridge. Points evenly across (as many as the panorama's ridge), with the land's height (m) at each (its snow). Null where the place has
 * no local ground (the panorama's ridge as it is).
 */
function nearLineOf(input: OutsideInput, spots: readonly { dx: number; dy: number; h: number }[],
  around: ReturnType<typeof landAround>, levelY: (dx: number, dy: number, h?: number) => number, frame: OutsideFrame,
  scale: number): NearLine | null {
  const { terrain, width } = input
  if (!spots.length) return null
  const n = Math.ceil(width) + 1
  const { left, right } = around
  const top = new Float64Array(n).fill(Infinity), topM = new Float64Array(n).fill(Number.NaN)
  const edge = (x: number, y: number, h: number) => {
    const i = Math.round(x)
    if (i >= left && i <= right && y < top[i]) { top[i] = y; topM[i] = h }
  }
  for (const g of spots) edge(outsideProject(frame, g.dx, g.dy).x, levelY(g.dx, g.dy, g.h), g.h)
  // Each row of the land round it is a profile across the screen: laid as a line from spot to spot, so a far row (its
  // spots a px or less apart) and a near one alike draw a continuous edge, never a comb of single columns.
  for (const row of around.rows) {
    let prev: { x: number; y: number; h: number } | null = null
    for (const g of row) {
      if (!g) { prev = null; continue }
      const at = { x: g.x, y: levelY(g.dx, g.dy, g.h), h: g.h }
      if (prev && Math.min(prev.x, at.x) <= right && Math.max(prev.x, at.x) >= left) {
        const steps = Math.max(1, Math.ceil(Math.abs(at.x - prev.x)))
        for (let k = 0; k <= steps; k++) {
          const t = k / steps
          edge(prev.x + (at.x - prev.x) * t, prev.y + (at.y - prev.y) * t, prev.h + (at.h - prev.h) * t)
        }
      } else edge(at.x, at.y, at.h)
      prev = at
    }
  }
  // Gaps between the columns closed from their neighbours, then a light smoothing never under a column's own top.
  let last = -1
  for (let x = left; x <= right; x++) {
    if (!Number.isFinite(top[x])) continue
    if (last >= 0 && x - last > 1) for (let i = last + 1; i < x; i++) {
      const t = (i - last) / (x - last)
      top[i] = top[last] + (top[x] - top[last]) * t
      topM[i] = topM[last] + (topM[x] - topM[last]) * t
    }
    last = x
  }
  let lo = left, hi = right
  while (lo < hi && !Number.isFinite(top[lo])) lo++
  while (hi > lo && !Number.isFinite(top[hi])) hi--
  if (!(hi > lo) || !Number.isFinite(top[lo])) return null
  const at = (x: number) => top[Math.max(lo, Math.min(hi, x))]
  const line = (x: number) => Math.min(at(x), (at(x - 1) + 2 * at(x) + at(x + 1)) / 4)
  // Beyond it, eased into the panorama's ridge (its height too), over a width that keeps the slope natural.
  const ridgeM = ridgeHeightAt(terrain.nearPoints, terrain.nearElevations)
  const ease = (edge: number) => Math.max(NEAR_BLEND * width / 375, 1.2 * Math.abs(line(edge) - input.ground(edge)))
  const blendL = ease(lo), blendR = ease(hi)
  // As many points as the panorama's own ridge (its rays, evenly across), each the highest of the columns it stands for.
  const steps = Math.max(2, terrain.nearPoints.length - 1)
  const half = width / steps / 2
  const points: [number, number][] = [], elevations: number[] = [], own: number[] = []
  for (let i = 0; i <= steps; i++) {
    const x375 = i * 375 / steps, x = x375 * width / 375
    const pano = input.ground(x), panoM = ridgeM(x375)
    const edge = x < lo ? lo : x > hi ? hi : Math.round(x)
    const blend = x < lo ? blendL : blendR
    const t = x >= lo && x <= hi ? 1 : Math.max(0, 1 - Math.abs(x - edge) / blend)
    const k = t * t * (3 - 2 * t)
    let ownY = line(edge), ownH = topM[edge]
    if (x >= lo && x <= hi) for (let c = Math.max(lo, Math.ceil(x - half)); c <= Math.min(hi, Math.floor(x + half)); c++) {
      if (line(c) < ownY) { ownY = line(c); ownH = topM[c] }
    }
    points.push([x375, pano + (ownY - pano) * k])
    own.push(k)
    elevations.push(Number.isFinite(panoM) && Number.isFinite(ownH) ? panoM + (ownH - panoM) * k : Number.isFinite(ownH) && k > 0 ? ownH : panoM)
  }
  // The far land keeps the panorama's line where the eye truly sees it over its near ridge; where the far horizon is that
  // near ridge itself, it is the near land as drawn (hidden behind it), never the panorama's near ridge showing through.
  const farY = groundFn(terrain.farPoints, 375), farM = ridgeHeightAt(terrain.farPoints, terrain.farElevations)
  const farPoints: [number, number][] = [], farElevations: number[] = []
  for (let i = 0; i <= steps; i++) {
    const x375 = i * 375 / steps
    const shows = terrain.sightAt?.(x375).farShows ?? true
    farPoints.push([x375, shows ? farY(x375) : Math.max(farY(x375), points[i][1])])
    farElevations.push(shows ? farM(x375) : elevations[i])
  }
  return { points, elevations, farPoints, farElevations, own, s: scale }
}

/**
 * The place's own ground where it rises over the ridge line (C5b item 2): its silhouette (the highest of its ground's
 * spots over each px across, land only), eased into the ridge line at its ends; null where it never rises over it.
 */
function landOf(input: OutsideInput, frame: OutsideFrame, samples: { dx: number; dy: number; h: number }[],
  baseY: (dx: number, dy: number) => number): OutsideView['land'] {
  const { ground, width } = input
  // Land only: a spot on the water mask's sea or lake (at any level, below the sea's too) is not the place's ground.
  const { mask, place } = input
  const cos = Math.cos(place.lat * Math.PI / 180)
  const wet = (dx: number, dy: number) => mask ? mask.bodyAt(place.lat + dy / 111.32, place.lon + dx / (111.32 * cos)) !== null : false
  const top = new Float64Array(Math.ceil(width) + 1).fill(Infinity)
  // The ground's height (m) and local east/north offsets (km) at each column's crest (snow & living-land albedo).
  const crestM = new Float64Array(top.length).fill(NaN)
  const crestDx = new Float64Array(top.length).fill(NaN)
  const crestDy = new Float64Array(top.length).fill(NaN)
  let left = Infinity, right = -Infinity
  for (const g of samples) {
    if (wet(g.dx, g.dy)) continue
    const x = Math.round(outsideProject(frame, g.dx, g.dy).x)
    if (x < 0 || x > width) continue
    const y = baseY(g.dx, g.dy)
    if (y < top[x]) { top[x] = y; crestM[x] = g.h; crestDx[x] = g.dx; crestDy[x] = g.dy }
    left = Math.min(left, x); right = Math.max(right, x)
  }
  if (!(right > left)) return null
  // Gaps between the samples' columns closed from their neighbours, then a light smoothing.
  let last = -1
  for (let x = left; x <= right; x++) {
    if (!Number.isFinite(top[x])) continue
    if (last >= 0 && x - last > 1) for (let i = last + 1; i < x; i++) {
      const t = (i - last) / (x - last)
      top[i] = top[last] + (top[x] - top[last]) * t
      crestM[i] = crestM[last] + (crestM[x] - crestM[last]) * t
      crestDx[i] = crestDx[last] + (crestDx[x] - crestDx[last]) * t
      crestDy[i] = crestDy[last] + (crestDy[x] - crestDy[last]) * t
    }
    last = x
  }
  const pts: Pt[] = []
  const base: Pt[] = []
  const heightM: number[] = []
  const localKm: Pt[] = []
  let rises = false
  for (let x = Math.max(0, left - LAND_EASE); x <= Math.min(width, right + LAND_EASE); x++) {
    const col = Math.min(right, Math.max(left, x))
    const own = top[col]
    // Smoothed, but never lower than the column's own top (a row on a crest keeps its ground under it).
    const smooth = Math.min(own, (top[Math.max(left, Math.min(right, x - 1))] + 2 * own + top[Math.max(left, Math.min(right, x + 1))]) / 4)
    const ease = x < left ? 1 - (left - x) / LAND_EASE : x > right ? 1 - (x - right) / LAND_EASE : 1
    const line = ground(x)
    const y = Math.min(line, line + (smooth - line) * ease * ease * (3 - 2 * ease))
    if (y < line - .4) rises = true
    pts.push([x, y])
    base.push([x, line + 2])
    heightM.push(crestM[col])
    localKm.push([crestDx[col], crestDy[col]])
  }
  // `km`: portrait-scale aerial-haze distance approximation (near ridge at `frame.centerX`) so the silhouette blends
  // seamlessly with the ridge behind it; local ground albedo is resolved from `localKm` in `world.land.local`.
  return rises ? { top: pts, base, heightM, localKm, km: input.terrain.sightAt?.(frame.centerX * 375 / width).nearKm ?? 1 } : null
}

/**
 * The towers beyond the place within the near skyline's reach (6 km), in the outside view's own perspective (C5b item 5):
 * at their true spot east / north, so a tower beyond is as far from that eye as it truly is: its x and base by the same
 * projection as the place's rows, its height by the perspective at its depth (never nearer than the place's near edge:
 * beyond the place, never larger than the place's own at that edge), its haze by its distance from the place's near edge, with the outside view's levels of detail.
 */
function beyondTowers(input: OutsideInput, frame: OutsideFrame, lie: PlaceLie, baseKm: number): BeyondTower[] {
  const { place, city, width, landmarks, ground, floor } = input
  const raster = city?.raster
  if (!raster) return []
  const all = dedupeTowers((raster.towers ?? city?.towers ?? []).map((tower) => ({ ...tower, ...offsetKm(place, tower) })))
  const outside = all.filter((tower) => !isOwnSpot(frame, lie, tower.dx, tower.dy)
    && inSkylineReach(Math.hypot(tower.dx, tower.dy)) && frame.eyeN - tower.dy > .5)
  if (!outside.length) return []
  const fame = towerFame(place, outside, landmarks)
  const ranked = outside.flatMap((tower) => {
    const at = outsideProject(frame, tower.dx, tower.dy)
    if (at.x < -4 || at.x > width + 4) return []
    // Keep the existing shaft-width perspective and level-of-detail ranking.
    const k = Math.min(at.k, outsideProject(frame, 0, frame.n).k)
    const mark = fame.get(tower)
    // The panorama supplies crest visibility. The outside eye supplies the tower's projected height below.
    const over = overTheCrest(input.terrain, tower.dx, tower.dy, tower.heightM)
    if (over < MARK_MIN_PX) return []
    const km = beyondKm(frame, baseKm, tower.dx, tower.dy)
    return [{ tower, at: { ...at, k }, over, km, famous: Boolean(mark), name: mark?.nameHe ?? tower.name,
      seed: hashId(`${tower.lat.toFixed(5)}:${tower.lon.toFixed(5)}`) }]
  }).sort((a, b) => Number(b.famous) - Number(a.famous) || b.tower.heightM - a.tower.heightM)
  const glyphs = new Set(ranked.filter((t) => t.famous || t.tower.heightM >= GLYPH_M).slice(0, MAX_GLYPHS))
  const slots = new Map<number, number>()
  const counts = new Map<number, number>()
  for (const t of ranked) if (!glyphs.has(t)) counts.set(Math.floor(t.at.x / BEYOND_SLOT), (counts.get(Math.floor(t.at.x / BEYOND_SLOT)) ?? 0) + 1)
  const out: BeyondTower[] = []
  for (const t of ranked) {
    const glyph = glyphs.has(t)
    const slot = Math.floor(t.at.x / BEYOND_SLOT)
    if (!glyph) {
      const used = slots.get(slot) ?? 0
      if (used >= budget(counts.get(slot) ?? 0, BEYOND_CAP)) continue
      slots.set(slot, used + 1)
    }
    const w = (glyph ? GLYPH_W[t.tower.wClass] : SILHOUETTE_W[t.tower.wClass]) * Math.min(1, t.at.k / frame.k)
    // 1.2 CSS px gives 2.4 DPR-2 coverage; base follows ground and height stays terrain-clipped.
    const baseY = Math.max(ground(t.at.x) + 1, lieBaseY(lie, ground, t.at.x, t.at.near, floor, w, t.tower.dx, t.tower.dy))
    const h = Math.min(t.over, apparentHeight(t.tower.heightM, outsideDistance(frame.eyeN, t.tower.dx, t.tower.dy), baseAngle(baseY, input.terrain.horizonY)))
    if (h < MARK_MIN_PX) continue
    out.push({ x: t.at.x, baseY, w: Math.max(1.2, w),
      h, near: 0, heightM: t.tower.heightM, seed: t.seed, name: t.name, famous: t.famous,
      lod: glyph ? 'glyph' : 'silhouette', crown: t.tower.heightM >= 180 ? 2 : (t.seed >>> 3) % 3 === 0 ? 1 : 0, km: t.km,
      dx: t.tower.dx, dy: t.tower.dy })
  }
  // Far first, then across.
  return out.sort((a, b) => b.km - a.km || a.x - b.x)
}

/**
 * The sea's own horizon on the screen: the highest the sea surface is seen below eye level from the panorama's eye
 * (curvature and refraction, `apparentAngle`), on the land's vertical scale; eye level without the eye's height.
 */
export function seaHorizonY(terrain: SceneTerrain): number {
  const { angleY, eyeM } = terrain
  if (!angleY || eyeM === undefined) return terrain.horizonY ?? terrain.seaY
  // The farthest sea seen is where the line of sight grazes it: its highest angle (beyond, the sea's bulge hides it).
  let dip = -90
  for (let km = .2; km <= 300; km *= 1.04) dip = Math.max(dip, apparentAngle(0, km, Math.max(0, eyeM)))
  return angleY(dip)
}

/** Rows of the sea beyond the place's far edge, out toward the horizon (depths growing by this factor). */
const SEA_BEYOND = 1.35
const SEA_FAR_DEPTH_KM = 60

/**
 * The coastal sea (item 1; C5b item 1): the water seen from outside, on the sea's side of the place, from its shore out to
 * the true sea horizon. Per row of the place's depth (and on beyond it, out toward the horizon) the water reaching the
 * screen's edge gives the shore; each row of the sea lies at sea level on the place's own ground rule (`levelY`), so the
 * shore is where the place's land meets the water; beyond the place the rows close in perspective toward the horizon, a
 * level line at the panorama's sea horizon; nearer than the place the water runs on to the sheet. Null for an inland
 * place, or one whose water does not come within a km of its frame.
 */
function coastalSeaOf(input: OutsideInput, frame: OutsideFrame, baseKm: number, levelY: (dx: number, dy: number, h?: number) => number): CoastalSea | null {
  const { place, mask, width, terrain } = input
  if (!mask) return null
  const cos = Math.cos(place.lat * Math.PI / 180)
  const horizon = seaHorizonY(terrain)
  const coastAt = (dy: number) => {
    const depth = frame.eyeN - dy
    const wet = (x: number) => {
      const dx = (frame.centerX - x) * depth / frame.f
      const body = mask.bodyAt(place.lat + dy / 111.32, place.lon + dx / (111.32 * cos))
      return body !== null && mask.bodies[body]?.kind === 'sea'
    }
    const coastFrom = (start: number, step: number) => {
      if (!wet(start)) return null
      let x = start
      while (x + step >= 0 && x + step <= width && wet(x + step)) x += step
      return x
    }
    const right = coastFrom(width, -SEA_STEP), left = coastFrom(0, SEA_STEP)
    // The side whose water reaches further in across the frame.
    const pick = right !== null && (left === null || width - right >= left) ? { side: 'right' as const, coast: right }
      : left !== null ? { side: 'left' as const, coast: left } : null
    return pick ? { ...pick, dx: (frame.centerX - pick.coast) * depth / frame.f } : null
  }
  const rows: { dy: number; coast: number | null; side: 'left' | 'right' | null }[] = []
  for (let i = 0; i <= SEA_ROWS; i++) {
    const dy = frame.s + (frame.n - frame.s) * i / SEA_ROWS
    const pick = coastAt(dy)
    // The coast must lie near the place.
    const close = pick && pick.dx >= frame.w - SEA_MARGIN_KM && pick.dx <= frame.e + SEA_MARGIN_KM
    rows.push({ dy, coast: close ? pick.coast : null, side: close ? pick.side : null })
  }
  const right = rows.filter((r) => r.side === 'right').length, left = rows.filter((r) => r.side === 'left').length
  const side = right >= left ? 'right' : 'left'
  const wetRows = rows.filter((r) => r.side === side)
  if (wetRows.length < 3) return null
  const edge = side === 'right' ? width : 0
  // The rows that have the sea, far to near (contiguous: a gap closes at its neighbours' coast).
  const from = rows.indexOf(wetRows[0]), to = rows.indexOf(wetRows.at(-1)!)
  const band = rows.slice(from, to + 1).map((r, i, all) => {
    if (r.side === side && r.coast !== null) return { dy: r.dy, coast: r.coast }
    const prev = all.slice(0, i).reverse().find((o) => o.side === side)!, next = all.slice(i + 1).find((o) => o.side === side)!
    return { dy: r.dy, coast: side === 'right' ? Math.max(prev.coast!, next.coast!) : Math.min(prev.coast!, next.coast!) }
  })
  // The water is level: a row of it at depth d (km from the outside eye) lies below the horizon by C / d, one perspective
  // from the horizon (d → ∞) to the sheet. C puts the place's near row where its own shore lies (sea level by the place's
  // rule), and at least half-way from the horizon to the sheet, so the water in front of the place reads as near water.
  const dNear = frame.eyeN - frame.n
  const yNear = Math.max(Math.min(VISIBLE_BOTTOM, levelY(0, frame.n, 0)), horizon + .5 * (VISIBLE_BOTTOM - horizon))
  const C = (yNear - horizon) * dNear
  const yOf = (dy: number) => horizon + C / Math.max(.05, frame.eyeN - dy)
  // The shore along the rows, smoothed across them (the mask's cells and the scan's steps out of it).
  const xsSmooth = band.map((_, i) => {
    const pick = (j: number) => band[Math.max(0, Math.min(band.length - 1, j))].coast
    return (pick(i - 2) + 2 * pick(i - 1) + 3 * pick(i) + 2 * pick(i + 1) + pick(i + 2)) / 9
  })
  const shore: Pt[] = band.map((r, i) => [xsSmooth[i], yOf(r.dy)])
  // Beyond the place: the shore on south toward the horizon (only where the place's far row itself has the sea).
  const along = (depths: number[]) => {
    const out: Pt[] = []
    for (const depth of depths) {
      const pick = coastAt(frame.eyeN - depth)
      if (!pick || pick.side !== side) break
      out.push([pick.coast, yOf(frame.eyeN - depth)])
    }
    return out
  }
  const depthFar = frame.eyeN - band[0].dy
  const farDepths: number[] = [], nearDepths: number[] = []
  for (let depth = depthFar * SEA_BEYOND; depth <= SEA_FAR_DEPTH_KM; depth *= SEA_BEYOND) farDepths.push(depth)
  const dBottom = C / Math.max(1, SCENE_H - horizon)
  for (let depth = (frame.eyeN - band.at(-1)!.dy) / 1.15; depth > dBottom; depth /= 1.15) nearDepths.push(depth)
  const beyond = rows[0].side === side ? along(farDepths) : []
  // Nearer than the place the shore runs on as the near row's leaves it, straight toward the eye (its x by perspective
  // alone), so the water in front of the place widens toward the sea's own side, never across the place's foreground.
  const lastDy = band.at(-1)!.dy, lastDx = (frame.centerX - xsSmooth.at(-1)!) * (frame.eyeN - lastDy) / frame.f
  const nearer: Pt[] = nearDepths.map((depth) => [Math.max(0, Math.min(width, frame.centerX - frame.f * lastDx / depth)), yOf(frame.eyeN - depth)])
  const coastTop = (beyond.at(-1) ?? shore[0])[0]
  const coastBottom = (nearer.at(-1) ?? shore.at(-1)!)[0]
  // From the horizon down: the shore, made monotone (a far row never lower than a nearer one), down to the sheet.
  const coast: Pt[] = [[coastTop, horizon], ...[...beyond].reverse(), ...shore, ...nearer, [coastBottom, SCENE_H]]
  for (let i = 1; i < coast.length; i++) coast[i] = [coast[i][0], Math.max(coast[i][1], coast[i - 1][1])]
  const far = band[0], yFar = yOf(far.dy)
  const points: Pt[] = [[edge, horizon], [edge, SCENE_H], ...[...coast].reverse()]
  const seaKm = median(terrain.water?.filter((span) => span.kind === 'sea').flatMap((span) => span.edges.map((e) => e.farKm)) ?? [])
  const km: [number, number][] = [[horizon, Math.max(seaKm ?? 0, rowKm(frame, baseKm, frame.s) * 2, 15)], [yFar, rowKm(frame, baseKm, far.dy)],
    [yOf(band.at(-1)!.dy), rowKm(frame, baseKm, band.at(-1)!.dy)], [SCENE_H, baseKm * .6]]
  for (let i = 1; i < km.length; i++) km[i] = [Math.max(km[i][0], km[i - 1][0] + .01), Math.min(km[i][1], km[i - 1][1])]
  return { points, coast, side, top: horizon, bottom: SCENE_H, horizon, km }
}

const median = (values: number[]) => values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : null

/** Trees of the place a px slot apart at least (the legible tree's width), so the larger trees do not pile into mush. */
const TREE_SLOT = .9

/** The dot's row is walked this many km a step for its 0 m crossings (half the ground's sampling). */
const ROW_STEP = GROUND_STEP / 2

/**
 * Where the place point's own row (its depth, km east and west of it) first rises through 0 m on each side of the dot, as
 * screen x (layout px; east on the left): the true 0 m contour on that row, as far as the local ground is known and the
 * row is in view.
 */
function zeroAlongRow(terrain: SceneTerrain, frame: OutsideFrame, width: number): { left: number | null; right: number | null } {
  const out: { left: number | null; right: number | null } = { left: null, right: null }
  const { heightNear } = terrain
  const h0 = heightNear?.(0, 0)
  if (!heightNear || h0 === null || h0 === undefined || h0 >= 0) return out
  for (const east of [1, -1]) {
    let prev = h0
    for (let i = 1; ; i++) {
      const dx = east * i * ROW_STEP
      const x = outsideProject(frame, dx, 0).x
      if (x < 0 || x > width) break
      const h = heightNear(dx, 0)
      if (h === null) break
      if (h >= 0) {
        const at = outsideProject(frame, east * (i - 1 + prev / (prev - h)) * ROW_STEP, 0).x
        out[east > 0 ? 'left' : 'right'] = at
        break
      }
      prev = h
    }
  }
  return out
}

/** The place seen from outside: its frame, its own boundary and slope, mass and spires, the towers beyond, its sea. */
export function outsidePlace(input: OutsideInput): OutsidePlace {
  const { place, landmarks, city, floor, width, terrain, centerX } = input
  const { frame, lie, topM, bounds, fabric, levelY, spots, around, baseY, vscale } = lieOf(input)
  // The near land the place stands in front of: its own ground and the terrain behind it, on its own scale (the
  // panorama's ridge beyond its span); everything of the place is laid against it.
  const nearLine = vscale && around ? nearLineOf(input, spots, around, levelY, frame, vscale.s) : null
  const ground = nearLine ? groundFn(nearLine.points, width) : input.ground
  const shaped = { ...input, ground }
  const land = baseY ? landOf(shaped, frame, spots, baseY) : null
  const look = lookOf(frame)
  const towers = city?.raster?.towers ?? city?.towers ?? []
  const skyline = outsideSkyline({ place, towers, landmarks, raster: city?.raster ?? undefined, frame, ground,
    floor, width, lie, fabric: fabric.cells, look })
  const baseKm = terrain.sightAt?.(centerX * 375 / width).nearKm ?? 1
  // Trees in the frame, back to front, each standing on its row (hidden ones are left to the painter's order); sized as
  // the houses (a crown about half a legible house wide), one to a slot of that width.
  const slots = new Set<string>()
  const trees = fabric.trees.filter((t) => inFrame(frame, t.dx, t.dy)).flatMap((t) => {
    const at = outsideProject(frame, t.dx, t.dy)
    const legible = .5 * look.house.w * at.k / frame.k
    const w = Math.max(.9, Math.min(6, Math.max(frame.f * .012 / at.depth, legible) * (t.kind === 'cypress' ? .55 : 1)))
    const base = lieBaseY(lie, ground, at.x, at.near, floor, 0, t.dx, t.dy)
    if (at.x < -4 || at.x > width + 4) return []
    const key = `${Math.round(at.x / (w * TREE_SLOT + .4))}:${Math.round(base / Math.max(1, w))}`
    if (slots.has(key)) return []
    slots.add(key)
    return [{ x: at.x, base, w, h: Math.max(1, look.px(t.heightM, at.k)), near: at.near, kind: t.kind, seed: t.seed, km: beyondKm(frame, baseKm, t.dx, t.dy) }]
  })
  return { frame, skyline, bounds, topM, lie, beyond: beyondTowers(shaped, frame, lie, baseKm),
    ...beyondTowns(shaped, frame, lie, baseKm), trees, fabric: fabric.source,
    sea: coastalSeaOf(input, frame, baseKm, levelY), baseKm, land, vscale, nearLine,
    seaLevelY: vscale ? levelY(0, 0, 0) : null, zeroAlongRow: () => zeroAlongRow(terrain, frame, width) }
}
