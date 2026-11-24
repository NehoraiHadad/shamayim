import { homeCluster } from './homeCluster'
import type { Cluster } from './clusterTypes'
import type { CityRaster } from './cityRaster'
import { LAT_STEP, LON_STEP } from './grid'
import { roofHeight } from './skylineHeight'
import { RAY_DISTANCES } from '../terrain/panorama'
import type { CityTower } from './types'
import { hashId, seeded } from '../landmarks/hash'
import { distanceOf, offsetKm, type Coordinate } from '../landmarks/project'
import { PORTRAIT_MARGIN_KM } from '../landmarks/portrait'
import type { Landmark } from '../landmarks/types'
import { fabricFrontage } from './fabricFrontage'
import { composeBodies, standingSites, type FabricSite } from './fabricSlots'
import { MassIndex, visible } from './skylineMass'
import { TOWER_FRONT_M } from './towerWidth'

/** The outside view's reach (km): a city's own skyline from the panorama's first ray out to 6 km; the far towns beyond. */
export const SKYLINE_FROM_KM = RAY_DISTANCES[0]
export const SKYLINE_TO_KM = 6
const DISTANCE_EPSILON = 1e-9
export const inSkylineReach = (km: number) => km >= SKYLINE_FROM_KM - DISTANCE_EPSILON && km <= SKYLINE_TO_KM + DISTANCE_EPSILON

/** The same tower twice (OSM and the raster, or two OSM points): within 250 m. */
export const sameTower = (a: Coordinate, b: Coordinate) => distanceOf(a, b) <= .25

/**
 * Design study (dev only, `?skyline=a|b|c`; docs/design/qa/true-scene/skyline/): the place seen from outside.
 *
 * The eye stands north of the place, looking south, far enough back that the whole place fits the view. Everything in
 * the place is placed by this one rule: left–right by its true east–west position (east on the left), depth by its
 * north–south position (north nearer: lower on the screen, larger; south farther: smaller, hazier). Heights are real
 * heights in that perspective, so a 300 m tower always stands over a 90 m one. Beyond the place the scene stays true.
 *
 * Three rules for how a dense place's towers read (they share the view, the dedupe and the fabric):
 * - `a` silhouettes: every tower its own small silhouette, thinned per screen slot by a soft budget that keeps more where
 *   there are more (density reads true) and the tallest first;
 * - `b` mass and spires: the built-up raster as one jagged mass; a tower that does not clear the mass by enough folds
 *   into it (raising it), only those that clear it rise as spires;
 * - `c` clusters: towers close together on the screen become one stepped block, out of which its tallest one or two
 *   rise; lone towers stand alone.
 * In all three, the famous (named and linked to Wikipedia / Wikidata) and the very tall get the full high-rise glyph.
 */

export interface OutsideFrame {
  /** The place's box in km from the place point: west, east, south, north. */
  w: number; e: number; s: number; n: number
  /** The eye's distance north of the place point (km), and its distance from the near edge. */
  eyeN: number; backKm: number
  /** Px per (km across / km deep). */
  f: number
  centerX: number
  /** Px per m of height at the middle depth. */
  k: number
  midDepth: number
}

/** Px a 1 m tall thing measures at the frame's middle depth (a 300 m tower ≈ 54 px, about as today's tallest). */
const K_MID = .18
/** The eye stands this many times the place's depth (or half-width) back from its north edge: near/far ≈ 1.7. */
const BACK = 1.4
/** Px the nearest row sits below the far row on the ridge. */
export const NEAR_DROP = 9

/**
 * The place's frame: its home cluster (the built-up area joined to it) within its portrait reach, plus the fields'
 * margin for a village. The dot (the place point) stays at the scene's centre.
 */
export function outsideFrame(clusters: readonly Cluster[] | undefined, reachKm: number, centerX: number, width: number,
  city: boolean, name?: string): OutsideFrame {
  const home = homeCluster(clusters ?? [], name)
  const margin = city ? 0 : PORTRAIT_MARGIN_KM
  const extent = home ? { w: home.dx[0] - margin, e: home.dx[1] + margin, s: home.dy[0] - margin, n: home.dy[1] + margin } : null
  return frameOfBox(extent, reachKm, centerX, width, city)
}

/**
 * The frame round a box of the place (km from the place point: west, east, south, north), clipped to its reach; the
 * whole reach when there is no box. `outsideFrame` gives the box of the home cluster; the canvas scene the built-up part
 * of the place within its own boundary (`world/outside.ts`, C5 item 6).
 */
export function frameOfBox(extent: { w: number; e: number; s: number; n: number } | null, reachKm: number, centerX: number,
  width: number, city: boolean, scale?: FrameScale): OutsideFrame {
  const clip = (v: number) => Math.max(-reachKm, Math.min(reachKm, v))
  const [w, e] = extent ? [clip(extent.w), clip(extent.e)] : [-reachKm, reachKm]
  const [s, n] = extent ? [clip(extent.s), clip(extent.n)] : [-reachKm, reachKm]
  const box = { w: Math.min(-.5, w), e: Math.max(.5, e), s: Math.min(-.5, s), n: Math.max(.5, n) }
  const backKm = BACK * Math.max(box.n - box.s, (box.e - box.w) / 2)
  const eyeN = box.n + backKm
  // A city fills the width; a village keeps to the middle, the land round it.
  const halfPx = scale ? Math.min(.45 * width, scale.halfPx(Math.max(-box.w, box.e)))
    : city ? .45 * width : Math.min(.45 * width, 40 + 25 * Math.max(-box.w, box.e))
  const f = halfPx * backKm / Math.max(-box.w, box.e)
  const midDepth = eyeN - (box.n + box.s) / 2
  // Heights: the study's fixed 0.18 px a metre, or the scale's for a place of this extent (one rule for every place).
  const k = scale ? scale.k(Math.max(-box.w, box.e, (box.n - box.s) / 2)) : K_MID
  return { ...box, eyeN, backKm, f, centerX, k, midDepth }
}

/**
 * How a frame takes the screen and its heights (the canvas scene, C5): half the width (px) a place `extentKm` wide (its
 * larger half-width) is given, and its px per metre of height at the middle depth.
 */
export interface FrameScale { halfPx: (extentKm: number) => number; k: (extentKm: number) => number }


export function inFrame(frame: OutsideFrame, dx: number, dy: number, marginKm = 0) {
  return dx >= frame.w - marginKm && dx <= frame.e + marginKm && dy >= frame.s - marginKm && dy <= frame.n + marginKm
}

/**
 * Whether a spot (km east / north of the place) belongs to the place itself in the outside view.
 * Without bounds (`lie.inPlace`), `marginKm` widens the cluster frame (0 for strict town-block ownership).
 */
export function isOwnSpot(frame: OutsideFrame, lie: PlaceLie, dx: number, dy: number, marginKm = 0): boolean {
  return inFrame(frame, dx, dy, lie.inPlace ? 0 : marginKm) && (lie.inPlace?.(dx, dy) ?? true)
}

/** Where a point of the place stands: x (east left), its nearness (0 at the far edge, 1 at the near) and px per m. */
export function outsideProject(frame: OutsideFrame, dx: number, dy: number) {
  const depth = frame.eyeN - dy
  const x = frame.centerX - frame.f * dx / depth
  const near = Math.max(0, Math.min(1, (dy - frame.s) / (frame.n - frame.s)))
  return { x, depth, near, k: frame.k * frame.midDepth / depth }
}

export type Ground = (x: number) => number
/**
 * A base stands on the lower edge of its footprint (as `seat.ts` does), nearer rows lower; `lift` px further down where
 * its row's ground lies below the place's top (the rows climb the slope the place stands on, C5 item 2).
 */
export const baseYAt = (ground: Ground, x: number, near: number, floor: number, w = 0, lift = 0) =>
  Math.min(floor, Math.max(ground(x - w / 2), ground(x + w / 2)) + 1 + near * NEAR_DROP + lift)

/**
 * The place's own lie of the land in the outside view (C5 items 2 and 6): which spots (km east / north) are of the
 * place (its own boundary), and how far (px) a row's base drops below the ridge line where its ground lies below the
 * place's top. The ridge line is where the place's highest ground stands; a row lower on the slope stands lower by its
 * real height difference in the view's perspective (the same px per m as the towers), so a city on a slope climbs it
 * instead of lining the crest. Absent (the SVG study): the whole frame, flat on the line.
 */
export interface PlaceLie {
  inPlace?: (dx: number, dy: number) => boolean
  lift?: (dx: number, dy: number) => number
  /**
   * The base y (layout px) of a spot of the place on its own ground (the canvas scene, C5b): from the place's local
   * ground and its depth alone, never the ridge line's undulation at that x. When set it replaces the ridge line + `lift`.
   */
  baseY?: (dx: number, dy: number) => number
}

/** A base of the place: on its own ground (`lie.baseY`) when the lie has one, else on the ridge line (+ `lift`). */
export const lieBaseY = (lie: PlaceLie, ground: Ground, x: number, near: number, floor: number, w: number, dx: number, dy: number) =>
  lie.baseY ? Math.min(floor, lie.baseY(dx, dy)) : baseYAt(ground, x, near, floor, w, lie.lift?.(dx, dy) ?? 0)

/** Below this roof (m, four storeys) a built cell is a house with its roof; above, a block of the mass. */
export const HOUSE_TOP_M = 12.5

/**
 * How the canvas scene's outside view sizes what it draws (C5b), beyond the true perspective: `px` the height (m) a
 * thing takes where the perspective gives `k` px a metre (the true `heightM·k`, or more for the low fabric so a house
 * stays legible, every height in its true order); `house` the smallest legible house (px wide, at the frame's middle
 * depth): where the built cells are narrower on screen, fewer, larger houses are composed inside the footprint; `plan`
 * the px a metre of frontage takes there, the house's own (one plan scale for the whole town: a block beside the houses
 * keeps its proportions to them instead of shrinking to its cell).
 * Absent (the SVG study): true sizes.
 */
export interface OutsideLook {
  px: (heightM: number, k: number) => number
  house: { w: number }
  plan: number
}
const pxOf = (look: OutsideLook | undefined, heightM: number, k: number) => look ? look.px(heightM, k) : heightM * k

export type TowerLod = 'glyph' | 'silhouette' | 'block'
export interface OutsideTower {
  x: number; baseY: number; w: number; h: number; near: number
  heightM: number; seed: number; name?: string; famous: boolean; lod: TowerLod; industrial?: true
  /** A crown on the silhouette: 0 flat, 1 a setback, 2 a mast (the tall ones). */
  crown: 0 | 1 | 2
  /** Where it stands: km east / north of the place. */
  dx?: number
  dy?: number
}
/**
 * One box of the place's built fabric (a built square, ~118 × 232 m, at its real width on the screen), a tower folded into
 * the mass (`b`), or one member of a tower block (`c`, drawn in one tone so the block reads as one stepped shape).
 */
export interface OutsideBox { x: number; w: number; top: number; foot: number; near: number; kind: 'fabric' | 'mass' | 'block'
  /** Its roof's real height (m): a built square's, or a folded tower's. */
  heightM?: number
  seed?: number
  /** Where it stands: km east / north of the place (the fabric's cells and folded towers). */
  dx?: number
  dy?: number }

/** Glyph shaft widths by width class (`SHAFT_WIDTHS` is 3.5 / 5 / 7; seen from outside they read a little narrower). */
export const GLYPH_W = [4.5, 5.5, 7] as const
/** An ordinary tower's silhouette, by width class. */
export const SILHOUETTE_W = [2, 2.5, 3.5] as const
/** The width (px) a `frontM` m frontage takes where the perspective gives `k` px a metre, on the place's plan scale. */
const planPx = (look: OutsideLook, frame: OutsideFrame, frontM: number, k: number) => look.plan * frontM * k / frame.k
export const GLYPH_M = 150
export const MAX_GLYPHS = 10

/** Two raster rows of one building (`G Tel Aviv` twice, 1 m apart): within 15 m and of about the same height. */
export function dedupeTowers<T extends CityTower>(towers: readonly T[]): T[] {
  const kept: T[] = []
  const order = [...towers].sort((a, b) => Number(Boolean(b.name)) - Number(Boolean(a.name)) || b.heightM - a.heightM)
  // Kept towers bucketed by 15 m squares: a tower meets only those in its own and the neighbouring squares (the same
  // answer as comparing with every kept one, in the same order).
  const cells = new Map<string, T[]>()
  const cellOf = (v: number) => Math.floor(v / .015)
  for (const tower of order) {
    const cx = cellOf(tower.dx), cy = cellOf(tower.dy)
    let twin = false
    for (let i = -1; i <= 1 && !twin; i++) for (let j = -1; j <= 1 && !twin; j++) {
      twin = cells.get(`${cx + i}:${cy + j}`)?.some(other => Math.hypot(other.dx - tower.dx, other.dy - tower.dy) <= .015
        && Math.abs(other.heightM - tower.heightM) <= .15 * Math.max(other.heightM, tower.heightM)) ?? false
    }
    if (twin) continue
    kept.push(tower)
    const key = `${cx}:${cy}`
    const list = cells.get(key)
    if (list) list.push(tower)
    else cells.set(key, [tower])
  }
  return kept
}

interface Prepared extends CityTower { industrial?: true; famous: boolean; seed: number; x: number; near: number; k: number; lie: PlaceLie }

/** A hand-drawn icon stands for the towers at its spot (Azrieli) when it is about as tall as they are; a bridge is not. */
function iconStandsFor(place: Coordinate, landmarks: readonly Landmark[]) {
  const icons = landmarks.filter(mark => mark.source === 'curated' && mark.heightM >= 40)
  return (tower: CityTower) => icons.some(mark => {
    const { dx, dy } = offsetKm(place, mark)
    return Math.hypot(dx - tower.dx, dy - tower.dy) <= .25 && tower.heightM >= .7 * mark.heightM
      && tower.heightM <= 1.3 * mark.heightM
  })
}

/** Each tower's fame from the famous high-rise marks of the map: the nearest tower within 120 m of one takes it. */
export function towerFame<T extends CityTower>(place: Coordinate, towers: readonly T[], landmarks: readonly Landmark[]) {
  const famous = landmarks.filter(mark => mark.source === 'osm' && mark.kind === 'highrise' && mark.fame && mark.nameHe)
  const fameOf = new Map<T, Landmark>()
  for (const mark of famous) {
    const { dx, dy } = offsetKm(place, mark)
    let best: T | undefined, bestKm = .12
    for (const tower of towers) {
      const km = Math.hypot(tower.dx - dx, tower.dy - dy)
      if (km < bestKm && !fameOf.has(tower)) { best = tower; bestKm = km }
    }
    if (best) fameOf.set(best, mark)
  }
  return fameOf
}

/**
 * The place's towers, deduped, without those a hand-drawn icon stands for (Azrieli), each with its fame from the
 * famous high-rise marks of the map (the nearest tower within 120 m of one takes its name and fame).
 */
function prepare(place: Coordinate, towers: readonly CityTower[], landmarks: readonly Landmark[], frame: OutsideFrame,
  lie: PlaceLie = {}) {
  const icon = iconStandsFor(place, landmarks)
  const own = dedupeTowers(towers.map(tower => ({ ...tower, ...offsetKm(place, tower) })))
    .filter(tower => isOwnSpot(frame, lie, tower.dx, tower.dy))
    .filter(tower => !icon(tower))
  const fameOf = towerFame(place, own, landmarks)
  const industrial = landmarks.filter(mark => mark.nameHe && (mark.kind === 'chimney' || mark.kind === 'cooling'))
  return own.map((tower): Prepared => {
    const mark = fameOf.get(tower)
    const { x, near, k } = outsideProject(frame, tower.dx, tower.dy)
    // A skyline source can also be catalogued as an industrial landmark.
    const stack = industrial.some(candidate => candidate.nameHe === tower.name && sameTower(candidate, tower))
    return { ...tower, name: mark?.nameHe ?? tower.name, famous: Boolean(mark), x, near, k, lie,
      ...(stack ? { industrial: true as const } : {}),
      seed: hashId(`${tower.lat.toFixed(5)}:${tower.lon.toFixed(5)}`) }
  })
}

const byRank = (a: Prepared, b: Prepared) => Number(b.famous) - Number(a.famous) || b.heightM - a.heightM || b.near - a.near

function placed(tower: Prepared, lod: TowerLod, ground: Ground, floor: number, frame: OutsideFrame, look?: OutsideLook): OutsideTower {
  const minimum = (lod === 'glyph' ? GLYPH_W : SILHOUETTE_W)[tower.wClass]
  // Industrial stacks use their silhouette: the catalogue building band can include the plant around the shaft.
  const w = Math.max(minimum, look && !tower.industrial ? planPx(look, frame, TOWER_FRONT_M[tower.wClass], tower.k) : 0)
  const h = Math.max(4, pxOf(look, tower.heightM, tower.k))
  return { x: tower.x, baseY: lieBaseY(tower.lie, ground, tower.x, tower.near, floor, w, tower.dx, tower.dy), w, h, near: tower.near,
    heightM: tower.heightM,
    seed: tower.seed, name: tower.name, famous: tower.famous, lod, dx: tower.dx, dy: tower.dy,
    ...(tower.industrial ? { industrial: true as const } : {}),
    crown: tower.heightM >= 180 ? 2 : (tower.seed >>> 3) % 3 === 0 ? 1 : 0 }
}

/** The famous first, then the tallest of what is left at ≥ 150 m; at most `MAX_GLYPHS`. */
function glyphs(towers: readonly Prepared[]) {
  return new Set([...towers].filter(tower => tower.famous || tower.heightM >= GLYPH_M).sort(byRank).slice(0, MAX_GLYPHS))
}

/** Soft budget per slot of the screen: more drawn where there are more, but never more than `cap` (no mush). */
export const budget = (count: number, cap: number) => Math.min(count, Math.ceil(cap * (1 - Math.exp(-count / cap))))

interface MassInput {
  place: Coordinate; raster: CityRaster | undefined; frame: OutsideFrame; ground: Ground; floor: number; width: number
  lie: PlaceLie
  /** Metres a roof may reach in this mass. */
  capM: number
  kind: 'fabric' | 'mass'
}

/**
 * The built squares of the place (`CityRaster`) as boxes in the outside view: each at its real width on the screen, its
 * roof at its real height (capped), standing on its own ground. Used by the variant B skyline study, which supplies
 * coarse raster squares instead of the app's finer fabric cells. Boxes wholly hidden behind nearer ones are left out.
 */
function rasterBoxes({ place, raster, frame, ground, floor, width, capM, kind, lie }: MassInput): OutsideBox[] {
  if (!raster) return []
  const south = place.lat + frame.s / 111.32, north = place.lat + frame.n / 111.32
  const cos = Math.cos(place.lat * Math.PI / 180)
  const west = place.lon + frame.w / (111.32 * cos), east = place.lon + frame.e / (111.32 * cos)
  const halfKm = LON_STEP * 111.32 * cos / 2
  const boxes: OutsideBox[] = []
  for (let row = Math.floor(south / LAT_STEP); row <= Math.floor(north / LAT_STEP); row++) {
    for (let col = Math.floor(west / LON_STEP); col <= Math.floor(east / LON_STEP); col++) {
      const lat = (row + .5) * LAT_STEP, lon = (col + .5) * LON_STEP
      const { built, levels, p90 } = raster.at(lat, lon)
      if (built < .2) continue
      const { dx, dy } = offsetKm(place, { lat, lon })
      if (lie.inPlace && !lie.inPlace(dx, dy)) continue
      const { x, near, k } = outsideProject(frame, dx, dy)
      if (x < -4 || x > width + 4) continue
      const random = seeded(hashId(`${row}:${col}`))
      const heightM = Math.min(capM, roofHeight(levels, p90, random()))
      // A sparse square is a narrower box: some ground shows between.
      const w = Math.max(1.2, 2 * frame.f * halfKm / (frame.eyeN - dy) * Math.min(1, built + .25))
      const at = x + (random() - .5) * w * .3
      const foot = lieBaseY(lie, ground, at, near, floor, w, dx, dy)
      boxes.push({ x: at, w, top: foot - Math.max(1.5, heightM * k), foot, near, kind, heightM })
    }
  }
  return visible(boxes, width)
}

const asBox = (tower: OutsideTower, kind: OutsideBox['kind'], top = tower.baseY - tower.h): OutsideBox =>
  ({ x: tower.x, w: tower.w, top, foot: tower.baseY, near: tower.near, kind, heightM: tower.heightM, dx: tower.dx, dy: tower.dy })

export interface OutsideSkylineInput {
  place: Coordinate
  towers: readonly CityTower[]
  landmarks: readonly Landmark[]
  raster?: CityRaster
  frame: OutsideFrame
  ground: Ground
  floor: number
  width: number
  /** The place's own boundary and slope (C5); absent: the whole frame, flat on the line. */
  lie?: PlaceLie
  /**
   * The place's built fabric as finer cells (C5: the land cover's built cells, ~60 × 50 m, heights from the city raster),
   * in place of the raster's squares; each a box at its real width and roof height.
   */
  fabric?: readonly FabricCell[]
  /** How heights and houses are sized (the canvas scene, C5b); absent: true sizes. */
  look?: OutsideLook
}

/** One built cell of the place: km east / north, its width (km), its roof's height (m) and a seed. */
export interface FabricCell {
  dx: number; dy: number; wKm: number; heightM: number; seed: number
  /** Its typical building's frontage (m), where the map knows it. */
  frontM?: number
  /** The house its site is laid out as (m), where a sparse square's own roof differs. */
  siteHeightM?: number
}

/**
 * The fabric cells in the outside view: the sites that stand, laid out as houses and blocks (`FabricSite`), and with a
 * `look` the bodies on them, each as wide as its own height needs on the place's plan scale. Hidden ones are left out.
 */
function fabricBoxes(cells: readonly FabricCell[], { frame, ground, floor, width, capM, kind, lie }: MassInput, look?: OutsideLook) {
  const sites: FabricSite[] = []
  for (const cell of cells) {
    if (!inFrame(frame, cell.dx, cell.dy)) continue
    const { x, near, k, depth } = outsideProject(frame, cell.dx, cell.dy)
    const w = Math.max(.9, frame.f * cell.wKm / depth)
    if (x + w / 2 < -4 || x - w / 2 > width + 4) continue
    const heightM = Math.min(capM, cell.heightM), siteM = Math.min(capM, cell.siteHeightM ?? cell.heightM)
    const house = look ? look.house.w * k / frame.k : 0
    const legible = siteM < HOUSE_TOP_M ? house : 0
    const siteW = Math.max(w, legible)
    const foot = lieBaseY(lie, ground, x, near, floor, siteW, cell.dx, cell.dy)
    const roof = (m: number) => foot - Math.max(1, pxOf(look, m, k))
    const box = { x, w: siteW, top: roof(siteM), foot, near, kind, heightM: siteM, seed: cell.seed, dx: cell.dx, dy: cell.dy }
    const mapped = look ? Math.min(planPx(look, frame, cell.frontM ?? 0, k), pxOf(look, heightM, k)) : 0
    const bodyW = look ? fabricFrontage(w, house, mapped, heightM, HOUSE_TOP_M) : w
    sites.push({ box, slotW: w < legible ? legible : 0, body: { ...box, w: bodyW, top: roof(heightM), heightM } })
  }
  const standing = standingSites(sites)
  const bodies = look ? composeBodies(standing, HOUSE_TOP_M) : standing.map(({ body }) => body)
  return { sites: standing.map(({ box }) => box), boxes: visible(bodies, width) }
}

export interface OutsideSkyline {
  towers: OutsideTower[]
  boxes: OutsideBox[]
  /** Counts for the design sheet: towers in the place, drawn as glyphs, silhouettes, folded into blocks or mass. */
  stats: { inPlace: number; glyph: number; silhouette: number; folded: number; dropped: number; duplicates: number }
}

/** The mass's roofs reach this high at most (m): higher towers rise as spires or fold into it. */
const MASS_M = 60
/** A tower must clear the mass by this many px to rise as a spire. */
const RISE_PX = 7

export function outsideSkyline(input: OutsideSkylineInput): OutsideSkyline {
  const { place, towers, landmarks, raster, frame, ground, floor, width, lie = {}, look } = input
  const deduped = dedupeTowers(towers)
  const prepared = prepare(place, towers, landmarks, frame, lie)
  const inPlace = prepared.length
  const fullGlyphs = glyphs(prepared)
  const mass: MassInput = { place, raster, frame, ground, floor, width, lie,
    capM: MASS_M, kind: 'mass' }
  const fabric = input.fabric && fabricBoxes(input.fabric, mass, look)
  let boxes = fabric?.boxes ?? rasterBoxes(mass)
  const out: OutsideTower[] = []
  let folded = 0, dropped = 0
  const ranked = [...prepared].sort(byRank)
  // Shortest first: each folds into the mass it meets, so a dense patch of towers builds a high mass round it.
  // Which towers rise is the sites' question (a body's drawn width raises no new mass): each is probed as its silhouette.
  const index = new MassIndex(fabric && prepared.length > fullGlyphs.size ? visible(fabric.sites, width) : boxes)
  const probe = (tower: OutsideTower, { wClass, dx, dy }: Prepared) => {
    const w = SILHOUETTE_W[wClass]
    return { ...tower, w, baseY: lieBaseY(lie, ground, tower.x, tower.near, floor, w, dx, dy) }
  }
  const probes = new Map<OutsideTower, OutsideTower>()
  const fold = (tower: OutsideTower) => {
    const box = asBox(tower, 'mass')
    boxes.push(box)
    index.add(asBox(probes.get(tower)!, 'mass'))
    folded++
  }
  for (const tower of [...ranked].reverse()) {
    if (fullGlyphs.has(tower)) { out.push(placed(tower, 'glyph', ground, floor, frame, look)); continue }
    const drawn = placed(tower, 'silhouette', ground, floor, frame, look)
    const nominal = probe(drawn, tower)
    probes.set(drawn, nominal)
    if (nominal.baseY - nominal.h < index.top(nominal.x) - RISE_PX) out.push(drawn)
    else fold(drawn)
  }
  // A spire placed before the mass rose round it may no longer clear it: it folds in too.
  for (let i = out.length - 1; i >= 0; i--) {
    const tower = out[i]
    const nominal = probes.get(tower)
    if (nominal && nominal.baseY - nominal.h >= index.top(nominal.x) - RISE_PX) {
      out.splice(i, 1)
      fold(tower)
    }
  }
  boxes = visible(boxes, width)
  const stats = {
    inPlace, glyph: out.filter(t => t.lod === 'glyph').length, silhouette: out.filter(t => t.lod === 'silhouette').length,
    folded, dropped, duplicates: towers.length - deduped.length,
  }
  // Painter's order: far first.
  return { towers: out.sort((a, b) => a.near - b.near || a.x - b.x), boxes, stats }
}
