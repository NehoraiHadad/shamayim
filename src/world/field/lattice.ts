import { hashId, seeded } from '../../data/landmarks/hash'
import { createClumpSampler, mixSeed } from './clump'
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
  clump: (x: number, y: number) => number
}
const places = new Map<string, Map<Lattice, Cache>>()
const spareBlocks: Block[] = []

/** Look up the cache partition and hash its seed once. */
export function siteCache(placeId: string, lattice: Lattice): Cache {
  let place = places.get(placeId)
  if (!place) {
    if (places.size === 8) {
      const oldest = places.keys().next().value!
      for (const partition of places.get(oldest)!.values()) spareBlocks.push(...partition.blocks)
      places.delete(oldest)
    }
    places.set(placeId, place = new Map())
  }
  let cache = place.get(lattice)
  if (!cache) {
    const seed = hashId(`${placeId}:${lattice}`)
    cache = { seed, blocks: [], clump: createClumpSampler(seed, LATTICES[lattice].wavelength) }
    place.set(lattice, cache)
  }
  return cache
}

/** Centre a stamped block on the requested air-frame site. */
export function centerSites(cache: Cache, i: number, j: number, halfWidth = 0, halfHeight = 0): Block {
  const { blocks } = cache
  const found = blocks.findIndex(b => i >= b.i + Math.max(16, halfWidth) && i < b.i + size - Math.max(16, halfWidth)
    && j >= b.j + Math.max(16, halfHeight) && j < b.j + size - Math.max(16, halfHeight))
  if (found === 0) return blocks[0]
  const block = found > 0 ? blocks.splice(found, 1)[0] : blocks.length === 2 ? blocks.pop()! : spareBlocks.pop() ?? {
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

/** Sample the deterministic air-frame clump field. */
export function clumpSampler(placeId: string, lattice: Lattice) {
  return siteCache(placeId, lattice).clump
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
  return populateSite(cache, block, lattice, i, j, index, offset)
}

function populateSite(cache: Cache, block: Block, lattice: Lattice, i: number, j: number, index: number, offset: number) {
  const { pitch, median, sigma, amplitude, period } = LATTICES[lattice]
  const seed = mixSeed(cache.seed, i, j)
  const rng = seeded(seed)
  const x = pitch * (i + 0.7 * (rng() - 0.5))
  const y = pitch * (j + 0.7 * (rng() - 0.5))
  const u = rng()
  const normal = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
  const r = Math.min(maxRadius(lattice), median * Math.exp(sigma * normal))
  const data = block.data
  data[offset] = x
  data[offset + 1] = y
  data[offset + 2] = lattice === 'low' ? Math.max(0.12, r) : r
  data[offset + 3] = u
  data[offset + 4] = rng()
  data[offset + 5] = period[0] + (period[1] - period[0]) * rng()
  data[offset + 6] = rng()
  data[offset + 7] = rng()
  data[offset + 8] = (cache.clump(x, y) - 0.5) * amplitude
  data[offset + 9] = seed
  block.filled[index] = block.stamp
  return offset
}
