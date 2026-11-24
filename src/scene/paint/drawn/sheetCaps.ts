import type { LayerOf } from '../../model/types'
import { rng } from '../shared/base/core'
import { capsAt, COMES, DRAWN, FINER, GOES, HEAD, sizeAt, SIZES, type SheetCap } from './sheetCap'
import type { Cut, Eased } from './sheetEdge'
import { placesOf, type Places } from './sheetPlaces'

/*
 * Where a broken sheet's caps stand: on lattices of the cloud's own air, each twice as wide as the one before, so that a cap
 * goes with its cloud as the wind carries it and never jumps. A lattice comes in where its caps have the size the hand has
 * there, and lets go where the next one has. Pure: the desc, its field and its seed.
 */

type Sheet = LayerOf<'cloudSheet'>

/** How far a cap strays (of the pitch). */
const STRAY = 0.85
/** Keeps the lattices' places apart in the seed. */
const EAST = 7919, NORTH = 104_729, TIER = 1_299_709, LOWEST = 64

/** The caps, the mass's top first, so that a lower one stands before it. */
export function sheetCaps(desc: Sheet, read: Eased, cut: Cut, seed: number): SheetCap[] {
  const { air, ys } = desc, { f } = read, out: SheetCap[] = []
  if (!air) return out
  const places = placesOf(desc, air), tiers = tiersOf(places, air.ranges, ys.map((y) => sizeAt(f, ((y - f.y0) / f.height) * (f.rows - 1))))
  for (const { d, weight } of air.frames) {
    if (!weight) continue
    for (const { level, from, to } of tiers) {
      const pitch = 2 ** level, reach = to + pitch, [i0, i1, j0, j1] = [-reach - d[0], reach - d[0], -reach - d[1], reach - d[1]].map((v) => Math.floor(v / pitch))
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (!places.near((i + 0.5) * pitch + d[0], (j + 0.5) * pitch + d[1], pitch, from, to)) continue
        const own = seed + i * EAST + j * NORTH + (level + LOWEST) * TIER, random = rng(own)
        const at = places.seen((i + 0.5 + STRAY * (random() - 0.5)) * pitch + d[0], (j + 0.5 + STRAY * (random() - 0.5)) * pitch + d[1])
        if (at) out.push(...capsAt(read, cut, { x: at.x, y: at.y, half: (pitch / 2) * at.perKm, weight: weight * at.there, seed: own }, random))
      }
    }
  }
  return out.sort((a, b) => a.y - 0.2 * a.r - (b.y - 0.2 * b.r))
}

/** The lattices (a power of two km) that are anywhere on the sheet, and the ground ranges each is at. */
function tiersOf({ perKm, nearest }: Places, ranges: readonly number[], sizes: readonly number[]): { level: number; from: number; to: number }[] {
  const at = new Map<number, { from: number; to: number }>()
  for (let r = 0; r < ranges.length; r++) {
    if (!(perKm[r] > 0)) continue
    const pitch = (2 * sizes[r]) / perKm[r], hi = Math.ceil(Math.log2(pitch * HEAD * GOES[1])), least = (2 * DRAWN) / (SIZES[2] * perKm[r])
    for (let level = Math.floor(Math.log2(Math.max(least, pitch * COMES[0] * FINER))); level <= hi; level++) {
      const { from, to } = at.get(level) ?? { from: Infinity, to: 0 }
      at.set(level, { from: Math.min(from, Math.max(nearest, ranges[Math.max(0, r - 1)])), to: Math.max(to, ranges[Math.min(ranges.length - 1, r + 1)]) })
    }
  }
  return [...at].map(([level, t]) => ({ level, ...t }))
}
