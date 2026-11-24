import { expect, it } from 'vitest'
import { outsideFrame, type OutsideBox, type OutsideTower } from '../data/city/outsideView'
import { drawnSkyline } from './drawnSkyline'
import { outsideBodies } from './outsideBodies'
import { SCENE_W } from './sceneBox'
import { sceneClearance } from './sceneClearance'
import type { OutsideView } from './types'

const LAND = 100, TOP = 60
const frame = outsideFrame(undefined, 3, SCENE_W / 2, SCENE_W, true)
const block = (over: Partial<OutsideBox> = {}): OutsideBox =>
  ({ x: 100, w: 20, top: TOP, foot: LAND, near: .8, kind: 'mass', heightM: 40, seed: 1, dx: 0, dy: 1, ...over })
const tower = (over: Partial<OutsideTower> = {}): OutsideTower => ({ x: 100, baseY: LAND, w: 20, h: LAND - TOP, near: .8, heightM: 90, seed: 2,
  famous: false, lod: 'silhouette', crown: 0, dx: 0, dy: 1, ...over })
/** The view whose spot lies at `spot` (reference px), in front of the bodies or far from them. */
const view = (boxes: OutsideBox[], towers: OutsideTower[], spot = 300) => ({ kind: 'outside', dot: { x: spot, y: LAND - 10 }, frame, baseKm: 0,
  skyline: { boxes, towers }, beyond: [], beyondTowns: [], trees: [], land: null }) as unknown as OutsideView
const drawn = { nearPoints: [[0, LAND], [SCENE_W, LAND]], farPoints: [] } as unknown as Parameters<typeof drawnSkyline>[0]

/** The model's own top at x: the bodies it draws, over the land. */
function modelTop(place: OutsideView, x: number, width = SCENE_W) {
  const sx = width / SCENE_W
  const { boxes, towers } = outsideBodies(place, sceneClearance(place.dot, width), sx)
  const tops = [...boxes.map(b => ({ ...b, top: b.box.top })), ...towers.map(t => ({ ...t, top: t.tower.baseY - t.tower.h }))]
    .filter(b => Math.abs(b.x - x * sx) <= b.w / 2).map(b => b.top)
  return Math.min(LAND, ...tops)
}
const skylineTop = (place: OutsideView, x: number, width = SCENE_W) =>
  drawnSkyline(drawn, place, [], null, Object.assign(() => LAND, { peak: LAND }), width)(x / SCENE_W)
const agree = (place: OutsideView, spans: [number, number][], width = SCENE_W) => {
  for (let x = 80; x <= 120; x++) {
    expect(skylineTop(place, x, width)).toBe(modelTop(place, x, width))
    expect(skylineTop(place, x, width)).toBe(spans.some(([from, to]) => x >= from && x <= to) ? TOP : LAND)
  }
}

it('lets the sun past the side of a block the spot\'s clearing takes', () => {
  agree(view([block()], [], 111), [[90, 106]])
})

it('lets the sun past the side of a tower the spot\'s clearing takes', () => {
  agree(view([], [tower()], 111), [[90, 106]])
})

it('lets the sun past a block cut back for a mapped stack, which hides it itself', () => {
  const stack = tower({ x: 109, w: 2, near: .2, dy: -1, baseY: LAND - 10, h: LAND - 10 - TOP, industrial: true })
  const place = view([block()], [stack])
  agree(place, [[90, 106], [108, 110]])
  expect(skylineTop(place, 107)).toBe(LAND)
})

it('drops from the line what the clearing leaves no room for, and keeps the rest whole', () => {
  agree(view([block({ heightM: 7 })], [], 111), [])
  agree(view([block()], [], 100), [])
  agree(view([block()], []), [[90, 110]])
})

it('lets the sun past only what the clearing takes at the width of the screen, where it keeps its own size', () => {
  const place = view([block()], [], 113.5)
  agree(place, [[90, 106]])
  // Twice as wide, the same clearing ends short of the block.
  agree(place, [[90, 110]], 2 * SCENE_W)
})
