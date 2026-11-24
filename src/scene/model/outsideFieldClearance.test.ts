import { expect, it } from 'vitest'
import type { WorldMark } from '../../world/markGeometry'
import { heightLabelBox } from '../../world/sceneClearance'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { outsideMarks } from './outsideMarks'

const orchard: WorldMark = {
  id: 'own-orchard', kind: 'orchard', glyph: 'orchard', glyphKind: 'orchard', depth: 2,
  x: 200, base: 90, w: 22, h: 6, scale: 1,
  xPct: 200 / SCENE_W * 100, baseY: 90, hPx: 6, km: 1, layer: 'near', plane: 'near',
  lights: 0, tall: false, dy: 0, named: false,
}
const height = { x: 200, y: 85, text: '500 מ׳', below: false, backed: true }
const markLeft = orchard.x - orchard.w / 2
const draw = (x: number, clear: Parameters<typeof outsideMarks>[3] = []) => {
  const crest = orchard.base - orchard.depth!
  const world = { marks: [orchard], seatPool: [], labels: { height: { ...height, x } },
    terrain: { near: { points: [[0, crest], [SCENE_W, crest]] } } } as unknown as WorldState
  return outsideMarks(world, SCENE_W, new Map(), clear, () => orchard.km, [], null)
}

it.each([
  ['clips the left edge by 0.1 CSS px', markLeft + .1 - heightLabelBox(height, SCENE_W).w / 2],
  ['covers the whole orchard', orchard.x],
] as const)('keeps an own orchard when the backing %s', (_, x) => {
  expect(draw(x).map(({ item }) => item.glyph.sourceId)).toEqual([orchard.id])
})

it('keeps the legacy dot and note clearance above the field rows', () => {
  // The clearance reaches six pixels above the base even though rows start just 1.6 px above it.
  expect(draw(-SCENE_W, [{ x: orchard.x, y: orchard.base - orchard.h, w: 1, h: 1 }])).toEqual([])
})
