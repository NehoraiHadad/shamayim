import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Landmark } from '../data/landmarks/types'
import { HALL_M } from '../data/landmarks/worship'
import { SKYLINE_STUDY_PLACES } from '../test/scenePlaces'
import { stubPublicFetch } from '../test/sceneWorld'
import { beyondMarks } from './beyondMarks'
import { anglePx } from '../data/terrain/angleScale'
import { baseAngle } from '../data/terrain/apparentHeight'
import { beyondTowns, overTheCrest } from './beyondSeat'
import { findSpanViolations, findUnbuiltVisibleSquares, fittingBlocks, inSkyline, outsideFor,
  type OutsideFixture } from './beyondSeatFixture'
import { GLYPH_SPECS } from './glyphSpecs'
import { placeOf } from './place'
import { SCENE_W } from './sceneBox'

/** Ramat Gan's recorded panorama retains physical one-pixel roofs; Rosh Pina's roofs are all subpixel. */
const seatPlace = SKYLINE_STUDY_PLACES.find(place => place.id === 'ramat-gan')!
let ctx: OutsideFixture

beforeAll(async () => {
  stubPublicFetch()
  ctx = await outsideFor(seatPlace)
})
afterAll(() => vi.unstubAllGlobals())

it('seats a synthetic 60 m minaret on a drawn block at its true hPx and enforces beyondMarks guards', () => {
  const { loaded, input } = ctx
  const { place3, marks } = placeOf(input)
  const source = new Map([...loaded.landmarks, ...(loaded.seatCandidates ?? [])].map((mark) => [mark.id, mark]))
  const kinds = new Set(['minaret', 'church', 'synagogue', 'highrise', 'homes'])
  expect(place3.beyondTowns?.length).toBeGreaterThan(0)
  const nearby = marks.filter((mark) => !mark.portrait && mark.seatBlockId !== undefined && kinds.has(mark.kind) &&
    inSkyline(seatPlace, source.get(mark.id)!))
  for (const mark of nearby) {
    expect(place3.beyondTowns?.some((block) => block.id === mark.seatBlockId && mark.base === block.baseY
      && mark.x - mark.w / 2 >= block.x - block.w / 2 && mark.x + mark.w / 2 <= block.x + block.w / 2), mark.id).toBe(true)
  }

  const fit = fittingBlocks(ctx, 60, 'minaret')[0]
  expect(fit).toBeDefined()
  const minaret: Landmark = { id: 'test-minaret', kind: 'minaret', source: 'osm', heightM: 60,
    lat: fit.square.lat, lon: fit.square.lon }
  const seated = placeOf({ ...input, landmarks: [...input.landmarks, minaret] }).marks.find((mark) => mark.id === minaret.id)
  expect(seated).toMatchObject({ x: fit.x, base: fit.block.baseY, km: fit.block.km, plane: 'near', seatBlockId: fit.block.id })
  const { dx, dy } = fit.square
  const km = Math.hypot(dx, ctx.view.frame.eyeN - dy)
  const angle = Math.atan(60 / (km * 1000)) * 180 / Math.PI
  const a0 = baseAngle(seated!.base, ctx.loaded.terrain.horizonY)
  expect(seated!.hPx).toBeCloseTo(Math.min(anglePx(a0 + angle) - anglePx(a0),
    overTheCrest(ctx.loaded.terrain, dx, dy, 60)), 6)
  expect(seated!.h * seated!.scale).toBeCloseTo(seated!.hPx, 6)
  expect(seated!.w).toBeCloseTo(GLYPH_SPECS.minaret.w * seated!.scale, 6)

  // beyondMarks drops marks below the legibility floor or overlapping the dot or a note.
  const dot = { x: 100, y: 100 }
  const note = { left: 195, right: 205, top: 80, bottom: 105 }
  const seatAt = (x: number, hPx: number) => () => ({ x, base: 100, hPx, km: 3, blockId: 'b1' })
  expect(beyondMarks(seatPlace, [minaret], SCENE_W, seatAt(50, .9), dot, []).seated).toEqual([])
  expect(beyondMarks(seatPlace, [minaret], SCENE_W, seatAt(100, 6), dot, []).seated).toEqual([])
  expect(beyondMarks(seatPlace, [minaret], SCENE_W, seatAt(200, 6), dot, [note]).seated).toEqual([])
})

it(("rejects an off-centre synthetic mark whose projected x or glyph half-width falls " +
    "outside its drawn block span"), () => {
  const { outsideX, overhang } = findSpanViolations(ctx, 60)
  expect(outsideX).not.toBeNull()
  expect(Math.abs(outsideX!.projX - outsideX!.blockX)).toBeGreaterThan(outsideX!.blockW / 2)
  expect(ctx.view.seatMark!(outsideX!.mark)).toBeNull()
  expect(overhang).not.toBeNull()
  expect(Math.abs(overhang!.projX - overhang!.blockX)).toBeLessThan(overhang!.blockW / 2)
  expect(Math.abs(overhang!.projX - overhang!.blockX) + overhang!.halfW).toBeGreaterThan(overhang!.blockW / 2)
  expect(ctx.view.seatMark!(overhang!.mark)).toBeNull()
})

it('returns null from seatMark directly for a visible synthetic mark on a square with no drawn block', () => {
  const [spot] = findUnbuiltVisibleSquares(ctx, 30, 1)
  expect(spot).toBeDefined()
  const unseated: Landmark = { id: 'test-no-block', kind: 'minaret', source: 'osm', heightM: 30, ...spot }
  expect(ctx.view.seatMark!(unseated)).toBeNull()
})

it(("returns null from seatMark directly for a mark hidden by the land in front on a " +
    "visible drawn block"), () => {
  const { loaded, view, ground, floor } = ctx
  const fit = fittingBlocks(ctx, 60, 'minaret')[0]
  expect(fit).toBeDefined()
  // Ridge occludes heights up to block.heightM - 1 m while letting the block's own roof peek 4 px above the crest.
  const occludedTerrain = {
    ...loaded.terrain,
    sightAt: undefined,
    seenAt: (x: number, _km: number, heightM = 0) => {
      const ridgeY = ground(x)
      return { groundY: ridgeY + 2, y: heightM >= fit.block.heightM ? ridgeY - 4 : ridgeY + 1, angle: 0, groundAngle: 0 }
    },
  }
  const { beyondTowns: drawn, seatMark } = beyondTowns(
    { place: seatPlace, city: loaded.city, width: SCENE_W, ground, floor, terrain: occludedTerrain },
    view.frame, view.lie, view.baseKm,
  )
  expect(drawn.find((b) => b.id === fit.block.id)).toBeDefined()
  const hiddenMark: Landmark = { id: 'test-hidden-on-block', kind: 'synagogue', source: 'osm',
    heightM: Math.max(1, fit.block.heightM - 2), lat: fit.square.lat, lon: fit.square.lon }
  expect(overTheCrest(occludedTerrain, fit.square.dx, fit.square.dy, hiddenMark.heightM)).toBe(0)
  expect(seatMark!(hiddenMark)).toBeNull()
})

it('drops the recorded camera’s subpixel 9 m hall and rejects the same short non-settlement source', () => {
  const fit = fittingBlocks(ctx, 60, 'minaret')[0]
  expect(fit).toBeDefined()
  const hall: Landmark = { id: 'test-9m-hall', kind: 'minaret', source: 'osm', heightM: HALL_M,
    lat: fit.square.lat, lon: fit.square.lon }
  const shortTower: Landmark = { id: 'test-9m-water-tower', kind: 'waterTower', source: 'osm', heightM: HALL_M,
    lat: fit.square.lat, lon: fit.square.lon }
  const result = placeOf({ ...ctx.input, landmarks: [...ctx.input.landmarks, hall, shortTower] })
  expect(ctx.view.seatMark!(hall)).toBeNull()
  expect(result.marks.find((mark) => mark.id === hall.id)).toBeUndefined()
  expect(result.marks.find((mark) => mark.id === shortTower.id)).toBeUndefined()
})
