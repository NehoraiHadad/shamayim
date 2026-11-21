import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import type { Landmark } from '../data/landmarks/types'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { HALL_M } from '../data/landmarks/worship'
import { stubPublicFetch } from '../test/sceneWorld'
import { beyondMarks } from './beyondMarks'
import { BEYOND_MIN_PX, beyondTowns, overTheCrest } from './beyondSeat'
import { findSpanViolations, findUnbuiltVisibleSquares, fittingBlocks, inSkyline, outsideFor,
  roshPina, type OutsideFixture } from './beyondSeatFixture'
import { GLYPH_SPECS } from './glyphSpecs'
import { lookOf } from './outside'
import { placeOf } from './place'
import { SCENE_W } from './sceneBox'

let ctx: OutsideFixture

beforeAll(async () => {
  stubPublicFetch()
  ctx = await outsideFor(roshPina)
})
afterAll(() => vi.unstubAllGlobals())

it('seats a synthetic 22 m minaret on a drawn block at its true hPx and enforces beyondMarks guards', () => {
  const { loaded, input } = ctx
  const { place3, marks } = placeOf(input)
  const source = new Map([...loaded.landmarks, ...(loaded.seatCandidates ?? [])].map((mark) => [mark.id, mark]))
  const kinds = new Set(['minaret', 'church', 'synagogue', 'highrise', 'homes'])
  expect(place3.beyondTowns?.length).toBeGreaterThan(0)
  const nearby = marks.filter((mark) => !mark.portrait && kinds.has(mark.kind) && inSkyline(roshPina, source.get(mark.id)!))
  for (const mark of nearby) {
    expect(place3.beyondTowns?.some((block) => block.id === mark.seatBlockId && mark.base === block.baseY
      && mark.x - mark.w / 2 >= block.x - block.w / 2 && mark.x + mark.w / 2 <= block.x + block.w / 2), mark.id).toBe(true)
  }

  const fit = fittingBlocks(ctx, 22, 'minaret')[0]
  expect(fit).toBeDefined()
  const minaret: Landmark = { id: 'test-minaret', kind: 'minaret', source: 'osm', heightM: 22,
    lat: fit.square.lat, lon: fit.square.lon }
  const seated = placeOf({ ...input, landmarks: [...input.landmarks, minaret] }).marks.find((mark) => mark.id === minaret.id)
  expect(seated).toMatchObject({ x: fit.x, base: fit.block.baseY, km: fit.block.km, plane: 'near', seatBlockId: fit.block.id })
  expect(seated!.hPx).toBeGreaterThanOrEqual(BEYOND_MIN_PX)
  expect(seated!.h * seated!.scale).toBeCloseTo(seated!.hPx, 6)
  expect(seated!.w).toBeCloseTo(GLYPH_SPECS.minaret.w * seated!.scale, 6)

  // beyondMarks drops marks below BEYOND_MIN_PX or overlapping the dot or a note.
  const dot = { x: 100, y: 100 }
  const note = { left: 195, right: 205, top: 80, bottom: 105 }
  const seatAt = (x: number, hPx: number) => () => ({ x, base: 100, hPx, km: 3, blockId: 'b1' })
  expect(beyondMarks(roshPina, [minaret], SCENE_W, seatAt(50, BEYOND_MIN_PX - .1), dot, []).seated).toEqual([])
  expect(beyondMarks(roshPina, [minaret], SCENE_W, seatAt(100, 6), dot, []).seated).toEqual([])
  expect(beyondMarks(roshPina, [minaret], SCENE_W, seatAt(200, 6), dot, [note]).seated).toEqual([])
})

it('rejects an off-centre synthetic mark whose projected x or glyph half-width falls outside its drawn block span', () => {
  const { outsideX, overhang } = findSpanViolations(ctx, 22)
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

it('returns null from seatMark directly for a mark hidden by the land in front on a visible drawn block', () => {
  const { loaded, view, ground, floor } = ctx
  const fit = fittingBlocks(ctx, 22, 'minaret')[0]
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
    { place: roshPina, city: loaded.city, width: SCENE_W, ground, floor, terrain: occludedTerrain },
    view.frame, view.lie, lookOf(view.frame), view.baseKm,
  )
  expect(drawn.find((b) => b.id === fit.block.id)).toBeDefined()
  const hiddenMark: Landmark = { id: 'test-hidden-on-block', kind: 'synagogue', source: 'osm',
    heightM: Math.max(1, fit.block.heightM - 2), lat: fit.square.lat, lon: fit.square.lon }
  expect(overTheCrest(occludedTerrain, fit.square.dx, fit.square.dy, hiddenMark.heightM)).toBe(0)
  expect(seatMark!(hiddenMark)).toBeNull()
})

it('draws a synthetic 9 m hall on a drawn beyond block while keeping the 20 m gate for non-settlement kinds', () => {
  const fit = fittingBlocks(ctx, HALL_M, 'minaret')[0]
  expect(fit).toBeDefined()
  const hall: Landmark = { id: 'test-9m-hall', kind: 'minaret', source: 'osm', heightM: HALL_M,
    lat: fit.square.lat, lon: fit.square.lon }
  const shortTower: Landmark = { id: 'test-9m-water-tower', kind: 'waterTower', source: 'osm', heightM: HALL_M,
    lat: fit.square.lat, lon: fit.square.lon }
  const result = placeOf({ ...ctx.input, landmarks: [...ctx.input.landmarks, hall, shortTower] })
  const drawnHall = result.marks.find((mark) => mark.id === hall.id)
  expect(drawnHall).toMatchObject({ x: fit.x, base: fit.block.baseY, km: fit.block.km, plane: 'near', seatBlockId: fit.block.id })
  expect(drawnHall!.hPx).toBeGreaterThanOrEqual(BEYOND_MIN_PX)
  expect(drawnHall!.h * drawnHall!.scale).toBeCloseTo(drawnHall!.hPx, 6)
  expect(result.marks.find((mark) => mark.id === shortTower.id)).toBeUndefined()
})

it('carries a 9 m hall through loadLandmarkSource past unseatable tall minarets and budgets viable seats only', async () => {
  const fit = fittingBlocks(ctx, HALL_M, 'minaret')[0]
  expect(fit).toBeDefined()
  const unbuilt = findUnbuiltVisibleSquares(ctx, 30, 12)
  expect(unbuilt.length).toBeGreaterThanOrEqual(10)
  // Twelve tall 30 m minarets on undrawn squares outrank the 9 m hall and fill all 8 shortlist slots + the minaret reserve.
  const decoys: Landmark[] = unbuilt.map((spot, i) => ({
    id: `decoy-tall-${i}`, kind: 'minaret', source: 'osm', heightM: 30, nameHe: `מסגד ${i}`, ...spot,
  }))
  const hall: Landmark = { id: 'seated-9m-hall', kind: 'minaret', source: 'osm', heightM: HALL_M,
    lat: fit.square.lat, lon: fit.square.lon }
  const source = await loadLandmarkSource(roshPina, new AbortController().signal, {
    israel: async () => [...decoys, hall],
  })
  // Proves the shortlist (top 8 + 1 minaret reserve) stays unchanged and excludes the 9 m hall.
  expect(source.panoramaMarks.some((mark) => mark.id === hall.id)).toBe(false)
  expect(source.sceneMarks.some((mark) => mark.id === hall.id)).toBe(false)
  // Extra skyline settlement marks travel separately in seatCandidates: decoys fail seatMark, so the 9 m hall seats and is drawn.
  expect(source.seatCandidates.some((mark) => mark.id === hall.id)).toBe(true)
  const placed = placeOf({ ...ctx.input, landmarks: withPlaceHomes(roshPina, source.sceneMarks),
    seatCandidates: source.seatCandidates })
  expect(placed.marks.find((mark) => mark.id === hall.id)).toMatchObject({ x: fit.x, seatBlockId: fit.block.id })

  // Display budget caps viable seats (at most 2 per kind and 5 total at 375 px) once seating succeeds.
  const viableCrowd: Landmark[] = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `m-${i}`, kind: 'minaret' as const, source: 'osm' as const, heightM: 18 + i, lat: fit.square.lat, lon: fit.square.lon })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `s-${i}`, kind: 'synagogue' as const, source: 'osm' as const, heightM: 9 + i, lat: fit.square.lat, lon: fit.square.lon })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `c-${i}`, kind: 'church' as const, source: 'osm' as const, heightM: 12 + i, lat: fit.square.lat, lon: fit.square.lon })),
  ]
  const seatByIndex = (mark: Landmark) => {
    const idx = viableCrowd.findIndex((item) => item.id === mark.id)
    return { x: 30 + idx * 30, base: 100, hPx: 5, km: 3, blockId: `b-${idx}` }
  }
  const budgeted = beyondMarks(roshPina, viableCrowd, SCENE_W, seatByIndex, { x: -100, y: -100 }, []).seated
  expect(budgeted.length).toBe(5)
  expect(budgeted.filter((m) => m.kind === 'minaret').length).toBeLessThanOrEqual(2)
  expect(budgeted.filter((m) => m.kind === 'synagogue').length).toBeLessThanOrEqual(2)
  expect(budgeted.filter((m) => m.kind === 'church').length).toBeLessThanOrEqual(2)
})
