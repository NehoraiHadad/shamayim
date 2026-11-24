import { expect, it } from 'vitest'
import { heightText } from '../text/isolate'
import { besideDot } from './heightLabel'
import { heightLabelMarks } from './heightLabelMarks'
import { portraitLabelObstacles } from './heightLabelObstacles'
import type { WorldMark } from './markGeometry'
import type { OutsideView } from './types'
import { heightLabelBox, hits } from './sceneClearance'

const dot = { x: 180, y: 86 }
const text = heightText(812)
const mark: WorldMark = {
  id: 'test-spire', kind: 'highrise', glyph: 'test-spire', glyphKind: 'highrise',
  plane: 'far', layer: 'far', km: 7, sightKm: 7, named: false,
  x: 188, xPct: 188 / 375 * 100, base: 76, baseY: 76, w: 6, h: 8, hPx: 8,
  scale: 1, lights: 0, tall: false, dy: 0,
}
const terrain = { nearPoints: [], horizonY: 70 }
const view = { skyline: { boxes: [{ x: dot.x, w: 60, top: 94, foot: 110 }], towers: [] },
  beyondTowns: [], beyond: [], trees: [], land: null } as unknown as OutsideView

it('ignores a far mark that cannot clear the home roofline within its slide', () => {
  const fabric = portraitLabelObstacles(view)
  const baseline = besideDot(dot, text, fabric)!
  const badge = heightLabelBox({ ...baseline, text, below: false, backed: true }, 375)
  expect(hits([badge], 185, 68, 191, 76)).toBe(true)
  expect(besideDot(dot, text, [...fabric, ...heightLabelMarks([mark], view, terrain, [], 375)])).toEqual(baseline)
})

it('covers a legible four-pixel neighbour seated on the support foot', () => {
  const supported = { ...mark, plane: 'near', layer: 'near', x: 240, h: 3, hPx: 3, townFootprint: true,
    supportBlockId: 'block' } as const
  const obstacles = heightLabelMarks([supported], { ...view, beyondTowns: [
    { id: 'block', x: 240, w: 24, h: 10, baseY: 91, heightM: 10, km: 7, seed: 0 },
  ] }, terrain, [], 375)
  expect(obstacles).toContainEqual(expect.objectContaining({ top: 87, bottom: 91, viewport: 375 }))
})

it('prices a field as fabric over its shallow ground box', () => {
  const field = { ...mark, sightKm: undefined, glyphKind: 'solar', depth: 2, base: 81, h: 3, w: 18 } as const
  expect(heightLabelMarks([field], view, terrain, [], 375)).toEqual([
    { left: 179, right: 197, top: 79.4, bottom: 84, fixed: 'center', priority: undefined },
  ])
})

it('includes the tall mast and full tower podium in the painter envelope', () => {
  const shaft = { x: 220, w: 8, baseY: 100, h: 50, crown: 2, lod: 'glyph' } as const
  const towers = [shaft, { ...shaft, x: 250, lod: 'spire' }] as OutsideView['beyond']
  const boxes = portraitLabelObstacles({ skyline: { ...view.skyline, boxes: [] }, beyond: towers, trees: [] })
  expect(boxes[0]).toMatchObject({ top: 45, overhang: 1.2, priority: 'beyond' })
  expect(boxes[1]).toMatchObject({ top: 45, overhang: undefined })
})
