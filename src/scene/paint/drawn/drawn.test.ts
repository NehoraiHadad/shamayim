import { describe, expect, it } from 'vitest'
import type { LayerOf, OutsideItem, Shine } from '../../model/types'
import type { Ctx2D, PaintEnv } from '../hand'
import { billows } from './billows'
import { paintDrawnSheet } from './cloudSheet'
import type { SkyForm } from './light/skyForm'
import { townBodies, type Box } from './townBlocks'
import { townLight } from './townLight'

const sheet = (alpha: number[]) => ({ kind: 'cloudSheet', id: 'cloudSheet.low', lattice: 'low', genus: 'cu', xs: [0, 100, 200],
  ys: [0, 100, 200, 300], alpha, tone: alpha.map(() => 0.5), body: [0.6, 0.6, 0.65], shade: [0.3, 0.3, 0.35],
  lit: [0.95, 0.95, 0.95] }) as unknown as LayerOf<'cloudSheet'>

function painted(alpha: number[], over: Partial<LayerOf<'cloudSheet'>> = {}) {
  let image = { data: new Uint8ClampedArray(), width: 0, height: 0 }
  const scratch = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: (next: typeof image) => { image = next } }
  const ctx = { save() {}, restore() {}, drawImage() {} } as unknown as Ctx2D
  paintDrawnSheet(ctx, { ...sheet(alpha), ...over }, { canvas: () => ({ canvas: {}, ctx: scratch }) } as unknown as PaintEnv)
  return image
}

const box = (over: Partial<Box>): Box => ({ kind: 'box', x: 10, w: 1, top: 94, foot: 100, tier: 0, seed: 1, storeys: 4,
  folded: false, roof: null, heater: false, receiver: 0, ...over })

describe('drawn clouds', () => {
  it('reads the same puffs for the same seed', () => {
    const a = billows(7), b = billows(7)
    for (const [x, y] of [[3, 5], [210.5, -40], [-900, 77]]) expect({ ...a(x, y) }).toEqual({ ...b(x, y) })
  })

  it('paints nothing where the model has no cloud, and a full mass where it is thick', () => {
    const { data, width, height } = painted([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1])
    const row = (k: number) => Array.from({ length: width }, (_, i) => data[(k * width + i) * 4 + 3])
    expect(Math.max(...row(0))).toBe(0)
    expect(Math.min(...row(height - 1))).toBeGreaterThan(215)
  })

  it('keeps an even closed deck at the model opacity', () => {
    const { data } = painted(Array(12).fill(0.5))
    for (let n = 3; n < data.length; n += 4) expect(Math.abs(data[n] - 127.5)).toBeLessThan(2)
  })

  it('takes the light of the towns by night, as much as the model gives each place', () => {
    const city = { rgb: [0.9, 0.6, 0.3] as [number, number, number], weight: Array.from({ length: 12 }, (_, n) => (n % 3 === 2 ? 0.2 : 0)) }
    const dark = painted(Array(12).fill(0.5)), lit = painted(Array(12).fill(0.5), { city })
    const last = (dark.width - 1) * 4
    expect(lit.data[0] - dark.data[0]).toBeLessThan(2)
    expect(lit.data[last] - dark.data[last]).toBeGreaterThan(8)
    expect(lit.data[last + 3]).toBe(dark.data[last + 3])
  })
})

describe('drawn town', () => {
  it('gathers the small squares of a spot into one block, and keeps the houses, the marks and their order', () => {
    const tree = { kind: 'tree', tier: 0, tree: { kind: 'tree', x: 1, base: 100, w: 2, h: 3, seed: 1 } } as OutsideItem
    const items: OutsideItem[] = [box({ x: 10 }), box({ x: 11, seed: 2 }), tree, box({ x: 40, w: 4, roof: 'tile', seed: 3 })]
    const bodies = townBodies(items)
    expect(bodies.map((b) => b.block?.roof ?? (b.block ? 'block' : b.item.kind))).toEqual(['block', 'tree', 'tile'])
    expect(bodies[0].block).toMatchObject({ foot: 100, top: 94 })
    expect(townBodies(items)).toBe(bodies)
  })

  it('keeps what rises over its neighbours at its own height', () => {
    const blocks = townBodies([box({ x: 10 }), box({ x: 10.8, seed: 2 }), box({ x: 11.5, top: 80, seed: 3 })])
    expect(Math.min(...blocks.map((b) => b.block!.top))).toBe(80)
    expect(blocks.every((b) => b.block!.foot === 100)).toBe(true)
  })

  it('gives its two sides different light whatever the sky, turning with it and never jumping', () => {
    const form = (side: number) => ({ strength: 1, side, tiers: [] }) as SkyForm
    const shine = (across: number, direct: number) => ({ night: 0, direct, glint: 0,
      faces: { front: 0, left: Math.max(0, -across), right: Math.max(0, across), top: 0.5, rim: 0, across } }) as unknown as Shine
    const even = townLight(shine(0, 0), form(-0.8))
    expect(even.right - even.left).toBeGreaterThan(0.25)
    const sides = Array.from({ length: 41 }, (_, n) => townLight(shine((n - 20) / 20, 1), form(0)).right)
    for (let n = 1; n < sides.length; n++) expect(Math.abs(sides[n] - sides[n - 1])).toBeLessThan(0.16)
  })
})
