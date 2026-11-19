import { homeCluster } from './homeCluster'
import type { Cluster } from './clusterTypes'
import type { CityRaster } from './cityRaster'
import { LAT_STEP, LON_STEP } from './grid'
import { roofHeight } from './skylineHeight'
import type { CityTower } from './types'
import { hashId, seeded } from '../landmarks/hash'
import { offsetKm, type Coordinate } from '../landmarks/project'
import { PORTRAIT_MARGIN_KM } from '../landmarks/portrait'
import type { Landmark } from '../landmarks/types'

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
export type SkylineVariant = 'a' | 'b' | 'c'
export const SKYLINE_VARIANTS: readonly SkylineVariant[] = ['a', 'b', 'c']

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
  city: boolean): OutsideFrame {
  const home = clusters?.length ? homeCluster([...clusters]) : null
  const margin = city ? 0 : PORTRAIT_MARGIN_KM
  const clip = (v: number) => Math.max(-reachKm, Math.min(reachKm, v))
  const [w, e] = home ? [clip(home.dx[0] - margin), clip(home.dx[1] + margin)] : [-reachKm, reachKm]
  const [s, n] = home ? [clip(home.dy[0] - margin), clip(home.dy[1] + margin)] : [-reachKm, reachKm]
  const box = { w: Math.min(-.5, w), e: Math.max(.5, e), s: Math.min(-.5, s), n: Math.max(.5, n) }
  const backKm = BACK * Math.max(box.n - box.s, (box.e - box.w) / 2)
  const eyeN = box.n + backKm
  // A city fills the width; a village keeps to the middle, the land round it.
  const halfPx = city ? .45 * width : Math.min(.45 * width, 40 + 25 * Math.max(-box.w, box.e))
  const f = halfPx * backKm / Math.max(-box.w, box.e)
  const midDepth = eyeN - (box.n + box.s) / 2
  return { ...box, eyeN, backKm, f, centerX, k: K_MID, midDepth }
}

export function inFrame(frame: OutsideFrame, dx: number, dy: number, marginKm = 0) {
  return dx >= frame.w - marginKm && dx <= frame.e + marginKm && dy >= frame.s - marginKm && dy <= frame.n + marginKm
}

/** Where a point of the place stands: x (east left), its nearness (0 at the far edge, 1 at the near) and px per m. */
export function outsideProject(frame: OutsideFrame, dx: number, dy: number) {
  const depth = frame.eyeN - dy
  const x = frame.centerX - frame.f * dx / depth
  const near = Math.max(0, Math.min(1, (dy - frame.s) / (frame.n - frame.s)))
  return { x, depth, near, k: frame.k * frame.midDepth / depth }
}

export type Ground = (x: number) => number
/** A base stands on the lower edge of its footprint (as `seat.ts` does), nearer rows lower. */
export const baseYAt = (ground: Ground, x: number, near: number, floor: number, w = 0) =>
  Math.min(floor, Math.max(ground(x - w / 2), ground(x + w / 2)) + 1 + near * NEAR_DROP)

export type TowerLod = 'glyph' | 'silhouette' | 'block'
export interface OutsideTower {
  x: number; baseY: number; w: number; h: number; near: number
  heightM: number; seed: number; name?: string; famous: boolean; lod: TowerLod
  /** A crown on the silhouette: 0 flat, 1 a setback, 2 a mast (the tall ones). */
  crown: 0 | 1 | 2
}
/**
 * One box of the place's built fabric (a built square, ~118 × 232 m, at its real width on the screen), a tower folded into
 * the mass (`b`), or one member of a tower block (`c`, drawn in one tone so the block reads as one stepped shape).
 */
export interface OutsideBox { x: number; w: number; top: number; foot: number; near: number; kind: 'fabric' | 'mass' | 'block' }

/** Glyph shaft widths by width class (`SHAFT_WIDTHS` is 3.5 / 5 / 7; seen from outside they read a little narrower). */
const GLYPH_W = [4.5, 5.5, 7] as const
/** An ordinary tower's silhouette, by width class. */
const SILHOUETTE_W = [2, 2.5, 3.5] as const
const GLYPH_M = 150
const MAX_GLYPHS = 10

/** Two raster rows of one building (`G Tel Aviv` twice, 1 m apart): within 15 m and of about the same height. */
export function dedupeTowers(towers: readonly CityTower[]): CityTower[] {
  const kept: CityTower[] = []
  const order = [...towers].sort((a, b) => Number(Boolean(b.name)) - Number(Boolean(a.name)) || b.heightM - a.heightM)
  for (const tower of order) {
    if (kept.some(other => Math.hypot(other.dx - tower.dx, other.dy - tower.dy) <= .015
      && Math.abs(other.heightM - tower.heightM) <= .15 * Math.max(other.heightM, tower.heightM))) continue
    kept.push(tower)
  }
  return kept
}

interface Prepared extends CityTower { famous: boolean; seed: number; x: number; near: number; k: number }

/**
 * The place's towers, deduped, without those a hand-drawn icon stands for (Azrieli), each with its fame from the
 * famous high-rise marks of the map (the nearest tower within 120 m of one takes its name and fame).
 */
function prepare(place: Coordinate, towers: readonly CityTower[], landmarks: readonly Landmark[], frame: OutsideFrame) {
  const famous = landmarks.filter(mark => mark.source === 'osm' && mark.kind === 'highrise' && mark.fame && mark.nameHe)
  // A hand-drawn icon stands for the towers at its spot (Azrieli) when it is about as tall as they are; a bridge is not.
  const icons = landmarks.filter(mark => mark.source === 'curated' && mark.heightM >= 40)
  const own = dedupeTowers(towers.map(tower => ({ ...tower, ...offsetKm(place, tower) })))
    .filter(tower => inFrame(frame, tower.dx, tower.dy))
    .filter(tower => !icons.some(mark => {
      const { dx, dy } = offsetKm(place, mark)
      return Math.hypot(dx - tower.dx, dy - tower.dy) <= .25 && tower.heightM >= .7 * mark.heightM
        && tower.heightM <= 1.3 * mark.heightM
    }))
  const fameOf = new Map<CityTower, Landmark>()
  for (const mark of famous) {
    const { dx, dy } = offsetKm(place, mark)
    let best: CityTower | undefined, bestKm = .12
    for (const tower of own) {
      const km = Math.hypot(tower.dx - dx, tower.dy - dy)
      if (km < bestKm && !fameOf.has(tower)) { best = tower; bestKm = km }
    }
    if (best) fameOf.set(best, mark)
  }
  return own.map((tower): Prepared => {
    const mark = fameOf.get(tower)
    const { x, near, k } = outsideProject(frame, tower.dx, tower.dy)
    return { ...tower, name: mark?.nameHe ?? tower.name, famous: Boolean(mark), x, near, k,
      seed: hashId(`${tower.lat.toFixed(5)}:${tower.lon.toFixed(5)}`) }
  })
}

const byRank = (a: Prepared, b: Prepared) => Number(b.famous) - Number(a.famous) || b.heightM - a.heightM || b.near - a.near

function placed(tower: Prepared, lod: TowerLod, ground: Ground, floor: number): OutsideTower {
  const w = lod === 'glyph' ? GLYPH_W[tower.wClass] : SILHOUETTE_W[tower.wClass]
  const h = Math.max(4, tower.heightM * tower.k)
  return { x: tower.x, baseY: baseYAt(ground, tower.x, tower.near, floor, w), w, h, near: tower.near, heightM: tower.heightM,
    seed: tower.seed, name: tower.name, famous: tower.famous, lod,
    crown: tower.heightM >= 180 ? 2 : (tower.seed >>> 3) % 3 === 0 ? 1 : 0 }
}

/** The famous first, then the tallest of what is left at ≥ 150 m; at most `MAX_GLYPHS`. */
function glyphs(towers: readonly Prepared[]) {
  return new Set([...towers].filter(tower => tower.famous || tower.heightM >= GLYPH_M).sort(byRank).slice(0, MAX_GLYPHS))
}

/** Soft budget per slot of the screen: more drawn where there are more, but never more than `cap` (no mush). */
export const budget = (count: number, cap: number) => Math.min(count, Math.ceil(cap * (1 - Math.exp(-count / cap))))
const SLOT = 10
const SLOT_CAP = 6

interface MassInput {
  place: Coordinate; raster: CityRaster | undefined; frame: OutsideFrame; ground: Ground; floor: number; width: number
  /** Metres a roof may reach in this mass. */
  capM: number
  kind: 'fabric' | 'mass'
}

/**
 * The built squares of the place (`CityRaster`) as boxes in the outside view: each at its real width on the screen, its
 * roof at its real height (capped), standing on its own ground. Boxes wholly hidden behind nearer ones are left out.
 */
function rasterBoxes({ place, raster, frame, ground, floor, width, capM, kind }: MassInput): OutsideBox[] {
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
      const { x, near, k } = outsideProject(frame, dx, dy)
      if (x < -4 || x > width + 4) continue
      const random = seeded(hashId(`${row}:${col}`))
      const heightM = Math.min(capM, roofHeight(levels, p90, random()))
      // A sparse square is a narrower box: some ground shows between.
      const w = Math.max(1.2, 2 * frame.f * halfKm / (frame.eyeN - dy) * Math.min(1, built + .25))
      const at = x + (random() - .5) * w * .3
      const foot = baseYAt(ground, at, near, floor, w)
      boxes.push({ x: at, w, top: foot - Math.max(1.5, heightM * k), foot, near, kind })
    }
  }
  return visible(boxes, width)
}

/** Near to far: a box whose top is under the nearer boxes' tops all across it is hidden. */
function visible(boxes: OutsideBox[], width: number): OutsideBox[] {
  const cover = new Float64Array(Math.ceil(width) + 8).fill(Infinity)
  const kept: OutsideBox[] = []
  for (const box of [...boxes].sort((a, b) => b.near - a.near)) {
    const from = Math.max(0, Math.floor(box.x - box.w / 2)), to = Math.min(cover.length, Math.ceil(box.x + box.w / 2))
    let shows = false
    for (let px = from; px < to; px++) if (box.top < cover[px] - .25) shows = true
    if (!shows) continue
    kept.push(box)
    for (let px = from; px < to; px++) cover[px] = Math.min(cover[px], box.top)
  }
  return kept
}

/** The mass's top at x (the highest box over it). */
function massTop(boxes: readonly OutsideBox[], x: number) {
  let top = Infinity
  for (const box of boxes) if (Math.abs(box.x - x) <= box.w / 2) top = Math.min(top, box.top)
  return top
}

const asBox = (tower: OutsideTower, kind: OutsideBox['kind'], top = tower.baseY - tower.h): OutsideBox =>
  ({ x: tower.x, w: tower.w, top, foot: tower.baseY, near: tower.near, kind })

export interface OutsideSkylineInput {
  variant: SkylineVariant
  place: Coordinate
  towers: readonly CityTower[]
  landmarks: readonly Landmark[]
  raster?: CityRaster
  frame: OutsideFrame
  ground: Ground
  floor: number
  width: number
}

export interface OutsideSkyline {
  variant: SkylineVariant
  towers: OutsideTower[]
  boxes: OutsideBox[]
  /** Counts for the design sheet: towers in the place, drawn as glyphs, silhouettes, folded into blocks or mass. */
  stats: { inPlace: number; glyph: number; silhouette: number; folded: number; dropped: number; duplicates: number }
}

/** Low-rise fabric of the place under every variant: the built squares, roofs to 16 m. */
const FABRIC_M = 16
/** A tower must clear the mass by this many px to rise as a spire (`b`). */
const RISE_PX = 7
/** Towers within this many px of each other on the screen make one cluster (`c`), of at least `CLUSTER_MIN`. */
const CLUSTER_GAP = 3
const CLUSTER_MIN = 4

export function outsideSkyline(input: OutsideSkylineInput): OutsideSkyline {
  const { variant, place, towers, landmarks, raster, frame, ground, floor, width } = input
  const deduped = dedupeTowers(towers)
  const prepared = prepare(place, towers, landmarks, frame)
  const inPlace = prepared.length
  const fullGlyphs = glyphs(prepared)
  let boxes = rasterBoxes({ place, raster, frame, ground, floor, width,
    capM: variant === 'b' ? 60 : FABRIC_M, kind: variant === 'b' ? 'mass' : 'fabric' })
  const out: OutsideTower[] = []
  let folded = 0, dropped = 0
  const ranked = [...prepared].sort(byRank)
  if (variant === 'a') {
    const slots = new Map<number, Prepared[]>()
    for (const tower of ranked) {
      const slot = Math.floor(tower.x / SLOT)
      slots.set(slot, [...slots.get(slot) ?? [], tower])
    }
    for (const list of slots.values()) {
      const room = budget(list.length, SLOT_CAP)
      list.forEach((tower, i) => {
        if (fullGlyphs.has(tower)) out.push(placed(tower, 'glyph', ground, floor))
        else if (i < room) out.push(placed(tower, 'silhouette', ground, floor))
        else dropped++
      })
    }
  } else if (variant === 'b') {
    // Shortest first: each folds into the mass it meets, so a dense patch of towers builds a high mass round it.
    const fold = (tower: OutsideTower) => { boxes.push(asBox(tower, 'mass')); folded++ }
    for (const tower of [...ranked].reverse()) {
      if (fullGlyphs.has(tower)) { out.push(placed(tower, 'glyph', ground, floor)); continue }
      const drawn = placed(tower, 'silhouette', ground, floor)
      if (drawn.baseY - drawn.h < massTop(boxes, drawn.x) - RISE_PX) out.push(drawn)
      else fold(drawn)
    }
    // A spire placed before the mass rose round it may no longer clear it: it folds in too.
    for (let i = out.length - 1; i >= 0; i--) {
      const tower = out[i]
      if (tower.lod === 'silhouette' && tower.baseY - tower.h >= massTop(boxes, tower.x) - RISE_PX) {
        out.splice(i, 1)
        fold(tower)
      }
    }
    boxes = visible(boxes, width)
  } else {
    const rest = ranked.filter(tower => !fullGlyphs.has(tower)).map(tower => placed(tower, 'silhouette', ground, floor))
    for (const tower of ranked) if (fullGlyphs.has(tower)) out.push(placed(tower, 'glyph', ground, floor))
    rest.sort((a, b) => a.x - b.x)
    const clusters: OutsideTower[][] = []
    for (const tower of rest) {
      const last = clusters.at(-1)
      const prev = last?.at(-1)
      if (last && prev && tower.x - tower.w / 2 <= prev.x + prev.w / 2 + CLUSTER_GAP) last.push(tower)
      else clusters.push([tower])
    }
    for (const cluster of clusters) {
      if (cluster.length < CLUSTER_MIN) { out.push(...cluster); continue }
      const tallest = [...cluster].sort((a, b) => b.heightM - a.heightM)
      const rising = tallest.slice(0, cluster.length >= 12 ? 2 : 1)
      out.push(...rising)
      const members = tallest.slice(rising.length)
      folded += members.length
      // A block reads as one building group: its steps a little under the towers' own tops, its gaps closed.
      const block = members.map(tower => asBox(tower, 'block', tower.baseY - .9 * tower.h)).sort((a, b) => a.x - b.x)
      const near = Math.max(...block.map(box => box.near))
      for (let i = 1; i < block.length; i++) {
        const [a, b] = [block[i - 1], block[i]]
        const gap = (b.x - b.w / 2) - (a.x + a.w / 2)
        if (gap > 0) boxes.push({ x: (a.x + a.w / 2 + b.x - b.w / 2) / 2, w: gap + .2, top: Math.max(a.top, b.top),
          foot: Math.max(a.foot, b.foot), near, kind: 'block' })
      }
      boxes.push(...block.map(box => ({ ...box, near })))
    }
  }
  const stats = {
    inPlace, glyph: out.filter(t => t.lod === 'glyph').length, silhouette: out.filter(t => t.lod === 'silhouette').length,
    folded, dropped, duplicates: towers.length - deduped.length,
  }
  // Painter's order: far first.
  return { variant, towers: out.sort((a, b) => a.near - b.near || a.x - b.x), boxes, stats }
}

/** The dev flag (`?skyline=a|b|c`). */
export function skylineVariantFlag(): SkylineVariant | null {
  if (typeof window === 'undefined' || !import.meta.env?.DEV) return null
  const value = new URLSearchParams(window.location.search).get('skyline')
  return value === 'a' || value === 'b' || value === 'c' ? value : null
}
