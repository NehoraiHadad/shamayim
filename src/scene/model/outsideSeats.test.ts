import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { hashId } from '../../data/landmarks/hash'
import type { Landmark } from '../../data/landmarks/types'
import { HALL_M } from '../../data/landmarks/worship'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { beyondMarks } from '../../world/beyondMarks'
import * as beyondSeat from '../../world/beyondSeat'
import { roshPina } from '../../world/beyondSeatFixture'
import { glyphAtHeight } from '../../world/glyphSpecs'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideView, WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { outsideLayer } from './outside'
import type { Box, OutsideItem, SceneBox } from './types'

/** The reference scene viewport from outside.test.ts, in CSS px on a 2× display. */
const BOX: SceneBox = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
/** The narrow phone viewport (CSS px) whose town blocks shrink while glyph widths stay fixed. */
const NARROW = { ...BOX, width: 320 }
/** Between the two viewport widths (CSS px), where a marginal block's width equals its glyph's. */
const MARGINAL_WIDTH = (BOX.width + NARROW.width) / 2
/** The synthetic seats project one metre of height to half a CSS pixel at their shared depth. */
const PX_PER_M = .5
let baseInput: WorldInput
let base: WorldState

beforeAll(async () => {
  stubPublicFetch()
  const loaded = (await loadPlaces([roshPina])).get(roshPina.id)!
  baseInput = worldInput(loaded, '2026-11-17T12:00')
  base = buildWorld(baseInput)
})
afterAll(() => vi.unstubAllGlobals())
afterEach(() => vi.restoreAllMocks())

interface SeatFixture { kind: 'minaret' | 'synagogue' | 'church'; heightM: number; fitsAt?: number; x?: number }

function seatFixtures(fixtures: SeatFixture[], baseY = 100) {
  // The synthetic marks share the same northward offset for scoring, inside skyline reach.
  const landmarks: Landmark[] = fixtures.map(({ kind, heightM }, index) => ({ id: `seat-${index}`, kind, heightM,
    source: 'osm', lat: roshPina.lat + .02, lon: roshPina.lon }))
  const blocks = fixtures.map(({ kind, heightM, fitsAt = NARROW.width / 2, x }, index) => {
    const w = glyphAtHeight(kind, heightM * PX_PER_M).w * SCENE_W / fitsAt
    return { id: `block-${index}`, x: x ?? 30 * (index + 1), baseY, w, h: 8, km: 3, heightM: 16, seed: index }
  })
  const seats = new Map(landmarks.map((mark, index) => {
    const block = blocks[index]
    return [mark.id, { x: block.x, base: block.baseY, hPx: mark.heightM * PX_PER_M, km: block.km, blockId: block.id }]
  }))
  return { landmarks, beyondTowns: blocks, seatMark: (mark: Landmark) => seats.get(mark.id) ?? null }
}

function seatWorld(fixtures: SeatFixture[]) {
  const { landmarks, beyondTowns: blocks, seatMark } = seatFixtures(fixtures)
  const view: OutsideView = { ...base.place3 as OutsideView, beyond: [], beyondTowns: blocks }
  const { seated, seatPool } = beyondMarks(roshPina, landmarks, SCENE_W, seatMark, view.dot, [])
  const world = { ...base, place3: view, marks: seated, seatPool }
  const drawn = (box = BOX, clear: Box[] = []) => outsideLayer(world, box, clear)!.items
  const glyphs = (box = BOX, clear: Box[] = []) => drawn(box, clear).flatMap((item) => item.kind === 'mark' ? [item.glyph] : [])
  const drawnIds = (box = BOX, clear: Box[] = []) => {
    const seeds = new Set(glyphs(box, clear).map((glyph) => glyph.seed))
    return landmarks.filter(({ id }) => seeds.has(hashId(id))).map(({ id }) => id)
  }
  return { blocks, drawn, drawnIds, glyphs }
}

it('drops a seated glyph when the final block is too narrow', () => {
  const { drawnIds } = seatWorld([{ kind: 'minaret', heightM: 10, fitsAt: MARGINAL_WIDTH }])
  expect(drawnIds()).toEqual(['seat-0'])
  expect(drawnIds(NARROW)).toEqual([])
})

it('drops a seated glyph when text clearance removes its block', () => {
  const { blocks: [block], drawn, drawnIds } = seatWorld([{ kind: 'minaret', heightM: 10 }])
  // A 1 CSS px text sliver is outside the glyph box and inside the right half of its block.
  const sliver = { x: block.x + block.w * .35, y: block.baseY - block.h / 2, w: 1, h: 1 }
  expect(drawnIds()).toEqual(['seat-0'])
  expect(drawn(BOX, [sliver]).some((item) => item.kind === 'box' && item.beyond && item.seed === block.seed)).toBe(false)
  expect(drawnIds(BOX, [sliver])).toEqual([])
})

it('gives a 9 m hall a minaret slot freed by final block containment at 320 px', () => {
  const { drawnIds } = seatWorld([
    { kind: 'minaret', heightM: 22, fitsAt: MARGINAL_WIDTH },
    { kind: 'minaret', heightM: 20, fitsAt: MARGINAL_WIDTH },
    { kind: 'minaret', heightM: HALL_M },
  ])
  expect(drawnIds()).toEqual(['seat-0', 'seat-1'])
  expect(drawnIds(NARROW)).toEqual(['seat-2'])
})

it('gives a 9 m hall a slot when text covers two taller glyphs and their blocks survive', () => {
  const { blocks, drawn, drawnIds } = seatWorld([
    { kind: 'minaret', heightM: 22 }, { kind: 'minaret', heightM: 20 }, { kind: 'minaret', heightM: HALL_M },
  ])
  // Each clear zone covers the pixel immediately above a roof, which lies inside the taller glyph's silhouette box.
  const clear = blocks.slice(0, 2).map(({ x, baseY, h }) => ({ x: x - .5, y: baseY - h - 1, w: 1, h: 1 }))
  expect(drawnIds()).toEqual(['seat-0', 'seat-1'])
  expect(drawn(BOX, clear).filter((item) => item.kind === 'box' && item.beyond)).toHaveLength(3)
  expect(drawnIds(BOX, clear)).toEqual(['seat-2'])
})

it('keeps the town under the backed height label and gives the covered backfill seat to the next glyph', () => {
  const input = { ...baseInput, landmarks: [], seatCandidates: [] }
  const { height } = buildWorld(input).labels
  const hallSeed = 2
  const towns = vi.spyOn(beyondSeat, 'beyondTowns')
  const draw = (hallX: number) => {
    const { landmarks, ...seating } = seatFixtures([
      { kind: 'minaret', heightM: 24, fitsAt: MARGINAL_WIDTH }, { kind: 'minaret', heightM: 22 },
      { kind: 'minaret', heightM: HALL_M, x: hallX }, { kind: 'minaret', heightM: 8.5, x: 267 },
    ], height.y + 5)
    towns.mockReturnValue(seating)
    const world = buildWorld({ ...input, seatCandidates: landmarks })
    expect(world.labels.height).toEqual(height)
    expect(world.marks.map(({ id }) => id)).toEqual(['seat-0', 'seat-1'])
    return sceneModel(world, NARROW).layers.find((layer) => layer.kind === 'outside')!.items
  }
  const seeds = (items: OutsideItem[]) => items.flatMap((item) => item.kind === 'mark' ? [item.glyph.seed] : [])
  expect(height.backed).toBe(true)
  expect(seeds(draw(120))).toEqual(['seat-1', 'seat-2'].map(hashId))
  const covered = draw(height.x)
  expect(seeds(covered)).toEqual(['seat-1', 'seat-3'].map(hashId))
  expect(covered.some((item) => item.kind === 'box' && item.beyond && item.seed === hallSeed)).toBe(true)
})

it.each([SCENE_W, 1280])('caps visible seats at five in total and two per kind at %i px', (width) => {
  const { glyphs } = seatWorld([
    ...[18, 19, 20, 21].map((heightM) => ({ kind: 'minaret' as const, heightM })),
    ...[9, 10, 11].map((heightM) => ({ kind: 'synagogue' as const, heightM })),
    ...[12, 13, 14].map((heightM) => ({ kind: 'church' as const, heightM })),
  ])
  const drawn = glyphs({ ...BOX, width })
  expect(drawn).toHaveLength(5)
  expect(drawn.filter(({ kind }) => kind === 'minaret').length).toBeLessThanOrEqual(2)
  expect(drawn.filter(({ kind }) => kind === 'synagogue').length).toBeLessThanOrEqual(2)
  expect(drawn.filter(({ kind }) => kind === 'church').length).toBeLessThanOrEqual(2)
})
