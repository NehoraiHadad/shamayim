import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { TOWN_SIDE_PX } from './neighbourPlacement'
import { hashId } from '../../data/landmarks/hash'
import type { Landmark } from '../../data/landmarks/types'
import { HALL_M } from '../../data/landmarks/worship'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { beyondMarks } from '../../world/beyondMarks'
import { roshPina } from '../../world/beyondSeatFixture'
import { neighbourGeometry } from '../../world/neighbourSize'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideView, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { outsideLayer } from './outside'
import type { Box, SceneBox } from './types'

/** The reference scene viewport from outside.test.ts, in CSS px on a 2× display. */
const BOX: SceneBox = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
/** The narrow phone viewport (CSS px) whose town blocks shrink while glyph widths stay fixed. */
const NARROW = { ...BOX, width: 320 }
/** Between the two viewport widths (CSS px), where a marginal block's width equals its glyph's. */
const MARGINAL_WIDTH = (BOX.width + NARROW.width) / 2
const SEAT_PX_PER_METRE = .5
let base: WorldState

beforeAll(async () => {
  stubPublicFetch()
  const loaded = (await loadPlaces([roshPina])).get(roshPina.id)!
  base = buildWorld(worldInput(loaded, '2026-11-17T12:00'))
})
afterAll(() => vi.unstubAllGlobals())
afterEach(() => vi.restoreAllMocks())

interface SeatFixture { kind: 'highrise' | 'synagogue' | 'church'; heightM: number; fitsAt?: number }

function seatFixtures(fixtures: SeatFixture[]) {
  const baseY = 100
  // The synthetic marks share the same northward offset for scoring, inside skyline reach.
  const landmarks: Landmark[] = fixtures.map(({ kind, heightM }, index) => ({ id: `seat-${index}`, kind, heightM,
    source: 'osm', ...(kind === 'highrise' ? {} : { fame: 2 as const, nameHe: 'Synthetic named landmark' }),
    lat: roshPina.lat + .02, lon: roshPina.lon }))
  const blocks = fixtures.map(({ kind, heightM, fitsAt = NARROW.width / 2 }, index) => {
    const w = (neighbourGeometry(kind, heightM * SEAT_PX_PER_METRE, kind !== 'highrise').w + 2 * TOWN_SIDE_PX)
      * SCENE_W / fitsAt
    return { id: `block-${index}`, x: 30 * (index + 1), baseY, w, h: 8, km: 3, heightM: 16, seed: index }
  })
  const seats = new Map(landmarks.map((mark, index) => {
    const block = blocks[index]
    return [mark.id, { x: block.x, base: block.baseY, hPx: mark.heightM * SEAT_PX_PER_METRE, km: block.km, blockId: block.id }]
  }))
  return { landmarks, beyondTowns: blocks, seatMark: (mark: Landmark) => seats.get(mark.id) ?? null }
}

function clearBackdrop(world: WorldState): WorldState {
  const view = world.place3 as OutsideView
  // A flat ridge below the fixture feet isolates the clearance and budget rules.
  const near = { points: [[0, 112], [SCENE_W, 112]] as [number, number][], distanceKm: [1, 1] }
  return { ...world, terrain: { ...world.terrain, near, far: near, back: undefined },
    place3: { ...view, skyline: { ...view.skyline, boxes: [], towers: [] }, beyond: [], land: null } }
}

function seatWorld(fixtures: SeatFixture[]) {
  const { landmarks, beyondTowns: blocks, seatMark } = seatFixtures(fixtures)
  const view: OutsideView = { ...base.place3 as OutsideView, beyond: [], beyondTowns: blocks }
  const { seated, seatPool } = beyondMarks(roshPina, landmarks, SCENE_W, seatMark, view.dot, [])
  const world = clearBackdrop({ ...base, place3: view, marks: seated, seatPool })
  const drawn = (box = BOX, clear: Box[] = []) => outsideLayer(world, box, clear)!.items
  const glyphs = (box = BOX, clear: Box[] = []) => drawn(box, clear).flatMap((item) => item.kind === 'mark' ? [item.glyph] : [])
  const drawnIds = (box = BOX, clear: Box[] = []) => {
    const seeds = new Set(glyphs(box, clear).map((glyph) => glyph.seed))
    return landmarks.filter(({ id }) => seeds.has(hashId(id))).map(({ id }) => id)
  }
  return { blocks, drawn, drawnIds, glyphs }
}

it('drops a seated glyph when the final block is too narrow', () => {
  const { drawnIds } = seatWorld([{ kind: 'highrise', heightM: 10, fitsAt: MARGINAL_WIDTH }])
  expect(drawnIds()).toEqual(['seat-0'])
  expect(drawnIds(NARROW)).toEqual([])
})

it('drops a seated glyph when text clearance removes its block', () => {
  const { blocks: [block], drawn, drawnIds } = seatWorld([{ kind: 'highrise', heightM: 10 }])
  // A 1 CSS px text sliver is outside the glyph box and inside the right half of its block.
  const sliver = { x: block.x + block.w * .35, y: block.baseY - block.h / 2, w: 1, h: 1 }
  expect(drawnIds()).toEqual(['seat-0'])
  expect(drawn(BOX, [sliver]).some((item) => item.kind === 'box' && item.beyond && item.seed === block.seed)).toBe(false)
  expect(drawnIds(BOX, [sliver])).toEqual([])
})

it('gives a 9 m hall a tower slot freed by final block containment at 320 px', () => {
  const { drawnIds } = seatWorld([
    { kind: 'highrise', heightM: 22, fitsAt: MARGINAL_WIDTH },
    { kind: 'highrise', heightM: 20, fitsAt: MARGINAL_WIDTH },
    { kind: 'highrise', heightM: HALL_M },
  ])
  expect(drawnIds()).toEqual(['seat-0', 'seat-1'])
  expect(drawnIds(NARROW)).toEqual(['seat-2'])
})

it('gives a 9 m hall a slot when text covers two taller glyphs and their blocks survive', () => {
  const { blocks, drawn, drawnIds } = seatWorld([
    { kind: 'highrise', heightM: 22 }, { kind: 'highrise', heightM: 20 }, { kind: 'highrise', heightM: HALL_M },
  ])
  // The text strip covers every viable position above the support, while leaving the painted roof intact.
  const clear = blocks.slice(0, 2).map(({ x, baseY, h }) => ({ x: x - 20, y: baseY - h - 1, w: 40, h: 1 }))
  expect(drawnIds()).toEqual(['seat-0', 'seat-1'])
  expect(drawn(BOX, clear).filter((item) => item.kind === 'box' && item.beyond)).toHaveLength(3)
  expect(drawnIds(BOX, clear)).toEqual(['seat-2'])
})

it.each([SCENE_W, 1280])('caps visible seats at five in total and two per kind at %i px', (width) => {
  const { glyphs } = seatWorld([
    ...[18, 19, 20, 21].map((heightM) => ({ kind: 'highrise' as const, heightM })),
    ...[9, 10, 11].map((heightM) => ({ kind: 'synagogue' as const, heightM })),
    ...[12, 13, 14].map((heightM) => ({ kind: 'church' as const, heightM })),
  ])
  const drawn = glyphs({ ...BOX, width })
  expect(drawn).toHaveLength(5)
  expect(drawn.filter(({ kind }) => kind === 'highrise').length).toBeLessThanOrEqual(2)
  expect(drawn.filter(({ kind }) => kind === 'synagogue').length).toBeLessThanOrEqual(2)
  expect(drawn.filter(({ kind }) => kind === 'church').length).toBeLessThanOrEqual(2)
})
