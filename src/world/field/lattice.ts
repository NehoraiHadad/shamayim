import { hashId, seeded } from '../../data/landmarks/hash'
import type { Lattice } from './types'

/** Lattice pitch, radius distribution and clump wavelengths in km. */
export const LATTICES = {
  low: { pitch: 1.5, median: 0.30, sigma: 0.45, wavelength: 12, amplitude: 0.35, period: [20, 40] },
  tower: { pitch: 8, median: 1.2, sigma: 0.4, wavelength: 12, amplitude: 0.35, period: [20, 40] },
  mid: { pitch: 6, median: 2.2, sigma: 0.4, wavelength: 40, amplitude: 0.5, period: [60, 180] },
  high: { pitch: 25, median: 15, sigma: 0.4, wavelength: 150, amplitude: 0.5, period: [90, 240] },
} as const

const size = 128
const stride = 10
interface Block {
  i: number
  j: number
  stamp: number
  filled: Uint32Array
  data: Float64Array
}
interface Cache {
  seed: number
  blocks: Block[]
  corners: Map<number, number>[]
}
const places = new Map<string, Map<Lattice, Cache>>()

/** Look up the cache partition and hash its seed once. */
export function siteCache(placeId: string, lattice: Lattice): Cache {
  let place = places.get(placeId)
  if (!place) {
    if (places.size === 8) places.delete(places.keys().next().value!)
    places.set(placeId, place = new Map())
  }
  let cache = place.get(lattice)
  if (!cache) {
    cache = { seed: hashId(`${placeId}:${lattice}`), blocks: [], corners: [new Map(), new Map()] }
    place.set(lattice, cache)
  }
  return cache
}

function mixSeed(seed: number, i: number, j: number) {
  let h = seed ^ Math.imul(i, 0x9e3779b1) ^ Math.imul(j, 0x85ebca77)
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  return (h ^ (h >>> 16)) >>> 0
}

/** Centre a stamped block on the requested air-frame site. */
export function centerSites(cache: Cache, i: number, j: number, halfWidth = 0, halfHeight = 0): Block {
  const { blocks } = cache
  const found = blocks.findIndex(b => i >= b.i + Math.max(16, halfWidth) && i < b.i + size - Math.max(16, halfWidth)
    && j >= b.j + Math.max(16, halfHeight) && j < b.j + size - Math.max(16, halfHeight))
  if (found === 0) return blocks[0]
  const block = found > 0 ? blocks.splice(found, 1)[0] : blocks.length === 2 ? blocks.pop()! : {
    i: 0, j: 0, stamp: 0, filled: new Uint32Array(size ** 2), data: new Float64Array(size ** 2 * stride),
  }
  if (found < 0) {
    block.i = i - size / 2
    block.j = j - size / 2
    block.stamp = (block.stamp + 1) >>> 0
    if (!block.stamp) {
      block.filled.fill(0)
      block.stamp = 1
    }
  }
  blocks.unshift(block)
  return block
}

function valueNoise(cache: Cache, x: number, y: number, octave: number) {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const smooth = (f: number) => f * f * (3 - 2 * f)
  const mix = (a: number, b: number, f: number) => a + (b - a) * f
  const corners = cache.corners[octave]
  const value = (a: number, b: number) => {
    // Pair signed integer coordinates injectively across the practical world range.
    const p = a >= 0 ? 2 * a : -2 * a - 1
    const q = b >= 0 ? 2 * b : -2 * b - 1
    const key = (p + q) * (p + q + 1) / 2 + q
    let v = corners.get(key)
    if (v === undefined) {
      v = seeded(mixSeed(cache.seed ^ (0x51ed270b + octave), a, b))()
      if (corners.size >= 8192) corners.clear()
      corners.set(key, v)
    }
    return v
  }
  const fx = smooth(x - i)
  return mix(mix(value(i, j), value(i + 1, j), fx),
    mix(value(i, j + 1), value(i + 1, j + 1), fx), smooth(y - j))
}

function noise(cache: Cache, lattice: Lattice, xKm: number, yKm: number) {
  const x = xKm / LATTICES[lattice].wavelength
  const y = yKm / LATTICES[lattice].wavelength
  return (2 * valueNoise(cache, x, y, 0) + valueNoise(cache, x * 2, y * 2, 1)) / 3
}

/** Two octaves of smooth value noise at an air-frame point in km. */
export function clumpAt(q: readonly [number, number], lattice: Lattice, placeId: string): number {
  return noise(siteCache(placeId, lattice), lattice, q[0], q[1])
}

/** Maximum unscaled radius in km, with the upper 1% of the lognormal clipped. */
export function maxRadius(lattice: Lattice): number {
  const { median, sigma } = LATTICES[lattice]
  return lattice === 'low' ? 0.60 : median * Math.exp(sigma * 2.326347874)
}

/** Read packed site attributes without allocating on cache hits. */
export function siteAt(cache: Cache, block: Block, lattice: Lattice, i: number, j: number): number {
  const index = (j - block.j) * size + i - block.i
  const offset = index * stride
  if (block.filled[index] === block.stamp) return offset
  const { pitch, median, sigma, amplitude, period } = LATTICES[lattice]
  const seed = mixSeed(cache.seed, i, j)
  const rng = seeded(seed)
  const x = pitch * (i + 0.7 * (rng() - 0.5))
  const y = pitch * (j + 0.7 * (rng() - 0.5))
  const u = rng()
  const normal = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
  const r = Math.min(maxRadius(lattice), median * Math.exp(sigma * normal))
  block.data.set([x, y, lattice === 'low' ? Math.max(0.12, r) : r, u, rng(),
    period[0] + (period[1] - period[0]) * rng(), rng(), rng(), (noise(cache, lattice, x, y) - 0.5) * amplitude,
    seed], offset)
  block.filled[index] = block.stamp
  return offset
}
