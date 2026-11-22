import { viableNeighbour } from './neighbourPolicy'
import { isFamousLandmark } from '../data/landmarks/fame'
import { LAT_STEP, LON_STEP, squareOf, squareKey } from '../data/city/grid'
import { isOwnSpot, lieBaseY, outsideProject, SKYLINE_TO_KM, type Ground, type OutsideFrame,
  type PlaceLie } from '../data/city/outsideView'
import { roofHeight } from '../data/city/skylineHeight'
import type { CityResult } from '../data/city/types'
import { hashId, seeded } from '../data/landmarks/hash'
import { offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import { apparentHeight, baseAngle, MARK_MIN_PX } from '../data/terrain/apparentHeight'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA, xOf } from '../domain/camera'
import { glyphAtHeight, glyphOf } from './glyphSpecs'
import { SCENE_W } from './sceneBox'
import { groundAt as lineAt } from './sceneLight'
import type { BeyondBlock } from './types'

/** The haze a row of the place takes: the near ridge's distance at the dot, plus its depth behind the near edge. */
export const rowKm = (frame: OutsideFrame, baseKm: number, dy: number) => baseKm + Math.max(0, frame.n - dy)

/** Beyond the place, use the depth and slant distance from the eye to set haze, as for the skyline towers. */
export const beyondKm = (frame: OutsideFrame, baseKm: number, dx: number, dy: number) =>
  Math.max(baseKm + Math.max(0, Math.hypot(dx, frame.eyeN - dy) - (frame.eyeN - frame.n)), rowKm(frame, baseKm, dy))

/** Minimum built fraction (0–1) of a city raster square to count as built fabric, matching `outsideView.ts` and `outside.ts`. */
const MIN_BUILT_SHARE = .2

/** Every built square (≥ 20 % built) of the raster within the reach: its spot in km. */
export function builtSquares(place: Coordinate, city: CityResult | null | undefined, reachKm: number) {
  const raster = city?.raster
  if (!raster) return []
  const cos = Math.cos(place.lat * Math.PI / 180)
  const south = place.lat - reachKm / 111.32, north = place.lat + reachKm / 111.32
  const west = place.lon - reachKm / (111.32 * cos), east = place.lon + reachKm / (111.32 * cos)
  const out: { lat: number; lon: number; dx: number; dy: number }[] = []
  for (let row = Math.floor(south / LAT_STEP); row <= Math.floor(north / LAT_STEP); row++) {
    for (let col = Math.floor(west / LON_STEP); col <= Math.floor(east / LON_STEP); col++) {
      const lat = (row + .5) * LAT_STEP, lon = (col + .5) * LON_STEP
      if (raster.at(lat, lon).built < MIN_BUILT_SHARE) continue
      out.push({ lat, lon, ...offsetKm(place, { lat, lon }) })
    }
  }
  return out
}

/** Pixels of a structure the panorama sees above intervening land. In front of the near ridge its full height shows. */
export function overTheCrest(terrain: SceneTerrain, dx: number, dy: number, heightM: number): number {
  const { seenAt } = terrain
  if (!seenAt) return 0
  const camera = terrain.camera ?? SCENE_CAMERA
  const x = xOf(Math.atan2(dx, dy) * 180 / Math.PI, camera) * SCENE_W / camera.width
  if (x < 0 || x > SCENE_W) return 0
  const km = Math.hypot(dx, dy)
  if (terrain.sightAt && km <= terrain.sightAt(x).nearKm) return Infinity
  const seen = seenAt(x, km, heightM)
  if (!seen) return 0
  return Math.max(0, Math.min(seen.groundY, lineAt(terrain.nearPoints, x)) - seen.y)
}

/** Minimum depth (km) in front of the outside camera eye (`frame.eyeN - dy`) so points at or behind the eye plane are excluded (from `beyondTowers` in `outside.ts`). */
const EYE_CLEARANCE_KM = .5
/** Horizontal screen-edge overscan (px) kept outside `[0, width]` so edge blocks are not clipped mid-body (from `outside.ts` and `outsideView.ts`). */
const EDGE_OVERSCAN_PX = 4
/** Raster coverage floor, not a height/legibility boost: .8 CSS px gives 1.6 physical px at DPR 2.
 * Retained from C9; Decision B still requires the enlarged glyph plus both side margins to fit this actual box. */
const MIN_BLOCK_W_PX = .8

interface BeyondContext {
  frame: OutsideFrame
  lie: PlaceLie
  terrain: SceneTerrain
  width: number
  ground: Ground
  floor: number
  baseKm: number
  /** Raster square width in km. */
  wKm: number
}

/** Slant distance from the outside view’s northward displaced eye, in km. */
export const outsideDistance = (eyeN: number, dx: number, dy: number) => Math.hypot(dx, eyeN - dy)

export function seatBeyond(ctx: BeyondContext, dx: number, dy: number, heightM: number) {
  const { frame, lie, terrain, width, ground, floor, baseKm, wKm } = ctx
  if (Math.hypot(dx, dy) > SKYLINE_TO_KM || frame.eyeN - dy <= EYE_CLEARANCE_KM) return null
  if (isOwnSpot(frame, lie, dx, dy)) return null
  const at = outsideProject(frame, dx, dy)
  if (at.x < -EDGE_OVERSCAN_PX || at.x > width + EDGE_OVERSCAN_PX) return null
  const over = overTheCrest(terrain, dx, dy, heightM)
  if (over < MARK_MIN_PX) return null
  const w = Math.max(MIN_BLOCK_W_PX, wKm * frame.f / at.depth)
  const baseY = Math.max(ground(at.x) + 1, lieBaseY(lie, ground, at.x, at.near, floor, w, dx, dy))
  // Clip only the part physically hidden by the intervening crest, never to an aesthetic height cap.
  const h = Math.min(apparentHeight(heightM, outsideDistance(frame.eyeN, dx, dy), baseAngle(baseY, terrain.horizonY)), over)
  if (h < MARK_MIN_PX) return null
  return { x: at.x, baseY, w, h, km: beyondKm(frame, baseKm, dx, dy) }
}

export type SeatMark = (mark: Landmark) => { x: number; base: number; hPx: number; km: number; blockId: string } | null

/** Whether a glyph centred at `x` with half-width `halfW` lies wholly inside a block's drawn horizontal span `[blockX − blockW/2, blockX + blockW/2]`. */
export const fitsBlockSpan = (x: number, halfW: number, blockX: number, blockW: number) =>
  x - halfW >= blockX - blockW / 2 && x + halfW <= blockX + blockW / 2

/** Draw the visible town blocks and look up a mark's seat in the same raster square; `seatMark` is null without a raster. */
export function beyondTowns(input: Pick<BeyondContext, 'width' | 'ground' | 'floor' | 'terrain'> &
  { place: Coordinate; city?: CityResult | null }, frame: OutsideFrame, lie: PlaceLie, baseKm: number):
  { beyondTowns: BeyondBlock[]; seatMark: SeatMark | null } {
  const { place, city } = input
  const raster = city?.raster
  if (!raster) return { beyondTowns: [], seatMark: null }
  const cos = Math.cos(place.lat * Math.PI / 180)
  const ctx = { ...input, frame, lie, baseKm, wKm: LON_STEP * 111.32 * cos }
  const blocks = new Map<string, BeyondBlock>()
  for (const sq of builtSquares(place, city, SKYLINE_TO_KM)) {
    const { dx, dy } = sq
    // Preserve the original roof sample and seed coordinates used by the town layout.
    const lat = place.lat + dy / 111.32, lon = place.lon + dx / (111.32 * cos)
    const cell = raster.at(lat, lon)
    const seed = hashId(`town:${lat.toFixed(4)}:${lon.toFixed(4)}`)
    const heightM = roofHeight(cell.levels, cell.p90, seeded(seed)())
    const seat = seatBeyond(ctx, dx, dy, heightM)
    const id = squareKey(squareOf(sq.lat, sq.lon))
    if (seat) blocks.set(id, { ...seat, id, heightM, seed })
  }
  const seatMark: SeatMark = (mark) => {
    const { dx, dy } = offsetKm(place, mark)
    if (Math.hypot(dx, dy) > SKYLINE_TO_KM || frame.eyeN - dy <= EYE_CLEARANCE_KM || isOwnSpot(frame, lie, dx, dy)) return null
    const blockId = squareKey(squareOf(mark.lat, mark.lon))
    const block = blocks.get(blockId)
    if (!block) return null
    const glyphKind = glyphOf(mark)
    if (!glyphKind) return null
    const over = overTheCrest(input.terrain, dx, dy, mark.heightM)
    if (over <= 0) return null
    const { x } = outsideProject(frame, dx, dy)
    const hPx = Math.min(over, apparentHeight(mark.heightM,
      outsideDistance(frame.eyeN, dx, dy), baseAngle(block.baseY, input.terrain.horizonY)))
    if (!viableNeighbour(glyphKind, isFamousLandmark(mark), hPx)) return null
    const halfW = glyphAtHeight(glyphKind, hPx).w / 2
    if (!fitsBlockSpan(x, halfW, block.x, block.w)) return null
    return { x, base: block.baseY, hPx, km: beyondKm(frame, baseKm, dx, dy), blockId }
  }
  return { beyondTowns: [...blocks.values()].sort((a, b) => b.km - a.km || a.x - b.x), seatMark }
}
