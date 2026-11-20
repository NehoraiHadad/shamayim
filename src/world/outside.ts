import { boundsHoldKm, placeBounds, type BoundsFile, type PlaceBounds } from '../data/city/bounds'
import { LAT_STEP, LON_STEP } from '../data/city/grid'
import {
  baseYAt, budget, dedupeTowers, frameOfBox, GLYPH_M, GLYPH_W, HOUSE_TOP_M, inFrame, inSkylineReach, lieBaseY, MAX_GLYPHS, NEAR_DROP, outsideFrame,
  outsideProject, outsideSkyline, SILHOUETTE_W, SKYLINE_TO_KM, towerFame, type FabricCell, type FrameScale, type Ground, type OutsideFrame,
  type OutsideLook, type OutsideSkyline, type PlaceLie,
} from '../data/city/outsideView'
import { roofHeight, STOREY_M } from '../data/city/skylineHeight'
import { hashId, seeded } from '../data/landmarks/hash'
import { COVER, LAND_STEP } from '../data/land/grid'
import type { LandCover } from '../data/land/landData'
import type { CityResult } from '../data/city/types'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import { apparentAngle } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { WaterMask } from '../data/water/waterMask'
import { SCENE_CAMERA, xOf } from '../domain/camera'
import { placeContour, zeroCrossings } from './datum'
import { VISIBLE_BOTTOM } from './layout'
import { SCENE_H, SCENE_W } from './sceneBox'
import { groundAt as lineAt } from './sceneLight'
import type { BeyondBlock, BeyondTower, CoastalSea, OutsideTreeSite, OutsideView, Pt } from './types'

/**
 * The place seen from outside, the canvas scene's rules (CANVAS-SCENE-PLAN.md C5; SKYLINE.md variant B and its open
 * items), for every place alike:
 *
 * - **The frame is the place's own** (item 6): its built squares within its own boundary (`bounds.ts`: the mapped
 *   administrative boundary that holds it, else its weighted cell among the place points), within its reach; a city grown
 *   into its neighbours shows only itself. Without boundary data, its built-up cluster as before.
 * - **Rows climb the slope** (item 2): the ground under each row (the panorama's local grid, every direction) sets how
 *   far below the ridge line it stands: the place's top on the line, every row lower by its height under that top in
 *   the view's own perspective (the px per m of its towers). A flat city barely moves; a city on a mountain face climbs it.
 * - **Mass and spires** (B): `outsideSkyline` with the boundary and the slope.
 * - **Towers beyond the place** (item 3): those within the near skyline's reach (6 km) but outside the place, at their
 *   true bearing on the true land, with the same levels of detail: the famous and ≥ 150 m a full glyph, the others a
 *   silhouette (thinned per screen slot by A's soft budget, the tallest first, so a neighbouring city reads dense
 *   without turning to mush).
 * - **The coastal sea** (item 1): where the water mask has sea (a lake is seen at its true bearing and distance, as
 *   water in view) reaching the screen's edge across the place's rows, a band of water from the coast to that edge at the place's depth, on the rows' own line (sea level, so it lies
 *   under the lowest rows).
 */

/** The haze a row of the place takes: the near ridge's distance at the dot, plus how far south of the near edge it is. */
export const rowKm = (frame: OutsideFrame, baseKm: number, dy: number) => baseKm + Math.max(0, frame.n - dy)

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
  /** The ground (m) the ridge line stands for: the place's top (its built squares' 95th percentile); null when unknown. */
  topM: number | null
  lie: PlaceLie
  beyond: BeyondTower[]
  /** C9: the towns beyond the place within the skyline's reach (6 km), where the far towns do not reach. */
  beyondTowns: BeyondBlock[]
  sea: CoastalSea | null
  /** The near ridge's distance at the dot (km): the place's nearest row takes this haze. */
  baseKm: number
  /** The place's trees (layout px), and where its fabric came from (the land cover's cells, or the raster's squares). */
  trees: OutsideTreeSite[]
  fabric: 'cover' | 'raster'
  /** The place's own ground where it rises over the ridge line (C5b). */
  land: OutsideView['land']
  /**
   * The place's 0 m contour drawn by its own rule (`datum.ts`): where its ground in the frame crosses 0 m, at the y its
   * rows give 0 m there; empty when its ground never crosses 0 m in the frame or is not known. Worked out when asked.
   */
  zeroContour: () => Pt[]
}

export interface OutsideInput {
  place: Coordinate
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

/** Every built square (≥ 20 % built) of the raster within the reach: its spot in km. */
function builtSquares(place: Coordinate, city: CityResult | null | undefined, reachKm: number) {
  const raster = city?.raster
  if (!raster) return []
  const cos = Math.cos(place.lat * Math.PI / 180)
  const south = place.lat - reachKm / 111.32, north = place.lat + reachKm / 111.32
  const west = place.lon - reachKm / (111.32 * cos), east = place.lon + reachKm / (111.32 * cos)
  const out: { dx: number; dy: number }[] = []
  for (let row = Math.floor(south / LAT_STEP); row <= Math.floor(north / LAT_STEP); row++) {
    for (let col = Math.floor(west / LON_STEP); col <= Math.floor(east / LON_STEP); col++) {
      const lat = (row + .5) * LAT_STEP, lon = (col + .5) * LON_STEP
      if (raster.at(lat, lon).built < .2) continue
      out.push(offsetKm(place, { lat, lon }))
    }
  }
  return out
}

const quantile = (values: ArrayLike<number>, q: number) => {
  if (!values.length) return null
  const sorted = Float64Array.from(values).sort()
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

/** The place's own ground is sampled every this many km for its silhouette and its rows' room (the local grid is 250 m). */
const GROUND_STEP = .125
/** Rows may rise over the dot up to the highest ridge line over the place's width, and this many px more. */
export const ABOVE_PAD = 6
/** …and at least this many px. */
const MIN_ABOVE = 6
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
 * The place's frame, boundary and slope (items 2 and 6; C5b item 2). Every row of the place stands on its own ground:
 * the dot (the place point) on the ridge line where the panorama draws it, every other spot above or below it by its
 * ground's height over the place point's and by its depth (north nearer, lower), in the frame's own perspective (px per
 * m at its depth). The rows below the dot are pressed (one factor) into the room down to the sheet, those above it into
 * the room up to the highest ridge line over the place's width: the order of every row kept, the ridge line's own
 * undulation never followed. Without the local ground, the ridge line and the slope's lift as before.
 */
function lieOf(input: OutsideInput) {
  const { place, terrain, city, reachKm, centerX, width, ground, floor } = input
  const pb = placeBounds(place, input.bounds, reachKm)
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
  } else frame = outsideFrame(city?.clusters, reachKm, centerX, width, true)
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
    return { frame, lie, topM, fabric, bounds, levelY, land: null, zeroContour: () => [] }
  }
  const h0 = heightNear(0, 0) ?? topM
  const near0 = outsideProject(frame, 0, 0).near
  const yDot = ground(centerX) + 1
  /** Px below the dot (+) or above it (−) for ground `h` m at a spot, before pressing. */
  const offset = (dx: number, dy: number, h: number) => {
    const at = outsideProject(frame, dx, dy)
    return (at.near - near0) * NEAR_DROP + (h0 - h) * at.k
  }
  const samples = groundSamples(frame, heightNear, inPlace)
  let below = 0, above = 0
  const reach = (dx: number, dy: number, h: number) => {
    const o = offset(dx, dy, h)
    if (o > below) below = o
    if (-o > above) above = -o
  }
  for (const g of samples) reach(g.dx, g.dy, g.h)
  squares.forEach(({ dx, dy }, i) => { if (!Number.isNaN(cellGround[i])) reach(dx, dy, cellGround[i]) })
  // The room above the dot: up to the highest ridge line over the place's width (and a little over it).
  const xs = [outsideProject(frame, frame.e, frame.n).x, outsideProject(frame, frame.w, frame.n).x]
  let ridgeTop = Infinity
  for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(width, Math.ceil(Math.max(...xs))); x++) ridgeTop = Math.min(ridgeTop, ground(x))
  const roomAbove = Math.max(MIN_ABOVE, (Number.isFinite(ridgeTop) ? yDot - ridgeTop : 0) + ABOVE_PAD)
  const roomBelow = Math.max(2, floor - yDot)
  // A place on the sea: its shore (sea level at its near edge) lies no higher than the true sea horizon, where the
  // panorama shows the sea; the rows below the dot are stretched (one factor) to reach it, never past the sheet.
  const coastal = samples.some((g) => Math.abs(g.h) <= 1)
  const shoreDrop = offset(0, frame.n, 0)
  const seaFit = coastal && shoreDrop > 0 ? (Math.min(floor, seaHorizonY(terrain)) - yDot) / shoreDrop : 0
  const pressBelow = below > 0 ? Math.min(roomBelow / below, Math.max(1, seaFit)) : 1
  const pressAbove = above > 0 ? Math.min(1, roomAbove / above) : 1
  // A row above the dot rises over the ridge line in view by `ABOVE_PAD` at most (its own ground under it): the place's
  // hill stands up out of the land it is seen against, never as a plateau in the sky.
  const levelY = (dx: number, dy: number, h = 0) => {
    const o = offset(dx, dy, h)
    const y = Math.min(floor, yDot + o * (o > 0 ? pressBelow : pressAbove))
    return o < 0 ? Math.max(y, Math.min(yDot, ground(outsideProject(frame, dx, dy).x) + 1 - ABOVE_PAD)) : y
  }
  const baseY = (dx: number, dy: number) => levelY(dx, dy, heightNear(dx, dy) ?? h0)
  const lie: PlaceLie = { ...(inPlace ? { inPlace } : {}), baseY }
  // Sea level by the same rule (the datum below sea level): 0 m where the place's ground in the frame crosses it.
  const zeroContour = () => placeContour(zeroCrossings(heightNear, frame, GROUND_STEP, inPlace),
    (dx, dy) => outsideProject(frame, dx, dy).x, levelY)
  return { frame, lie, topM, fabric, bounds, levelY, land: landOf(input, frame, samples, baseY), zeroContour }
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
  // The ground's height (m) at each column's crest: the snow on it, as on the ridge (C9).
  const crestM = new Float64Array(top.length).fill(NaN)
  let left = Infinity, right = -Infinity
  for (const g of samples) {
    if (wet(g.dx, g.dy)) continue
    const x = Math.round(outsideProject(frame, g.dx, g.dy).x)
    if (x < 0 || x > width) continue
    const y = baseY(g.dx, g.dy)
    if (y < top[x]) { top[x] = y; crestM[x] = g.h }
    left = Math.min(left, x); right = Math.max(right, x)
  }
  if (!(right > left)) return null
  // Gaps between the samples' columns closed from their neighbours, then a light smoothing.
  let last = -1
  for (let x = left; x <= right; x++) {
    if (!Number.isFinite(top[x])) continue
    if (last >= 0 && x - last > 1) for (let i = last + 1; i < x; i++) {
      top[i] = top[last] + (top[x] - top[last]) * (i - last) / (x - last)
      crestM[i] = crestM[last] + (crestM[x] - crestM[last]) * (i - last) / (x - last)
    }
    last = x
  }
  const pts: Pt[] = []
  const base: Pt[] = []
  const heightM: number[] = []
  let rises = false
  for (let x = Math.max(0, left - LAND_EASE); x <= Math.min(width, right + LAND_EASE); x++) {
    const own = top[Math.min(right, Math.max(left, x))]
    const smooth = (top[Math.max(left, Math.min(right, x - 1))] + 2 * own + top[Math.max(left, Math.min(right, x + 1))]) / 4
    const ease = x < left ? 1 - (left - x) / LAND_EASE : x > right ? 1 - (x - right) / LAND_EASE : 1
    const line = ground(x)
    const y = Math.min(line, line + (smooth - line) * ease * ease * (3 - 2 * ease))
    if (y < line - .4) rises = true
    pts.push([x, y])
    base.push([x, line + 2])
    heightM.push(crestM[Math.min(right, Math.max(left, x))])
  }
  return rises ? { top: pts, base, heightM, km: input.terrain.sightAt?.(frame.centerX * 375 / width).nearKm ?? 1 } : null
}

/** A tower beyond the crest shows when the panorama sees at least this many px of it over the land in front. */
const BEYOND_MIN_PX = 2.5

/**
 * Px of a thing (`heightM` tall, at km east / north of the place) the panorama truly sees over the near ridge from the
 * eye, at its true bearing and distance on the land's own scale (`seenAt`, as the far towns are placed); 0 when the land
 * in front hides it or the panorama cannot say, unbounded when it stands in front of the near ridge.
 */
function overTheCrest(terrain: SceneTerrain, dx: number, dy: number, heightM: number): number {
  const { seenAt } = terrain
  if (!seenAt) return 0
  const camera = terrain.camera ?? SCENE_CAMERA
  const x = xOf(Math.atan2(dx, dy) * 180 / Math.PI, camera) * SCENE_W / camera.width
  if (x < 0 || x > SCENE_W) return 0
  const km = Math.hypot(dx, dy)
  // In front of the near ridge: the whole of it stands on the land in view.
  if (terrain.sightAt && km <= terrain.sightAt(x).nearKm) return Infinity
  const seen = seenAt(x, km, heightM)
  if (!seen) return 0
  return Math.max(0, Math.min(seen.groundY, lineAt(terrain.nearPoints, x)) - seen.y)
}

/**
 * The towers beyond the place within the near skyline's reach (6 km), in the outside view's own perspective (C5b item 5):
 * at their true spot east / north, so a tower beyond is as far from that eye as it truly is: its x and base by the same
 * projection as the place's rows, its height by the perspective at its depth (never nearer than the place's near edge:
 * beyond the place, never larger than the place's own at that edge), its haze by its distance from the place's near edge, with the outside view's levels of detail.
 */
function beyondTowers(input: OutsideInput, frame: OutsideFrame, lie: PlaceLie, look: OutsideLook, baseKm: number): BeyondTower[] {
  const { place, city, width, landmarks, ground, floor } = input
  const raster = city?.raster
  if (!raster) return []
  const all = dedupeTowers((raster.towers ?? city?.towers ?? []).map((tower) => ({ ...tower, ...offsetKm(place, tower) })))
  const outside = all.filter((tower) => (!inFrame(frame, tower.dx, tower.dy) || !(lie.inPlace?.(tower.dx, tower.dy) ?? true))
    && inSkylineReach(Math.hypot(tower.dx, tower.dy)) && frame.eyeN - tower.dy > .5)
  if (!outside.length) return []
  const fame = towerFame(place, outside, landmarks)
  const ranked = outside.flatMap((tower) => {
    const at = outsideProject(frame, tower.dx, tower.dy)
    if (at.x < -4 || at.x > width + 4) return []
    // Beyond the place, never nearer than its near edge: the perspective's px a metre no larger than there.
    const k = Math.min(at.k, outsideProject(frame, 0, frame.n).k)
    const mark = fame.get(tower)
    // Beyond the place, it is never more than the panorama truly sees of it over the land in front (from the eye, at its
    // true bearing and distance, on the land's own scale, as the far towns are placed), and not there at all when the land
    // hides it: never a post on a bare skyline that the eye could not see.
    const over = overTheCrest(input.terrain, tower.dx, tower.dy, tower.heightM)
    if (over < BEYOND_MIN_PX) return []
    const h = Math.min(look.px(tower.heightM, k), over)
    const km = Math.max(baseKm + Math.max(0, Math.hypot(tower.dx, frame.eyeN - tower.dy) - (frame.eyeN - frame.n)), rowKm(frame, baseKm, tower.dy))
    return [{ tower, at: { ...at, k }, h, km, famous: Boolean(mark), name: mark?.nameHe ?? tower.name,
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
    // On its own ground by the place's rule, but never above the ridge line in view (beyond the place, it stands on it).
    const baseY = Math.max(ground(t.at.x) + 1, lieBaseY(lie, ground, t.at.x, t.at.near, floor, w, t.tower.dx, t.tower.dy))
    out.push({ x: t.at.x, baseY, w: Math.max(1.2, w),
      h: Math.max(2, t.h), near: 0, heightM: t.tower.heightM, seed: t.seed, name: t.name, famous: t.famous,
      lod: glyph ? 'glyph' : 'silhouette', crown: t.tower.heightM >= 180 ? 2 : (t.seed >>> 3) % 3 === 0 ? 1 : 0, km: t.km,
      dx: t.tower.dx, dy: t.tower.dy })
  }
  // Far first, then across.
  return out.sort((a, b) => b.km - a.km || a.x - b.x)
}

/** A town beyond shows when this many px of it stand over the land in front. */
const TOWN_MIN_PX = .8

/**
 * The towns beyond the place within the near skyline's reach (C9 defect 6): the far towns start at that reach
 * (`SKYLINE_TO_KM`, 6 km) and the outside view drew only the place's own fabric, so a neighbour 4–6 km out had its towers
 * (`beyondTowers`) and no town at their feet. Every built square of the city raster (≥ 20 % built) outside the place and
 * within the reach is drawn by the towers beyond's own rule: at its true spot in the outside view's projection, as wide
 * as it truly is there, its roof's height by the perspective (never nearer than the place's near edge), no more than the
 * panorama sees of it over the land in front (none when hidden), hazed by its distance. Far first.
 */
function beyondTowns(input: OutsideInput, frame: OutsideFrame, lie: PlaceLie, look: OutsideLook, baseKm: number): BeyondBlock[] {
  const { place, city, width, ground, floor } = input
  const raster = city?.raster
  if (!raster) return []
  const cos = Math.cos(place.lat * Math.PI / 180)
  const wKm = LON_STEP * 111.32 * cos
  const nearK = outsideProject(frame, 0, frame.n).k
  const out: BeyondBlock[] = []
  for (const sq of builtSquares(place, city, SKYLINE_TO_KM)) {
    const km0 = Math.hypot(sq.dx, sq.dy)
    if (km0 > SKYLINE_TO_KM || frame.eyeN - sq.dy <= .5) continue
    if (inFrame(frame, sq.dx, sq.dy) && (lie.inPlace?.(sq.dx, sq.dy) ?? true)) continue
    const at = outsideProject(frame, sq.dx, sq.dy)
    if (at.x < -4 || at.x > width + 4) continue
    const lat = place.lat + sq.dy / 111.32, lon = place.lon + sq.dx / (111.32 * cos)
    const cell = raster.at(lat, lon)
    const seed = hashId(`town:${lat.toFixed(4)}:${lon.toFixed(4)}`)
    const heightM = roofHeight(cell.levels, cell.p90, seeded(seed)())
    const over = overTheCrest(input.terrain, sq.dx, sq.dy, heightM)
    if (over < TOWN_MIN_PX) continue
    const k = Math.min(at.k, nearK)
    const h = Math.min(look.px(heightM, k), over)
    if (h < TOWN_MIN_PX) continue
    const w = Math.max(.8, wKm * frame.f / at.depth)
    const baseY = Math.max(ground(at.x) + 1, lieBaseY(lie, ground, at.x, at.near, floor, w, sq.dx, sq.dy))
    const km = Math.max(baseKm + Math.max(0, Math.hypot(sq.dx, frame.eyeN - sq.dy) - (frame.eyeN - frame.n)), rowKm(frame, baseKm, sq.dy))
    out.push({ x: at.x, baseY, w, h, km, heightM, seed })
  }
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

/** The place seen from outside: its frame, its own boundary and slope, mass and spires, the towers beyond, its sea. */
export function outsidePlace(input: OutsideInput): OutsidePlace {
  const { place, landmarks, city, ground, floor, width, terrain, centerX } = input
  const { frame, lie, topM, bounds, fabric, levelY, land, zeroContour } = lieOf(input)
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
    return [{ x: at.x, base, w, h: Math.max(1, look.px(t.heightM, at.k)), near: at.near, kind: t.kind, seed: t.seed, km: rowKm(frame, baseKm, t.dy) }]
  })
  return { frame, skyline, bounds, topM, lie, beyond: beyondTowers(input, frame, lie, look, baseKm),
    beyondTowns: beyondTowns(input, frame, lie, look, baseKm), trees, fabric: fabric.source,
    sea: coastalSeaOf(input, frame, baseKm, levelY), baseKm, land, zeroContour }
}
