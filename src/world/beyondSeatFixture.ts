import type { Place } from '../config/place'
import { LAT_STEP, LON_STEP, squareOf } from '../data/city/grid'
import { isOwnSpot, outsideProject, SKYLINE_TO_KM } from '../data/city/outsideView'
import { portraitReach } from '../data/landmarks/portrait'
import { offsetKm } from '../data/landmarks/project'
import { groundFn } from '../data/landmarks/seat'
import type { Landmark } from '../data/landmarks/types'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces } from '../test/sceneWorld'
import { BEYOND_MIN_PX, builtSquares, fitsBlockSpan, overTheCrest } from './beyondSeat'
import { glyphAtHeight, type GlyphKind } from './glyphSpecs'
import { SHEET_CLEAR, VISIBLE_BOTTOM } from './layout'
import { lookOf, outsidePlace } from './outside'
import { SCENE_W } from './sceneBox'
import type { BeyondBlock } from './types'

export const roshPina = SCENE_PLACES.find((place) => place.id === 'rosh-pina')!

export function inSkyline(place: Place, mark: Landmark) {
  const { dx, dy } = offsetKm(place, mark)
  return Math.hypot(dx, dy) <= SKYLINE_TO_KM
}

export async function outsideFor(place: Place) {
  const loaded = (await loadPlaces([place])).get(place.id)!
  const input = { ...loaded, width: SCENE_W, elevation: loaded.terrain.heightNear?.(0, 0) ?? 0 }
  const reachKm = portraitReach(loaded.city?.clusters, place.nameHe)
  const centerX = Number.parseFloat(loaded.terrain.centerLeft) / 100 * SCENE_W
  const ground = groundFn(loaded.terrain.nearPoints, SCENE_W)
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  const view = outsidePlace({ place, terrain: loaded.terrain, landmarks: loaded.landmarks, city: loaded.city,
    width: SCENE_W, centerX, reachKm, ground, floor, bounds: loaded.bounds, mask: loaded.waterMask, cover: loaded.cover })
  const byX = new Map(view.beyondTowns.map((block) => [block.x, block]))
  const squares = builtSquares(place, loaded.city, SKYLINE_TO_KM)
  return { place, loaded, input, view, ground, floor, byX, squares }
}

export type OutsideFixture = Awaited<ReturnType<typeof outsideFor>>

export interface FittingBlock {
  square: OutsideFixture['squares'][number]
  block: BeyondBlock
  x: number
  hPx: number
  halfW: number
}

/** Find all drawn beyond-town squares where a glyph of `kind` and `heightM` clears `BEYOND_MIN_PX` and fits inside its block. */
export function fittingBlocks(ctx: OutsideFixture, heightM: number, kind: GlyphKind,
  extra?: (sq: OutsideFixture['squares'][number], block: BeyondBlock) => boolean): FittingBlock[] {
  const { view, loaded, byX, squares } = ctx
  const look = lookOf(view.frame)
  const nearK = outsideProject(view.frame, 0, view.frame.n).k
  const out: FittingBlock[] = []
  for (const square of squares) {
    const { x, k } = outsideProject(view.frame, square.dx, square.dy)
    const block = byX.get(x)
    const over = overTheCrest(loaded.terrain, square.dx, square.dy, heightM)
    if (!block || over < BEYOND_MIN_PX) continue
    const hPx = Math.min(look.px(heightM, Math.min(k, nearK)), over)
    const halfW = glyphAtHeight(kind, hPx).w / 2
    if (hPx < BEYOND_MIN_PX || !fitsBlockSpan(x, halfW, block.x, block.w)) continue
    if (x < halfW || x > SCENE_W - halfW) continue
    if (extra && !extra(square, block)) continue
    out.push({ square, block, x, hPx, halfW })
  }
  return out
}

/** Find one off-centre mark (x outside its block) and one edge-overhang mark (x inside, glyph overhanging) on drawn blocks. */
export function findSpanViolations(ctx: OutsideFixture, heightM = 22) {
  const { place, loaded, view, byX, squares } = ctx
  const look = lookOf(view.frame)
  const nearK = outsideProject(view.frame, 0, view.frame.n).k
  let outsideX: { mark: Landmark; blockX: number; blockW: number; projX: number } | null = null
  let overhang: { mark: Landmark; blockX: number; blockW: number; projX: number; halfW: number } | null = null
  for (const sq of squares) {
    const block = byX.get(outsideProject(view.frame, sq.dx, sq.dy).x)
    if (!block || Math.abs(sq.dx) < .5) continue
    const sameSq = (lat: number, lon: number) => JSON.stringify(squareOf(lat, lon)) === JSON.stringify(squareOf(sq.lat, sq.lon))
    if (!outsideX) {
      const lat = sq.lat + .49 * LAT_STEP, lon = sq.lon + Math.sign(sq.dx) * .49 * LON_STEP
      const { dx, dy } = offsetKm(place, { lat, lon })
      const projX = outsideProject(view.frame, dx, dy).x
      if (sameSq(lat, lon) && Math.hypot(dx, dy) <= SKYLINE_TO_KM && !isOwnSpot(view.frame, view.lie, dx, dy)
        && overTheCrest(loaded.terrain, dx, dy, heightM) >= BEYOND_MIN_PX && Math.abs(projX - block.x) > block.w / 2) {
        outsideX = { mark: { id: 'test-offcentre', kind: 'minaret', source: 'osm', heightM, lat, lon },
          blockX: block.x, blockW: block.w, projX }
      }
    }
    if (!overhang) {
      const lat = sq.lat, lon = sq.lon + .4 * LON_STEP
      const { dx, dy } = offsetKm(place, { lat, lon })
      const { x: projX, k } = outsideProject(view.frame, dx, dy)
      const over = overTheCrest(loaded.terrain, dx, dy, heightM)
      const hPx = Math.min(look.px(heightM, Math.min(k, nearK)), over)
      const halfW = glyphAtHeight('minaret', hPx).w / 2
      if (sameSq(lat, lon) && Math.hypot(dx, dy) <= SKYLINE_TO_KM && !isOwnSpot(view.frame, view.lie, dx, dy)
        && hPx >= BEYOND_MIN_PX && Math.abs(projX - block.x) < block.w / 2
        && Math.abs(projX - block.x) + halfW > block.w / 2) {
        overhang = { mark: { id: 'test-overhang', kind: 'minaret', source: 'osm', heightM, lat, lon },
          blockX: block.x, blockW: block.w, projX, halfW }
      }
    }
    if (outsideX && overhang) break
  }
  return { outsideX, overhang }
}

/** Find unbuilt squares outside the place where a structure of `heightM` clears the crest (no drawn town block). */
export function findUnbuiltVisibleSquares(ctx: OutsideFixture, heightM: number, count = 1): { lat: number; lon: number }[] {
  const { place, loaded, view } = ctx
  const raster = loaded.city!.raster!
  const cos = Math.cos(place.lat * Math.PI / 180)
  const drawnKeys = new Set(view.beyondTowns.map((b) => b.id))
  const found: { lat: number; lon: number }[] = []
  for (let row = Math.floor((place.lat - 4 / 111.32) / LAT_STEP); row <= Math.floor((place.lat + 4 / 111.32) / LAT_STEP) && found.length < count; row++) {
    for (let col = Math.floor((place.lon - 4 / (111.32 * cos)) / LON_STEP); col <= Math.floor((place.lon + 4 / (111.32 * cos)) / LON_STEP) && found.length < count; col++) {
      const lat = (row + .5) * LAT_STEP, lon = (col + .5) * LON_STEP
      if (raster.at(lat, lon).built >= .2) continue
      const sq = squareOf(lat, lon)
      if (drawnKeys.has(`${sq.cell}:${sq.col}:${sq.row}`)) continue
      const { dx, dy } = offsetKm(place, { lat, lon })
      if (Math.hypot(dx, dy) > SKYLINE_TO_KM || isOwnSpot(view.frame, view.lie, dx, dy)) continue
      if (overTheCrest(loaded.terrain, dx, dy, heightM) >= BEYOND_MIN_PX) found.push({ lat, lon })
    }
  }
  return found
}
