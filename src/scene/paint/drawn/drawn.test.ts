import { describe, expect, it } from 'vitest'
import type { LayerOf, OutsideItem, Shine } from '../../model/types'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { billows } from './billows'
import { paintDrawnSheet } from './cloudSheet'
import type { SkyForm } from './outsideOwn'
import { townBodies, type Box } from './townBlocks'
import { planesOf, townLight } from './townLight'
import { townEdges } from './townSilhouette'
import { lightness } from '../../model/tone'
import type { Tones } from '../../model/types'

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

  it('cuts a plank into a terrace of houses, stands a low one up and folds a sliver into a flat patch', () => {
    const planks = townBodies([box({ x: 20, w: 9, top: 99, foot: 100, roof: 'flat', seed: 5 }), box({ x: 21, w: 1, top: 99, foot: 100, seed: 6 })])
      .map((b) => b.block!)
    expect(planks.length).toBeGreaterThan(1)
    for (const b of planks) {
      expect(b.foot - b.top).toBeGreaterThanOrEqual(1.4)
      expect(b.w).toBeLessThanOrEqual(2.5 * (b.foot - b.top) + 1e-9)
    }
    const sliver = townBodies([box({ x: 60, w: 3, top: 99.5, foot: 100, seed: 7 })])[0].block!
    expect(sliver.low).toBe(true)
  })

  it('keys the outside of the massing only: a join over a body behind, nothing where a body in front carries it', () => {
    const bodies = townBodies([box({ x: 10, w: 6, top: 80, foot: 100, roof: 'flat', seed: 1 }),
      box({ x: 14, w: 6, top: 90, foot: 104, roof: 'flat', seed: 2 })])
    const [rear, near] = bodies.map((b) => b.block!)
    const edges = townEdges(bodies)
    // The near body's left side stands over the rear one: a joint where it does, the key below the rear's foot.
    expect(edges.get(near)!.left.map((r) => r.key)).toEqual([false, true])
    // The rear body's right side runs behind the near one: nothing there, the key above it.
    expect(edges.get(rear)!.right).toEqual([{ from: 80, to: 90, key: true }])
    expect(edges.get(rear)!.top.every((r) => r.key)).toBe(true)
  })

  it('lets a wall under a dull sky fall below its plaster, and lifts it only in the direct light', () => {
    const form = { strength: 1, side: -0.8, tiers: [] } as unknown as SkyForm
    const shine = (direct: number) => ({ night: 0, direct, glint: 0,
      faces: { front: 0.6, left: 0.2, right: 0, top: 0.5, rim: 0, across: -0.3 } }) as unknown as Shine
    const grey = (v: number): [number, number, number] => [v, v, v]
    const t = { lit: grey(0.9), stoneLit: grey(0.9), shade: grey(0.3), deep: grey(0.1), rim: grey(0.8) } as unknown as Tones
    const plaster = grey(0.5)
    const dull = planesOf(t, townLight(shine(0), form), plaster, 0.5), sun = planesOf(t, townLight(shine(0.9), form), plaster, 0.5)
    expect(Math.max(lightness(dull.front), lightness(dull.side))).toBeLessThan(lightness(plaster))
    expect(Math.max(lightness(sun.front), lightness(sun.side))).toBeGreaterThan(lightness(plaster))
  })
})
