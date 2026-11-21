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
  return (x: number, y: number) => (2 * coarse(x / wavelength, y / wavelength) + fine(x / wavelength, y / wavelength)) / 3
}
