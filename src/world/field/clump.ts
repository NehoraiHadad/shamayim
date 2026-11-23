import { seeded } from '../../data/landmarks/hash'

export function mixSeed(seed: number, i: number, j: number) {
  let h = seed ^ Math.imul(i, 0x9e3779b1) ^ Math.imul(j, 0x85ebca77)
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  return (h ^ (h >>> 16)) >>> 0
}

const smooth = (f: number) => f * f * (3 - 2 * f)
const mix = (a: number, b: number, f: number) => a + (b - a) * f

function corner(seed: number, corners: Map<number, number>, octave: number, i: number, j: number) {
  // Pair signed integer coordinates injectively across the practical world range.
  const p = i >= 0 ? 2 * i : -2 * i - 1
  const q = j >= 0 ? 2 * j : -2 * j - 1
  const key = (p + q) * (p + q + 1) / 2 + q
  let value = corners.get(key)
  if (value === undefined) {
    value = seeded(mixSeed(seed ^ (0x51ed270b + octave), i, j))()
    if (corners.size >= 8192) corners.clear()
    corners.set(key, value)
  }
  return value
}

/** Memoize seeded corner neighborhoods for interleaved near and far queries. */
export function createClumpSampler(seed: number, wavelength: number) {
  const octave = (level: number, scale: number) => {
    const corners = new Map<number, number>()
    const neighborhoods: { i: number; j: number; a: number; b: number; c: number; d: number }[] = []
    return (x: number, y: number) => {
      x *= scale
      y *= scale
      const i = Math.floor(x), j = Math.floor(y)
      const index = (i ^ Math.imul(j, 31)) & 127
      let cell = neighborhoods[index]
      if (!cell || i !== cell.i || j !== cell.j) {
        cell = neighborhoods[index] = {
          i, j, a: corner(seed, corners, level, i, j), b: corner(seed, corners, level, i + 1, j),
          c: corner(seed, corners, level, i, j + 1), d: corner(seed, corners, level, i + 1, j + 1),
        }
      }
      const f = smooth(x - i)
      return mix(mix(cell.a, cell.b, f), mix(cell.c, cell.d, f), smooth(y - j))
    }
  }
  const coarse = octave(0, 1)
  const fine = octave(1, 2)
  return (x: number, y: number, fineWeight = 1) => {
    x /= wavelength
    y /= wavelength
    return (2 * coarse(x, y) + (fineWeight ? fineWeight * fine(x, y) + (1 - fineWeight) * 0.5 : 0.5)) / 3
  }
}

/** Lazy coarse air-frame cache. The 2:1 octave mix has axis curvature at most 12/wavelength²,
 * so bilinear error is at most 2 × 12 / (8 × 16²) = 0.01172.
 */
export function sampleClumpGrid(sample: (x: number, y: number) => number, wavelength: number) {
  const step = wavelength / 16
  const size = 4096
  const values = new Float64Array(size)
  const east = new Float64Array(size).fill(NaN)
  const north = new Float64Array(size)
  function node(i: number, j: number) {
    const key = (Math.imul(i, 31) ^ Math.imul(j, 127)) & (size - 1)
    if (east[key] !== i || north[key] !== j) {
      east[key] = i
      north[key] = j
      values[key] = sample(i * step, j * step)
    }
    return values[key]
  }
  const blockSize = 2048
  const tagsX = new Float64Array(blockSize).fill(NaN)
  const tagsY = new Float64Array(blockSize)
  const quads = new Float64Array(blockSize * 4)
  const scale = 1 / step
  return (x: number, y: number) => {
    const u = x * scale, v = y * scale
    const i = Math.floor(u), j = Math.floor(v)
    const a = u - i, b = v - j
    const key = (Math.imul(i, 31) ^ Math.imul(j, 127)) & (blockSize - 1)
    const offset = key * 4
    if (tagsX[key] !== i || tagsY[key] !== j) {
      tagsX[key] = i
      tagsY[key] = j
      const origin = node(i, j)
      const right = node(i + 1, j)
      const top = node(i, j + 1)
      quads[offset] = origin
      quads[offset + 1] = right - origin
      quads[offset + 2] = top - origin
      quads[offset + 3] = node(i + 1, j + 1) - right - top + origin
    }
    return quads[offset] + a * quads[offset + 1] + b * (quads[offset + 2] + a * quads[offset + 3])
  }
}
