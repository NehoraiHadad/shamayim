import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf } from '../../model/types'
import { rng } from '../shared/base/core'
import type { Cap } from './cloudCaps'
import type { Cut, Eased } from './sheetEdge'
import { fieldAt, type SheetField } from './sheetField'
import { placesOf, type Places } from './sheetPlaces'

/*
 * Where a broken sheet's caps stand: on lattices of the cloud's own air, each twice as wide as the one before, so that a cap
 * goes with its cloud as the wind carries it and never jumps. A lattice comes in where its caps have the size the hand has
 * there, and lets go where the next one has; a cap grows with the cloud under it. Pure: the desc, its field and its seed.
 */

type Sheet = LayerOf<'cloudSheet'>
export interface SheetCap extends Cap { gx: number; gy: number; side: number }

/** Half a lattice's pitch (px) against its row's spacing, at least and at most. */
const SIZE = 1.7, LEAST = 3, MOST = 24
/** Where a lattice is (its half pitch against the size wanted): comes in over, lets go over; how much smaller its caps may be at a rim. */
const COMES = [0.5, 0.75] as const, GOES = [1.5, 2.1] as const, FINER = 0.4
/** How far a cap strays (of the pitch), its least and most size (of half of it), how seldom it is large; the size (px) it is drawn from. */
const STRAY = 0.85, SIZES = [0.7, 1.9] as const, SELDOM = 1.4, DRAWN = 2
/** A cap's most at the edge (of its size), what it grows with each px in from it, and over how far (px) in it comes: none stands off its mass. */
const OUT = [0.3, 0.6] as const, IN = 0.75, ONTO = [0.5, 5] as const
/** How far in (of its size) a rim goes; the share of places kept deep inside, and what eases it. */
const RIM = 1.4, INSIDE = 0.85, STAYS = 0.15
/** Where in its mass a cap has gone: its foot has none. */
const FOOT = [-0.85, -0.4] as const
/** How far a cap leans out of its mass, and at random (rad); what it is taken over (of the row's spacing). */
const LEAN = 0.9, SWAY = 0.3, ABOUT = 1.5
/** Keeps the lattices' places apart in the seed. */
const EAST = 7919, NORTH = 104_729, TIER = 1_299_709, LOWEST = 64, FRAME = 17

/** The caps, the mass's top first, so that a lower one stands before it. */
export function sheetCaps(desc: Sheet, read: Eased, cut: Cut, seed: number): SheetCap[] {
  const { air, ys } = desc, { f } = read, out: SheetCap[] = []
  if (!air) return out
  const places = placesOf(desc, air), tiers = tiersOf(places, air.ranges, ys.map((y) => sizeAt(f, ((y - f.y0) / f.height) * (f.rows - 1))))
  air.frames.forEach(({ d, weight }, n) => {
    for (const { level, from, to } of tiers) {
      const pitch = 2 ** level, reach = to + pitch, [i0, i1, j0, j1] = [-reach - d[0], reach - d[0], -reach - d[1], reach - d[1]].map((v) => Math.floor(v / pitch))
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (!places.near((i + 0.5) * pitch + d[0], (j + 0.5) * pitch + d[1], pitch, from, to)) continue
        const own = seed + i * EAST + j * NORTH + (level + LOWEST) * TIER + n * FRAME, random = rng(own)
        const at = places.seen((i + 0.5 + STRAY * (random() - 0.5)) * pitch + d[0], (j + 0.5 + STRAY * (random() - 0.5)) * pitch + d[1])
        const cap = at && capAt(read, cut, at.x, at.y, (pitch / 2) * at.perKm, weight, random, own)
        if (cap) out.push(cap)
      }
    }
  })
  return out.sort((a, b) => a.y - 0.2 * a.r - (b.y - 0.2 * b.r))
}

/** The size (px) a cap has at a row of the field. */
function sizeAt({ rows, spacing }: SheetField, gy: number): number {
  const r = Math.min(rows - 2, Math.max(0, Math.floor(gy))), u = Math.min(1, gy - r)
  return Math.min(MOST, Math.max(LEAST, SIZE * (spacing[r] + (spacing[r + 1] - spacing[r]) * u)))
}

/** The lattices (a power of two km) that are anywhere on the sheet, and the ground ranges each is at. */
function tiersOf({ perKm }: Places, ranges: readonly number[], sizes: readonly number[]): { level: number; from: number; to: number }[] {
  const at = new Map<number, { from: number; to: number }>()
  for (let r = 1; r < ranges.length; r++) {
    const pitch = (2 * sizes[r]) / perKm[r], hi = Math.ceil(Math.log2(pitch * GOES[1])), least = (2 * DRAWN) / (SIZES[1] * perKm[r])
    for (let level = Math.floor(Math.log2(Math.max(least, pitch * COMES[0] * FINER))); level <= hi; level++) {
      const { from, to } = at.get(level) ?? { from: Infinity, to: 0 }
      at.set(level, { from: Math.min(from, ranges[r - 1]), to: Math.max(to, ranges[Math.min(ranges.length - 1, r + 1)]) })
    }
  }
  return [...at].map(([level, t]) => ({ level, ...t }))
}

function capAt({ f, wide }: Eased, cut: Cut, x: number, y: number, half: number, weight: number, random: () => number, seed: number): SheetCap | null {
  const gx = ((x - f.x0) / f.width) * (f.cols - 1), gy = ((y - f.y0) / f.height) * (f.rows - 1), size = sizeAt(f, gy), inside = cut.inside(x, y)
  if (inside <= ONTO[0]) return null
  const most = (size * (OUT[0] + (OUT[1] - OUT[0]) * random()) + IN * inside) * smoothstep(ONTO[0], ONTO[1], inside)
  const rim = 1 - smoothstep(0, RIM * size, inside), q = half / size, least = 1 - (1 - FINER) * rim
  const there = smoothstep(COMES[0] * least, COMES[1] * least, q) * (1 - smoothstep(GOES[0], GOES[1], q))
  if (!there) return null
  const side = cut.sideAt(x, y), stays = smoothstep(0, STAYS, INSIDE + (1 + STAYS - INSIDE) * rim - random())
  const r = Math.min(most, half * (SIZES[0] + (SIZES[1] - SIZES[0]) * random() ** SELDOM)) * there * stays * weight * smoothstep(FOOT[0], FOOT[1], side)
  return r > DRAWN ? { x, y, r, gx, gy, side, seed, tilt: LEAN * leanAt(wide, f, gx, gy) + SWAY * (random() - 0.5) } : null
}

/** Which way the mass faces at a place (-1 left … 1 right), from the cloud on either side of it. */
export function leanAt(wide: Float32Array, f: SheetField, gx: number, gy: number): number {
  const by = (ABOUT * f.spacing[Math.min(f.rows - 1, Math.max(0, Math.round(gy)))] * (f.cols - 1)) / f.width
  const l = fieldAt(wide, f.cols, f.rows, Math.max(0, gx - by), gy), r = fieldAt(wide, f.cols, f.rows, Math.min(f.cols - 1, gx + by), gy)
  return (l - r) / (l + r + 0.1)
}
