import { smoothstep } from '../../../domain/smoothstep'
import { rng } from '../shared/base/core'
import type { Cap } from './cloudCaps'
import type { Cut, Eased } from './sheetEdge'
import { fieldAt, type SheetField } from './sheetField'

/*
 * One place of a broken sheet's lattice: a cap on the rim of its mass, a head inside it, or a scallop that hangs from its
 * foot; and the heads that crowd round a large one, so that a mass is built of groups. All of it grows and goes with the
 * cloud under it. Pure: the field, the cut and the place's own seed.
 */

/** `hangs`: a scallop of the foot, cut but not lit. */
export interface SheetCap extends Cap { gx: number; gy: number; side: number; hangs?: boolean }
/** Half a lattice's pitch (px) at a place, the share of it that is there, and its seed. */
interface Spot { x: number; y: number; half: number; weight: number; seed: number }

/** A cap's size (px) against its row's spacing, at least and at most; a head's against a rim cap's; the size one is drawn from. */
const SIZE = 1.7, LEAST = 3.5, MOST = 24
export const HEAD = 1.35, DRAWN = 2.6
/** Where a lattice is (its half pitch against the size wanted): comes in over, lets go over; how much smaller its caps may be at a rim. */
export const COMES = [0.65, 0.9] as const, GOES = [1.3, 1.8] as const, FINER = 0.4
/** A cap's least (on the rim, inside) and most size against its half pitch, and how seldom it is large. */
export const SIZES = [0.7, 0.95, 1.8] as const
const SELDOM = 1.4
/** A cap's most at the edge (of its size), how seldom it is that, what it grows with each px in from it, and over how far (px) in it comes. */
const OUT = [0.3, 0.85] as const, BOLD = 1.6, IN = 0.75, ONTO = [0.5, 7] as const
/** How far in (of its size) a rim goes; the share of places kept deep inside, and what eases it. */
const RIM = 1.4, INSIDE = 0.85, STAYS = 0.15
/** Where in its mass a rim's caps have gone and where its scallops have come, and where a head has gone. */
const FOOT = [-0.65, -0.4] as const, HANGS = [-0.65, -0.85] as const, SUNK = [-1, -0.8] as const
/** How much of a rim a place is for a scallop, the least and most one is (of its size), and how far (of itself) it stands in the mass. */
const EDGE = [0.5, 0.8] as const, SAG = [0.3, 0.8] as const, SET = 0.55
/** How far (px) the edge's way out is read over; how far a cap leans out of its mass, and at random (rad); what the lean is taken over (of the row's spacing). */
const OUTWARD = 4, LEAN = 0.9, SWAY = 0.3, ABOUT = 1.5
/** The heads round a large one, of its size: across, down, size. Behind its crown, then before its foot; the share that is there. */
const ROUND = [[-0.44, -0.62, 0.42], [0.36, -0.7, 0.36], [-0.8, 0.24, 0.6], [0.76, 0.32, 0.54], [-0.04, 0.5, 0.64]] as const, MANY = 0.8
/** How far one strays (of the large one), the size (px) that has none and all of them, and what keeps theirs apart in the seed. */
const ASTRAY = 0.22, CROWD = [8, 15] as const, ROUND_SEED = 15_485_863

/** The size (px) a rim's cap has at a row of the field. */
export function sizeAt({ rows, spacing }: SheetField, gy: number): number {
  const r = Math.min(rows - 2, Math.max(0, Math.floor(gy))), u = Math.min(1, gy - r)
  return Math.min(MOST, Math.max(LEAST, SIZE * (spacing[r] + (spacing[r + 1] - spacing[r]) * u)))
}

/** What stands at a place, the large one first. */
export function capsAt(read: Eased, cut: Cut, spot: Spot, random: () => number): SheetCap[] {
  const cap = capAt(read, cut, spot, random)
  if (!cap) return []
  return cap.hangs || cap.r <= CROWD[0] ? [cap] : [cap, ...crowd(read, cut, cap)]
}

/** The most a cap may be at a place this far in, so that none stands off its mass. */
const roomAt = (size: number, inside: number, bold: number) =>
  (size * (OUT[0] + (OUT[1] - OUT[0]) * bold) + IN * inside) * smoothstep(ONTO[0], ONTO[1], inside)

function capAt(read: Eased, cut: Cut, { x, y, half, weight, seed }: Spot, random: () => number): SheetCap | null {
  const { f, wide } = read, gx = ((x - f.x0) / f.width) * (f.cols - 1), gy = ((y - f.y0) / f.height) * (f.rows - 1), inside = cut.inside(x, y)
  if (inside <= ONTO[0]) return null
  const size = sizeAt(f, gy), rim = 1 - smoothstep(0, RIM * size, inside), q = half / (size * (HEAD + (1 - HEAD) * rim)), least = 1 - (1 - FINER) * rim
  const there = smoothstep(COMES[0] * least, COMES[1] * least, q) * (1 - smoothstep(GOES[0], GOES[1], q)) * weight
  if (!there) return null
  const side = cut.sideAt(x, y), bold = random() ** BOLD, stays = smoothstep(0, STAYS, INSIDE + (1 + STAYS - INSIDE) * rim - random())
  const small = SIZES[1] + (SIZES[0] - SIZES[1]) * rim, own = half * (small + (SIZES[2] - small) * random() ** SELDOM), sway = SWAY * (random() - 0.5)
  if (side < FOOT[0] && rim > EDGE[0]) {
    const most = Math.min(own, size * (SAG[0] + (SAG[1] - SAG[0]) * bold)) * smoothstep(ONTO[0], ONTO[1], inside)
    const r = most * there * smoothstep(EDGE[0], EDGE[1], rim) * smoothstep(HANGS[0], HANGS[1], side)
    if (r <= DRAWN) return null
    const [nx, ny] = outward(cut, x, y)
    return { x: x - SET * r * nx, y: y - SET * r * ny, r, gx, gy, side, seed, tilt: Math.atan2(nx, -ny), hangs: true }
  }
  const high = Math.max(smoothstep(FOOT[0], FOOT[1], side), (1 - smoothstep(0, EDGE[0], rim)) * smoothstep(SUNK[0], SUNK[1], side))
  const r = Math.min(roomAt(size, inside, bold), own) * there * stays * high
  return r > DRAWN ? { x, y, r, gx, gy, side, seed, tilt: LEAN * leanAt(wide, f, gx, gy) + sway } : null
}

/** The heads round a large one: smaller behind its crown, shoulders before its foot. */
function crowd({ f }: Eased, cut: Cut, head: SheetCap): SheetCap[] {
  const random = rng(head.seed + ROUND_SEED), c = Math.cos(head.tilt), s = Math.sin(head.tilt), grown = head.r * smoothstep(CROWD[0], CROWD[1], head.r)
  const stray = () => ASTRAY * (random() - 0.5), out: SheetCap[] = []
  ROUND.forEach(([across, down, share], n) => {
    const u = (across + stray()) * head.r, v = (down + stray()) * head.r, most = share * (0.8 + 0.4 * random()) * grown
    if (random() > MANY) return
    const x = head.x + u * c - v * s, y = head.y + u * s + v * c, gx = ((x - f.x0) / f.width) * (f.cols - 1), gy = ((y - f.y0) / f.height) * (f.rows - 1)
    const r = Math.min(most, roomAt(sizeAt(f, gy), cut.inside(x, y), 0.5))
    if (r > DRAWN) out.push({ x, y, r, gx, gy, side: cut.sideAt(x, y), seed: head.seed + (n + 1) * ROUND_SEED, tilt: head.tilt + 0.5 * across })
  })
  return out
}

/** The way out of the mass at a place near its edge. */
function outward({ inside }: Cut, x: number, y: number): readonly [number, number] {
  const dx = inside(x - OUTWARD, y) - inside(x + OUTWARD, y), dy = inside(x, y - OUTWARD) - inside(x, y + OUTWARD), d = Math.sqrt(dx * dx + dy * dy)
  return d > 1e-3 ? [dx / d, dy / d] : [0, 1]
}

/** Which way the mass faces at a place (-1 left … 1 right), from the cloud on either side of it. */
export function leanAt(wide: Float32Array, f: SheetField, gx: number, gy: number): number {
  const by = (ABOUT * f.spacing[Math.min(f.rows - 1, Math.max(0, Math.round(gy)))] * (f.cols - 1)) / f.width
  const l = fieldAt(wide, f.cols, f.rows, Math.max(0, gx - by), gy), r = fieldAt(wide, f.cols, f.rows, Math.min(f.cols - 1, gx + by), gy)
  return (l - r) / (l + r + 0.1)
}
