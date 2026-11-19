import { boundsHoldKm, placeBounds, type BoundsFile, type PlaceBounds } from '../data/city/bounds'
import { LAT_STEP, LON_STEP } from '../data/city/grid'
import {
  baseYAt, budget, dedupeTowers, frameOfBox, GLYPH_M, GLYPH_W, inFrame, MAX_GLYPHS, NEAR_DROP, outsideFrame, outsideProject,
  outsideSkyline, SILHOUETTE_W, towerFame, type FabricCell, type FrameScale, type Ground, type OutsideFrame, type OutsideSkyline,
  type PlaceLie,
} from '../data/city/outsideView'
import { homeRoof, roofHeight, STOREY_M } from '../data/city/skylineHeight'
import { hashId, seeded } from '../data/landmarks/hash'
import { COVER, LAND_STEP } from '../data/land/grid'
import type { LandCover } from '../data/land/landData'
import { projectSkylineTowers } from '../data/city/skylineTowers'
import type { CityResult } from '../data/city/types'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { WaterMask } from '../data/water/waterMask'
import { VISIBLE_BOTTOM } from './layout'
import type { BeyondTower, CoastalSea, OutsideTreeSite, Pt } from './types'

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

/** The coastal sea's band over the sheet's edge (px). */
const SEA_H = 7
/** Rows of the coastal sea across the place's depth. */
const SEA_ROWS = 16
/** Px between samples along a row of the coastal sea. */
const SEA_STEP = 2
/** The sea counts as the place's when its coast lies within the frame or this many km of it. */
const SEA_MARGIN_KM = 1
/** Ground above the place's top raises a row by at most this many px. */
const MAX_RISE = 4
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
  sea: CoastalSea | null
  /** The near ridge's distance at the dot (km): the place's nearest row takes this haze. */
  baseKm: number
  /** The place's trees (layout px), and where its fabric came from (the land cover's cells, or the raster's squares). */
  trees: OutsideTreeSite[]
  fabric: 'cover' | 'raster'
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
        cells.push({ dx, dy, wKm, heightM: heightAt(lat, lon, seeded(seed)()), seed })
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

const quantile = (values: number[], q: number) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

/** The place's frame, boundary and slope (items 2 and 6). */
function lieOf(input: OutsideInput) {
  const { place, terrain, city, reachKm, centerX, width } = input
  const pb = placeBounds(place, input.bounds, reachKm)
  const inPlace = pb ? (dx: number, dy: number) => boundsHoldKm(pb, place, dx, dy) : undefined
  const fabric = fabricOf(place, input, inPlace, pb?.box ?? null)
  const squares = fabric.cells
  let frame: OutsideFrame
  if (pb || input.cover) {
    const xs = squares.map((sq) => sq.dx), ys = squares.map((sq) => sq.dy)
    // Half a cell round the place's built cells (its few outliers left out), so their boxes stand inside the frame.
    const box = squares.length ? { w: quantile(xs, FRAME_Q)! - .03, e: quantile(xs, 1 - FRAME_Q)! + .03,
      s: quantile(ys, FRAME_Q)! - .03, n: quantile(ys, 1 - FRAME_Q)! + .03 } : pb?.box ?? null
    frame = frameOfBox(box, reachKm, centerX, width, true, FRAME_SCALE)
  } else frame = outsideFrame(city?.clusters, reachKm, centerX, width, true)
  const heightNear = terrain.heightNear
  const heights = heightNear ? squares.filter(({ dx, dy }) => inFrame(frame, dx, dy))
    .flatMap(({ dx, dy }) => { const h = heightNear(dx, dy); return h === null ? [] : [h] }) : []
  const topM = quantile(heights, .95)
  const lowM = quantile(heights, 0)
  // The view's depth (the near drop) and the slope pressed together, by one factor for the whole place (the order of
  // the rows kept), into the room between the ridge line at the dot and the sheet.
  const room = Math.max(4, input.floor - input.ground(centerX) - 1)
  const span = NEAR_DROP + (topM !== null && lowM !== null ? (topM - lowM) * outsideProject(frame, 0, frame.n).k : 0)
  const press = Math.min(1, room / span)
  /** Px below the ridge line (beyond the pressed near drop) for ground `h` m at a spot. */
  const liftFor = (h: number, dx: number, dy: number) => {
    const at = outsideProject(frame, dx, dy)
    return press * Math.max(-MAX_RISE, (topM! - h) * at.k) - (1 - press) * at.near * NEAR_DROP
  }
  const lift = heightNear && topM !== null ? (dx: number, dy: number) => {
    const h = heightNear(dx, dy)
    return liftFor(h ?? topM, dx, dy)
  } : press < 1 ? (dx: number, dy: number) => -(1 - press) * outsideProject(frame, dx, dy).near * NEAR_DROP : undefined
  const lie: PlaceLie = { ...(inPlace ? { inPlace } : {}), ...(lift ? { lift } : {}) }
  return { frame, lie, topM, fabric, bounds: { source: pb?.source ?? 'cluster' as const, ...(pb?.name ? { name: pb.name } : {}) } }
}

/**
 * The towers beyond the place within the near skyline's reach, at their true bearing and distance (`projectSkylineTowers`:
 * on the land, hidden behind nearer roofs and ridges), with the outside view's levels of detail.
 */
function beyondTowers(input: OutsideInput, frame: OutsideFrame, lie: PlaceLie): BeyondTower[] {
  const { place, terrain, city, width, landmarks } = input
  const raster = city?.raster
  const { groundAt, angleY, sightAt } = terrain
  if (!raster || !groundAt || !angleY || !sightAt) return []
  const all = dedupeTowers((raster.towers ?? city?.towers ?? []).map((tower) => ({ ...tower, ...offsetKm(place, tower) })))
  const outside = all.filter((tower) => !inFrame(frame, tower.dx, tower.dy) || !(lie.inPlace?.(tower.dx, tower.dy) ?? true))
  if (!outside.length) return []
  const view = { ground: input.ground, groundAt, angleY, sightAt, camera: terrain.camera }
  const projected = projectSkylineTowers(place, raster, view, width, homeRoof(place, raster), outside)
  const byLocation = new Map(outside.map((tower) => [`${tower.lat}:${tower.lon}`, tower]))
  const fame = towerFame(place, outside, landmarks)
  const ranked = projected.flatMap((site) => {
    const tower = byLocation.get(`${site.location.lat}:${site.location.lon}`)
    if (!tower) return []
    const mark = fame.get(tower)
    return [{ site, tower, famous: Boolean(mark), name: mark?.nameHe ?? tower.name }]
  }).sort((a, b) => Number(b.famous) - Number(a.famous) || b.tower.heightM - a.tower.heightM)
  const glyphs = new Set(ranked.filter((t) => t.famous || t.tower.heightM >= GLYPH_M).slice(0, MAX_GLYPHS))
  const slots = new Map<number, number>()
  const counts = new Map<number, number>()
  for (const t of ranked) if (!glyphs.has(t)) counts.set(Math.floor(t.site.x / BEYOND_SLOT), (counts.get(Math.floor(t.site.x / BEYOND_SLOT)) ?? 0) + 1)
  const out: BeyondTower[] = []
  for (const t of ranked) {
    const glyph = glyphs.has(t)
    const slot = Math.floor(t.site.x / BEYOND_SLOT)
    if (!glyph) {
      const used = slots.get(slot) ?? 0
      if (used >= budget(counts.get(slot) ?? 0, BEYOND_CAP)) continue
      slots.set(slot, used + 1)
    }
    const w = glyph ? GLYPH_W[t.tower.wClass] : SILHOUETTE_W[t.tower.wClass]
    out.push({ x: t.site.x, baseY: t.site.baseY, w, h: Math.max(3, t.site.h), near: 0, heightM: t.tower.heightM, seed: t.site.seed,
      name: t.name, famous: t.famous, lod: glyph ? 'glyph' : 'silhouette',
      crown: t.tower.heightM >= 180 ? 2 : (t.site.seed >>> 3) % 3 === 0 ? 1 : 0, km: t.site.km })
  }
  // Far first, then across.
  return out.sort((a, b) => b.km - a.km || a.x - b.x)
}

/**
 * The coastal sea (item 1): per row of the place's depth, the water reaching the screen's edge, from its coast to that
 * edge, at sea level on the rows' line. Null for an inland place, or one whose water does not come within a km of its
 * frame.
 */
function coastalSeaOf(input: OutsideInput, frame: OutsideFrame, baseKm: number): CoastalSea | null {
  const { place, mask, ground, floor, width } = input
  if (!mask) return null
  const cos = Math.cos(place.lat * Math.PI / 180)
  const rows: { dy: number; near: number; coast: number | null; side: 'left' | 'right' | null }[] = []
  for (let i = 0; i <= SEA_ROWS; i++) {
    const dy = frame.s + (frame.n - frame.s) * i / SEA_ROWS
    const { depth, near } = outsideProject(frame, 0, dy)
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
    // The side whose water reaches further in across the frame; the coast must lie near the place.
    const pick = right !== null && (left === null || width - right >= left) ? { side: 'right' as const, coast: right }
      : left !== null ? { side: 'left' as const, coast: left } : null
    const dxCoast = pick ? (frame.centerX - pick.coast) * depth / frame.f : 0
    const close = pick && dxCoast >= frame.w - SEA_MARGIN_KM && dxCoast <= frame.e + SEA_MARGIN_KM
    rows.push({ dy, near, coast: close ? pick.coast : null, side: close ? pick.side : null })
  }
  const right = rows.filter((r) => r.side === 'right').length, left = rows.filter((r) => r.side === 'left').length
  const side = right >= left ? 'right' : 'left'
  const wetRows = rows.filter((r) => r.side === side)
  if (wetRows.length < 3) return null
  // The band runs over the rows that have the sea, far to near (contiguous: a gap closes at its neighbours' coast).
  const from = rows.indexOf(wetRows[0]), to = rows.indexOf(wetRows.at(-1)!)
  const band = rows.slice(from, to + 1).map((r, i, all) => {
    if (r.side === side && r.coast !== null) return { ...r, coast: r.coast }
    const prev = all.slice(0, i).reverse().find((o) => o.side === side)!, next = all.slice(i + 1).find((o) => o.side === side)!
    return { ...r, coast: side === 'right' ? Math.max(prev.coast!, next.coast!) : Math.min(prev.coast!, next.coast!) }
  })
  const edge = side === 'right' ? width : 0
  // The sea is level and lies under the place's lowest rows: a band along the foot of the land, from the coast out to
  // the edge (as the bay at the foot of v1b's Haifa), its far edge `SEA_H` px over the sheet, never above the land's line.
  const yAt = (x: number, row: typeof band[number]) => Math.max(ground(x) + 1,
    row.near >= 1 ? VISIBLE_BOTTOM : floor - SEA_H * (1 - row.near))
  const along = (row: typeof band[number], a: number, b: number): Pt[] => {
    const n = Math.max(1, Math.ceil(Math.abs(b - a) / 3))
    return Array.from({ length: n + 1 }, (_, i) => { const x = a + (b - a) * i / n; return [x, yAt(x, row)] as Pt })
  }
  const far = band[0], nearRow = band.at(-1)!
  const coast: Pt[] = band.map((r) => [r.coast, yAt(r.coast, r)])
  const points: Pt[] = [...along(far, far.coast, edge), ...along(nearRow, edge, nearRow.coast).slice(1), ...[...coast].reverse().slice(1, -1)]
  const ys = points.map(([, y]) => y)
  return { points, coast, side, top: Math.min(...ys), bottom: Math.max(...ys),
    km: [rowKm(frame, baseKm, far.dy), rowKm(frame, baseKm, nearRow.dy)] }
}

/** The place seen from outside: its frame, its own boundary and slope, mass and spires, the towers beyond, its sea. */
export function outsidePlace(input: OutsideInput): OutsidePlace {
  const { place, landmarks, city, ground, floor, width, terrain, centerX } = input
  const { frame, lie, topM, bounds, fabric } = lieOf(input)
  const towers = city?.raster?.towers ?? city?.towers ?? []
  const skyline = outsideSkyline({ variant: 'b', place, towers, landmarks, raster: city?.raster ?? undefined, frame, ground,
    floor, width, lie, fabric: fabric.cells })
  const baseKm = terrain.sightAt?.(centerX * 375 / width).nearKm ?? 1
  // Trees in the frame, back to front, each standing on its row (hidden ones are left to the painter's order).
  const trees = fabric.trees.filter((t) => inFrame(frame, t.dx, t.dy)).map((t) => {
    const at = outsideProject(frame, t.dx, t.dy)
    const w = Math.max(.9, Math.min(6, frame.f * .012 / at.depth * (t.kind === 'cypress' ? .55 : 1)))
    return { x: at.x, base: baseYAt(ground, at.x, at.near, floor, 0, lie.lift?.(t.dx, t.dy) ?? 0), w,
      h: Math.max(1, t.heightM * at.k), near: at.near, kind: t.kind, seed: t.seed, km: rowKm(frame, baseKm, t.dy) }
  }).filter((t) => t.x > -4 && t.x < width + 4)
  return { frame, skyline, bounds, topM, lie, beyond: beyondTowers(input, frame, lie), trees, fabric: fabric.source,
    sea: coastalSeaOf(input, frame, baseKm), baseKm }
}
