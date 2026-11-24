import { expect, it } from 'vitest'
import { composeBodies, siteBody, type FabricSite } from '../../../data/city/fabricSlots'
import type { OutsideBox } from '../../../data/city/outsideView'
import { roofHeight } from '../../../data/city/skylineHeight'
import { visible } from '../../../data/city/skylineMass'
import { hashId, seeded } from '../../../data/landmarks/hash'
import { receiverMaterial, WALL_ALBEDOS } from '../../model/buildingMaterial'
import { bodyItem } from '../../model/outsideBody'
import type { Shine, Tones } from '../../model/types'
import type { Ctx2D } from '../shared/base/hand'
import type { SkyForm } from './outsideOwn'
import { paintBlock } from './townBlock'
import { townBodies, type Box } from './townBlocks'
import { townLight } from './townLight'

const body = (x: number, w: number, h: number, near: number, seed: number): OutsideBox =>
  ({ x, w, foot: 100 + 5 * near, top: 100 + 5 * near - h, near, kind: 'mass', heightM: 25, seed })
const site = (box: OutsideBox): FabricSite =>
  ({ ...box, heightM: 25, siteW: 1, siteTop: box.top, slotW: 0, cell: { dx: 0, dy: 0, wKm: .01, heightM: 25, seed: box.seed! } })
const item = (b: OutsideBox): Box => bodyItem(b, b.x, b.w, 0, 'mixed')
const drawn = (boxes: OutsideBox[]) =>
  townBodies(visible(composeBodies(boxes.map(site), 12.5), 375).map(s => siteBody(s, 'mass'))
    .sort((a, b) => a.foot - b.foot).map(item)).map(({ block }) => block)

it('stands the taller block up behind the lower one in the drawn town, whatever order they come in', () => {
  const front = body(100, 9.3, 10, .5, 1), rear = body(101.52, 9, 20, .4, 2), hidden = body(100.2, 8, 9, .3, 3)
  const blocks = drawn([rear, front, hidden])
  expect(blocks.map(b => b!.seed)).toEqual([2, 1])
  expect(blocks[0]!.top).toBeLessThan(blocks[1]!.top)
  expect(drawn([hidden, front, rear])).toEqual(blocks)
})

/** The seeds of the tallest roofs of a square: the roof is their first draw. */
const TALL = Array.from({ length: 400 }, (_, i) => hashId(`15000:${i}`)).filter(seed => roofHeight(5, 60, seeded(seed)()) > 50)

it('gives the tallest blocks every plaster as the scene assigns it: no draw of the roof\'s', () => {
  const walls = new Set(TALL.map(seed => receiverMaterial(item({ ...body(100, 12, 20, 0, seed), heightM: 55 }).receiver).stone))
  expect(walls.size).toBe(WALL_ALBEDOS.length)
})

it('gives the tallest drawn blocks every stone: its stone is no draw of the roof\'s', () => {
  const tones = Object.fromEntries(['wall', 'shade', 'stone', 'stoneLit', 'lit', 'deep', 'rim', 'win'].map((key, i) =>
    [key, key === 'stone' ? [1, 1, 1] : key === 'shade' || key === 'wall' ? [0, 0, 0] : [.1 * i, .1 * i, .1 * i]])) as unknown as Tones
  const shine = { night: 0, direct: 0, glint: 0, faces: { front: 0, left: 0, right: 0, top: .5, rim: 0, across: 0 } } as unknown as Shine
  const form = { strength: 0, side: 0, tiers: [{ top: [0, 0, 0], face: [0, 0, 0], foot: [0, 0, 0] }] } as unknown as SkyForm
  expect(TALL.length).toBeGreaterThan(20)
  const fronts = TALL.map(seed => {
    const fills: string[] = []
    const held = { fillStyle: '', fillRect(_: number, __: number, w: number, h: number) { if (w === 12 && h === 20) fills.push(this.fillStyle) } }
    const ctx = new Proxy(held, { get: (target, key) => key in target ? target[key as keyof typeof held] : () => undefined }) as unknown as Ctx2D
    paintBlock(ctx, item(body(100, 12, 20, 0, seed)) as never, tones, townLight(shine, form), form, [], 0)
    return fills[0]
  })
  expect(fronts.every(Boolean)).toBe(true)
  const stone = fronts.map(f => Number(/\d+/.exec(f)![0]))
  const span = [0, 1, 2, 3, 4].map(fifth => stone.filter(s => Math.min(4, Math.floor(s / 51.2)) === fifth).length)
  expect(span.filter(n => n > 0).length).toBeGreaterThanOrEqual(4)
})
