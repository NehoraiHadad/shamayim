import { hashId, seeded } from '../../data/landmarks/hash'
import { unit } from './genus'
import type { Lattice } from './types'

/** Lattice pitch, radius distribution and clump wavelengths in km. */
export const LATTICES = {
  low: { pitch: 1.5, median: 0.30, sigma: 0.45, wavelength: 12, amplitude: 0.35, period: [31, 40] },
  tower: { pitch: 8, median: 1.2, sigma: 0.4, wavelength: 12, amplitude: 0.35, period: [31, 40] },
  mid: { pitch: 6, median: 2.2, sigma: 0.4, wavelength: 40, amplitude: 0.5, period: [60, 180] },
  high: { pitch: 25, median: 15, sigma: 0.4, wavelength: 150, amplitude: 0.5, period: [90, 240] },
} as const

const size = 128
const margin = 16
const stride = 10
interface Block {
  placeId: string
  lattice: Lattice
  i: number
  j: number
  data: Float64Array
}
const blocks: Block[] = []

/** Keep the eye's air-frame location away from the cache block edges. */
export function centerSites(placeId: string, lattice: Lattice, i: number, j: number) {
  const found = blocks.findIndex(block => block.placeId === placeId && block.lattice === lattice
    && i >= block.i + margin && i < block.i + size - margin
    && j >= block.j + margin && j < block.j + size - margin)
  if (found === 0) return
  if (found > 0) {
    blocks.unshift(...blocks.splice(found, 1))
  } else {
    const reused = blocks.length === 2 ? blocks.pop()?.data : undefined
    const data = reused ?? new Float64Array(size * size * stride)
    data.fill(0)
    blocks.unshift({ placeId, lattice, i: i - size / 2, j: j - size / 2, data })
  }
}

function valueNoise(placeId: string, lattice: Lattice, x: number, y: number, octave: number) {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const smooth = (f: number) => f * f * (3 - 2 * f)
  const mix = (a: number, b: number, f: number) => a + (b - a) * f
  const value = (i: number, j: number) => seeded(hashId(`${placeId}:${lattice}:clump:${octave}:${i}:${j}`))()
  const fx = smooth(x - i)
  return mix(mix(value(i, j), value(i + 1, j), fx),
    mix(value(i, j + 1), value(i + 1, j + 1), fx), smooth(y - j))
}

/** Two octaves of smooth value noise at an air-frame point in km. */
export function clumpAt(q: readonly [number, number], lattice: Lattice, placeId = ''): number {
  const { wavelength } = LATTICES[lattice]
  const x = q[0] / wavelength
  const y = q[1] / wavelength
  return (2 * valueNoise(placeId, lattice, x, y, 0) + valueNoise(placeId, lattice, x * 2, y * 2, 1)) / 3
}

function siteValues(placeId: string, lattice: Lattice, i: number, j: number) {
  const { pitch, median, sigma, amplitude, period } = LATTICES[lattice]
  const seed = hashId(`${placeId}:${lattice}:${i}:${j}`)
  const rng = seeded(seed)
  const x = pitch * (i + 0.7 * (rng() - 0.5))
  const y = pitch * (j + 0.7 * (rng() - 0.5))
  const u = rng()
  const normal = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
  const radius = median * Math.exp(sigma * normal)
  const r0 = lattice === 'low' ? Math.max(0.12, Math.min(0.60, radius)) : radius
  const aspect = rng()
  const lifePeriod = period[0] + (period[1] - period[0]) * rng()
  const lifePhase = rng()
  const axis = lattice === 'high' ? rng() * 360 : 0
  const clump = clumpAt([x, y], lattice, placeId) - 0.5
  return [x, y, r0, u, aspect, lifePeriod, lifePhase, axis, clump * amplitude, seed]
}

/** Read the deterministic attributes for an integer site, initializing it on demand. */
export function siteAt(placeId: string, lattice: Lattice, i: number, j: number) {
  if (!blocks.some(b => b.placeId === placeId && b.lattice === lattice)) centerSites(placeId, lattice, i, j)
  const block = blocks.find(b => b.placeId === placeId && b.lattice === lattice
    && i >= b.i && i < b.i + size && j >= b.j && j < b.j + size)
  const offset = block ? ((j - block.j) * size + i - block.i) * stride : 0
  const data = block?.data ?? siteValues(placeId, lattice, i, j)
  if (block && block.data[offset + 2] === 0) block.data.set(siteValues(placeId, lattice, i, j), offset)
  const u = data[offset + 3]
  const clump = data[offset + 8]
  return {
    x: data[offset], y: data[offset + 1], r0: data[offset + 2], u,
    aspect: data[offset + 4], seed: data[offset + 9],
    lifePeriod: data[offset + 5], lifePhase: data[offset + 6],
    axis: lattice === 'high' ? data[offset + 7] : undefined,
    clump, rank: unit(u + clump),
  }
}
