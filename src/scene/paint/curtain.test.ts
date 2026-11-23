import { expect, it } from 'vitest'
import { curtain, FIBRES } from './curtain'
import { PLANES } from './drawn'
import type { Ctx2D, PaintEnv } from './hand'

const ALPHA = 0.58, LEAN = 50
const SEEDS = [1, 77, 4021, 245934642, 98765]

/** A curtain read off a recording scratch surface: its alpha along x at a height (0 base … 1 ground). */
function curtainOf(seed: number, fibres = FIBRES) {
  let w = 0, h = 0, data = new Uint8ClampedArray(), drawn = { x: 0, w: 1 }
  const env = { canvas: (cw: number, ch: number) => ({ canvas: {}, ctx: {
    createImageData: () => ({ data: (data = new Uint8ClampedArray(cw * ch * 4)) }),
    putImageData() { w = cw; h = ch },
  } }) } as unknown as PaintEnv
  const ctx = { save() {}, restore() {}, drawImage: (_c: unknown, x: number, _y: number, dw: number) => { drawn = { x, w: dw } } }
  const shaft = { x: 0, top: 10, bottom: 100, w: 110, lean: LEAN, rgb: [0.4, 0.45, 0.5] as const, alpha: ALPHA, seed }
  curtain(ctx as unknown as Ctx2D, shaft as never, false, env, fibres)
  return (t: number) => {
    const j = Math.min(h - 1, Math.floor(t * h))
    return Array.from({ length: w }, (_, i) => ({ x: drawn.x + ((i + 0.5) / w) * drawn.w, a: data[(j * w + i) * 4 + 3] / 255 }))
  }
}
const total = (row: { a: number }[]) => row.reduce((s, p) => s + p.a, 0)
const centre = (row: { x: number; a: number }[]) => row.reduce((s, p) => s + p.x * p.a, 0) / total(row)
const peak = (row: { a: number }[]) => Math.max(...row.map((p) => p.a))

it.each(SEEDS)('seed %i: one soft mass, with no edge at its sides or its top', (seed) => {
  const at = curtainOf(seed)
  for (const t of [0.3, 0.5, 0.8]) {
    const row = at(t)
    expect(Math.max(row[0].a, row.at(-1)!.a)).toBeLessThan(0.03)
    expect(Math.max(...row.slice(1).map((p, i) => Math.abs(p.a - row[i].a)))).toBeLessThan(0.12)
  }
  expect(peak(at(0))).toBeLessThan(0.15)
})

it.each(SEEDS.flatMap((seed) => [[seed, 'real', FIBRES], [seed, 'drawn', PLANES]] as const))('seed %i, %s: a body, heavier and lighter across, thinning toward the ground', (seed, _hand, fibres) => {
  const at = curtainOf(seed, fibres), row = at(0.4)
  expect(peak(row)).toBeGreaterThan(0.6 * ALPHA)
  expect(peak(row)).toBeLessThan(1)
  expect(total(at(0.95))).toBeLessThan(0.8 * total(row))
})

it.each(SEEDS)('seed %i: its foot is carried downwind', (seed) => {
  const at = curtainOf(seed)
  expect(centre(at(0.9)) - centre(at(0.2))).toBeGreaterThan(0.4 * LEAN)
})
