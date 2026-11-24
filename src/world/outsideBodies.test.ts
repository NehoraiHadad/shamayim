import { expect, it } from 'vitest'
import { outsideFrame, type OutsideBox, type OutsideTower } from '../data/city/outsideView'
import { drawnSkyline } from './drawnSkyline'
import { outsideBodies } from './outsideBodies'
import { SCENE_W } from './sceneBox'
import { sceneClearance } from './sceneClearance'
import type { OutsideView, WorldLabels } from './types'

const LAND = 100, TOP = 60
const frame = outsideFrame(undefined, 3, SCENE_W / 2, SCENE_W, true)
const block = (over: Partial<OutsideBox> = {}): OutsideBox =>
  ({ x: 100, w: 20, top: TOP, foot: LAND, near: .8, kind: 'mass', heightM: 40, seed: 1, dx: 0, dy: 1, ...over })
const tower = (over: Partial<OutsideTower> = {}): OutsideTower => ({ x: 100, baseY: LAND, w: 20, h: LAND - TOP, near: .8, heightM: 90, seed: 2,
  famous: false, lod: 'silhouette', crown: 0, dx: 0, dy: 1, ...over })
const view = (boxes: OutsideBox[], towers: OutsideTower[]) => ({ kind: 'outside', dot: { x: 300, y: LAND }, frame, baseKm: 0,
  skyline: { boxes, towers }, beyond: [], beyondTowns: [], trees: [], land: null }) as unknown as OutsideView
const note = (left: number, width: number): WorldLabels => ({ height: { text: '1', below: false, x: 350, y: 10 },
  notes: [{ kind: 'note', text: 'a', left, top: TOP - 20, width, height: 80 }] }) as unknown as WorldLabels
const drawn = { nearPoints: [[0, LAND], [SCENE_W, LAND]], farPoints: [] } as unknown as Parameters<typeof drawnSkyline>[0]

/** The model's own top at x: the bodies it draws, over the land. */
function modelTop(place: OutsideView, labels: WorldLabels, x: number, width = SCENE_W) {
  const sx = width / SCENE_W
  const { boxes, towers } = outsideBodies(place, sceneClearance(labels, place.dot, width), sx)
  const tops = [...boxes.map(b => ({ ...b, top: b.box.top })), ...towers.map(t => ({ ...t, top: t.tower.baseY - t.tower.h }))]
    .filter(b => Math.abs(b.x - x * sx) <= b.w / 2).map(b => b.top)
  return Math.min(LAND, ...tops)
}
const skylineTop = (place: OutsideView, labels: WorldLabels, x: number, width = SCENE_W) =>
  drawnSkyline(drawn, place, [], null, Object.assign(() => LAND, { peak: LAND }), labels, width)(x / SCENE_W)
const agree = (place: OutsideView, labels: WorldLabels, spans: [number, number][], width = SCENE_W) => {
  for (let x = 80; x <= 120; x++) {
    expect(skylineTop(place, labels, x, width)).toBe(modelTop(place, labels, x, width))
    expect(skylineTop(place, labels, x, width)).toBe(spans.some(([from, to]) => x >= from && x <= to) ? TOP : LAND)
  }
}

it('lets the sun past the side of a block the text takes', () => {
  agree(view([block()], []), note(107, 40), [[90, 106]])
  expect(skylineTop(view([block()], []), note(107, 40), 109)).toBe(LAND)
})

it('lets the sun past the side of a tower the text takes', () => {
  agree(view([], [tower()]), note(107, 40), [[90, 106]])
})

it('lets the sun past a block cut back for a mapped stack, which hides it itself', () => {
  const stack = tower({ x: 109, w: 2, near: .2, dy: -1, baseY: LAND - 10, h: LAND - 10 - TOP, industrial: true })
  const place = view([block()], [stack])
  agree(place, note(300, 10), [[90, 106], [108, 110]])
  expect(skylineTop(place, note(300, 10), 107)).toBe(LAND)
})

it('drops from the line what the text leaves no room for, and keeps the rest whole', () => {
  agree(view([block({ heightM: 7 })], []), note(107, 40), [])
  agree(view([block()], []), note(60, 100), [])
  agree(view([block()], []), note(300, 10), [[90, 110]])
})

it('lets the sun past only what the text takes at the width of the screen, where it keeps its own size', () => {
  const place = view([block()], []), text = note(80, 14)
  agree(place, text, [[94, 110]])
  // Twice as wide, the same text ends short of the block.
  agree(place, text, [[90, 110]], 2 * SCENE_W)
  // Half as wide, it covers more of it: only the narrower cut stands clear.
  agree(place, note(78, 10), [[98, 110]], SCENE_W / 2)
})
