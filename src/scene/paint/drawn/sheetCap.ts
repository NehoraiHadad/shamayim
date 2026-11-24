import { smoothstep } from '../../../domain/smoothstep'
import { rng } from '../shared/base/core'
import type { Cap } from './cloudCaps'
import type { Cut, Eased } from './sheetEdge'
import { fieldAt, type SheetField } from './sheetField'

/*
 * The heads inside a broken sheet's mass, each with the smaller ones that crowd round it, so that a mass is built of groups.
 * A head grows and goes with the cloud under it. Pure: the field, the cut and the place's own seed.
 */

/** `lit`: how far a cap takes its own light, 0 where it faces down. */
export interface SheetCap extends Cap { gx: number; gy: number; side: number; lit: number }
/** A place of a lattice: half its pitch (px) there, the share of it that counts, its seed. */
export interface Spot { x: number; y: number; half: number; weight: number; seed: number }

/** A cap's size (px) against its row's spacing, at least and at most; the size one is drawn from. */
const SIZE = 1.7, LEAST = 3.5, MOST = 24
export const DRAWN = 2.6
/** Where a lattice's places are heads (its half pitch against the size): they come in over, let go over. */
export const HEADS = [0.88, 1.2, 1.75, 2.4] as const
/** A head's least and most size against its half pitch, and how seldom it is large; the share of places kept, and what eases it. */
const SIZES = [0.95, 1.8] as const, SELDOM = 1.4, KEPT = 0.85, STAYS = 0.15
/** How far in (of the size) heads come; where in its mass (its side) one has gone. */
const INTO = [0.2, 1.2] as const, SUNK = [-1.1, -0.7] as const
/** The most a head may be at the edge (of the size), and what that grows with each px in from it: none stands off its mass. */
const OUT = 0.45, IN = 0.75
/** How far a head leans out of its mass, and at random (rad); what the lean is taken over (of the row's spacing). */
const LEAN = 0.9, SWAY = 0.3, ABOUT = 1.5
/** The heads round a large one, of its size: across, down, size. Behind its crown, then before its foot; the share that is there. */
const ROUND = [[-0.44, -0.62, 0.42], [0.36, -0.7, 0.36], [-0.8, 0.24, 0.6], [0.76, 0.32, 0.54], [-0.04, 0.5, 0.64]] as const, MANY = 0.8
/** How far one strays (of the large one), the size (px) that has none and all of them, and what keeps theirs apart in the seed. */
const ASTRAY = 0.22, CROWD = [8, 15] as const, ROUND_SEED = 15_485_863

/** The size (px) the hand has at a row of the field. */
export function sizeAt({ rows, spacing }: SheetField, gy: number): number {
  const r = Math.min(rows - 2, Math.max(0, Math.floor(gy))), u = Math.min(1, gy - r)
  return Math.min(MOST, Math.max(LEAST, SIZE * (spacing[r] + (spacing[r + 1] - spacing[r]) * u)))
}

/** A place (px) on the field's grid. */
export const onGrid = (f: SheetField, x: number, y: number) => ({ gx: ((x - f.x0) / f.width) * (f.cols - 1), gy: ((y - f.y0) / f.height) * (f.rows - 1) })

/** The most a head may be at a place this far in. */
const roomAt = (size: number, inside: number) => Math.max(0, OUT * size * smoothstep(0, 0.3 * size, inside) + IN * inside)

/** The head at a place, and those round it. */
export function headsAt(read: Eased, cut: Cut, { x, y, half, weight, seed }: Spot, random: () => number): SheetCap[] {
  const { f, wide } = read, at = onGrid(f, x, y), size = sizeAt(f, at.gy), q = half / size
  const there = smoothstep(HEADS[0], HEADS[1], q) * (1 - smoothstep(HEADS[2], HEADS[3], q))
  if (!there) return []
  const inside = cut.inside(x, y), into = smoothstep(INTO[0] * size, INTO[1] * size, inside)
  if (!into) return []
  const side = cut.sideAt(x, y), own = half * (SIZES[0] + (SIZES[1] - SIZES[0]) * random() ** SELDOM), stays = smoothstep(0, STAYS, KEPT - random())
  const r = Math.min(roomAt(size, inside), own) * there * into * stays * smoothstep(SUNK[0], SUNK[1], side)
  if (r <= DRAWN) return []
  const head = { x, y, r, ...at, side, seed, tilt: LEAN * leanAt(wide, f, at.gx, at.gy) + SWAY * (random() - 0.5), lit: 1 }
  return [head, ...crowd(f, cut, head)].map((cap) => ({ ...cap, r: cap.r * weight })).filter((cap) => cap.r > DRAWN)
}

/** The heads round a large one: smaller behind its crown, shoulders before its foot. */
function crowd(f: SheetField, cut: Cut, head: SheetCap): SheetCap[] {
  const out: SheetCap[] = []
  if (head.r <= CROWD[0]) return out
  const random = rng(head.seed + ROUND_SEED), c = Math.cos(head.tilt), s = Math.sin(head.tilt), grown = head.r * smoothstep(CROWD[0], CROWD[1], head.r)
  const stray = () => ASTRAY * (random() - 0.5)
  ROUND.forEach(([across, down, share], n) => {
    const u = (across + stray()) * head.r, v = (down + stray()) * head.r, most = share * (0.8 + 0.4 * random()) * grown
    if (random() > MANY) return
    const x = head.x + u * c - v * s, y = head.y + u * s + v * c, at = onGrid(f, x, y), r = Math.min(most, roomAt(sizeAt(f, at.gy), cut.inside(x, y)))
    if (r > DRAWN) out.push({ x, y, r, ...at, side: cut.sideAt(x, y), seed: head.seed + (n + 1) * ROUND_SEED, tilt: head.tilt + 0.5 * across, lit: 1 })
  })
  return out
}

/** Which way the mass faces at a place (-1 left … 1 right), from the cloud on either side of it. */
export function leanAt(wide: Float32Array, f: SheetField, gx: number, gy: number): number {
  const by = (ABOUT * f.spacing[Math.min(f.rows - 1, Math.max(0, Math.round(gy)))] * (f.cols - 1)) / f.width
  const l = fieldAt(wide, f.cols, f.rows, Math.max(0, gx - by), gy), r = fieldAt(wide, f.cols, f.rows, Math.min(f.cols - 1, gx + by), gy)
  return (l - r) / (l + r + 0.1)
}
