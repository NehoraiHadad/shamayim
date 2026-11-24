import { expect, it } from 'vitest'
import type { WaterSpan } from '../data/water/waterInView'
import type { CoastalSea, OutsideView, Pt } from './types'
import { SCENE_W } from './sceneBox'
import { watersShown } from './watersShown'

type View = Parameters<typeof watersShown>[1]
const LAND = 100
const ground = () => LAND
const span = (name: string | undefined, from: number, to: number, farY: number, nearY: number, distanceKm = 1) => ({ name, kind: 'lake', from, to,
  distanceKm, edges: [{ x: from, farY, nearY }, { x: to, farY, nearY }] }) as unknown as WaterSpan
const view = (over: { sea?: CoastalSea; land?: OutsideView['land']; boxes?: ReturnType<typeof block>[]; towns?: object[] } = {}) => ({ sea: over.sea ?? null, land: over.land ?? null,
  standing: { boxes: over.boxes ?? [], towers: [], beyond: [], towns: over.towns ?? [] } }) as unknown as View
const rise = (from: number, to: number, top: number) => ({ top: [[from, top], [to, top]] as Pt[], base: [[from, LAND + 2], [to, LAND + 2]] as Pt[], km: 1 })
const block = (from: number, to: number, top: number, foot: number) => ({ x: (from + to) / 2, w: to - from, box: { top, foot } })

it('names the named waters drawn, left to right, at any width', () => {
  const lakes = [span('ב', 200, 300, 80, 90), span('א', 20, 90, 80, 90), span(undefined, 100, 190, 80, 90)]
  expect(watersShown(lakes, view(), ground, SCENE_W)).toEqual(['א', 'ב'])
  expect(watersShown(lakes, view(), ground, 2 * SCENE_W)).toEqual(['א', 'ב'])
})

it('leaves out a glimpse, and water under the sheet', () => {
  expect(watersShown([span('א', 20, 40, 80, 90)], view(), ground, SCENE_W)).toEqual([])
  expect(watersShown([span('א', 20, 90, 116, 124)], view(), ground, SCENE_W)).toEqual([])
})

it('leaves out water behind the place\'s rise or its buildings, and far water behind the near land', () => {
  expect(watersShown([span('א', 20, 90, 80, 90)], view({ land: rise(0, 120, 78) }), ground, SCENE_W)).toEqual([])
  expect(watersShown([span('א', 20, 90, 80, 90)], view({ land: rise(0, 60, 78) }), ground, SCENE_W)).toEqual(['א'])
  expect(watersShown([span('א', 20, 90, 80, 90)], view({ boxes: [block(0, 75, 70, 95)] }), ground, SCENE_W)).toEqual([])
  expect(watersShown([span('א', 20, 90, 80, 90)], view({ towns: [{ x: 55, w: 70, h: 12, baseY: 91 }] }), ground, SCENE_W)).toEqual([])
  expect(watersShown([span('א', 20, 90, 101, 108, 40)], view(), ground, SCENE_W)).toEqual([])
  expect(watersShown([span('א', 20, 90, 101, 108, 1)], view(), ground, SCENE_W)).toEqual(['א'])
})

it('names the coastal sea by its own body, once with its stretch in view', () => {
  const sea: CoastalSea = { points: [], coast: [[300, 90], [300, 128]], side: 'right', top: 90, bottom: 128, horizon: 90, km: [], name: 'ים' }
  expect(watersShown([], view({ sea }), ground, SCENE_W)).toEqual(['ים'])
  expect(watersShown([span('ים', 20, 90, 80, 90)], view({ sea }), ground, SCENE_W)).toEqual(['ים'])
  expect(watersShown([], view({ sea: { ...sea, name: undefined } }), ground, SCENE_W)).toEqual([])
  expect(watersShown([], view({ sea: { ...sea, coast: [[360, 90], [360, 128]] } }), ground, SCENE_W)).toEqual([])
  // A body the sea is painted over is not in the picture.
  expect(watersShown([span('א', 305, 370, 92, 100)], view({ sea }), ground, SCENE_W)).toEqual(['ים'])
})
