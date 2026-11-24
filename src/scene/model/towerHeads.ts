import { smoothstep } from '../../domain/smoothstep'
import { seeded } from '../../data/landmarks/hash'

/*
 * The heads a tower is made of, as the painter's field reads them: the main column under its crown, and lower shoulders
 * beside it that grew from the same base. Their number, place, width and height are the cell's own (its seed), so no two
 * towers share an outline. Sprite px, the origin at the middle of the near base edge, y down. Pure: the sprite alone.
 */

/** The main column's width against the cell's, as shoulders stand beside it: a squat heap's and a slender tower's. */
const MAIN_WIDTH = 0.8, MAIN_SLENDER = 0.78
/** Its top's width against its base: a squat heap's and a slender tower's. */
const TOP_WIDTH = 0.8, TOP_SLENDER = 0.6
/** Slender from this height to that, against the width: turrets of different heights that narrow upward, no pillar (the
 *  sky is drawn taller than it is wide, so a true column looks like one). */
const SLENDER = [1.1, 2.2] as const
/** The shoulders: how many at most, their distance from the column and width (of the cell's); the heights (of the tower's)
 *  they step down through, one after the other. */
const SHOULDERS = 3, OUT = [0.18, 0.3], WIDE = [0.45, 0.65], HIGH = [0.35, 0.88]
/** How much lower a shoulder stands under an anvil: the mature column rises clear of them. */
const UNDER_ANVIL = 0.35
/** Look: how much wider an anvil's top is than the column; the height (0 base … 1 top) it flares from. */
const ANVIL_FLARE = 1, FLARE_FROM = 0.45
/** The anvil's own height under the column's overshooting top, which is this wide and stands this far off the middle. */
const SHEET_TOP = 0.95, OVERSHOOT = 0.7, OFF = 0.3
/** How far an anvil's spread is carried downwind (of the flare). */
const DOWNWIND = 0.55
/** How high the shared base rises, against the cell's width. */
const BASE_RISE = 0.3
/** The crown's depth against the column's width: a dome, or an anvil's flat cap. */
const DOME = 0.6, CAP = 0.3

export interface Head {
  /** The column's middle, its half width at the base and its height; its top's width against its base. */
  x: number; half: number; tall: number; top: number
  /** Where the crown begins (y) and how deep it is. */
  joint: number; crown: number
  /** 0…1: how far its top spreads into an anvil. */
  anvil: number
}

export interface TowerHeadShape { seed: number; w: number; tall: number; anvil?: number }

/** No tower is drawn more slender: a Cb 8–12 km deep and 5–8 km across (`LATTICES.tower`) is at most 1.6 times as tall as
 *  wide. The dome stretches a near one past it; it is drawn wider there, not a chimney. */
export const SLENDEREST = 1.6
/** Above the cool-season Levant tropopause (km), a tall Cb can spread into an anvil, brought in over a column's last step
 *  to the most slender one (a cap on a squat body reads as a disc floating in the sky). */
const TROPOPAUSE_KM = 11
export const towerAnvil = (cb: boolean, top: number, w: number, tall: number) =>
  cb ? smoothstep(1.5, SLENDEREST, tall / w) * smoothstep(TROPOPAUSE_KM - 1.5, TROPOPAUSE_KM, top) : 0

/** The main column first, then its shoulders, last the base they all stand on (the whole underside is its own). */
export function headsOf(s: TowerHeadShape): Head[] {
  const r = seeded(s.seed ^ 0x51ed), above = seeded(s.seed ^ 0x2b1d), anvil = s.anvil ?? 0
  const slender = smoothstep(SLENDER[0], SLENDER[1], s.tall / s.w)
  const between = ([a, b]: readonly number[], t = r()) => a + (b - a) * t
  const head = (x: number, w: number, tall: number, flare: number): Head => {
    const crown = Math.min(0.6 * tall, w * (DOME + (CAP - DOME) * flare))
    return { x, half: w / 2, tall, joint: crown - tall, crown, anvil: flare, top: between([TOP_WIDTH, TOP_SLENDER], slender) }
  }
  const main = between([MAIN_WIDTH, MAIN_SLENDER], slender * (1 - anvil)) * s.w
  const heads = [head((r() - 0.5) * 0.2 * s.w, main, s.tall * (1 - (1 - SHEET_TOP) * anvil), anvil)]
  // The overshooting top rises out of the column as its anvil spreads; its draws are its own, so the shoulders stay put.
  if (anvil > 0) heads.push(head(heads[0].x + (above() - 0.5) * 2 * OFF * main * anvil, OVERSHOOT * main * anvil, s.tall * (1 + anvil) / 2, 0))
  let side = r() < 0.5 ? -1 : 1
  const many = Math.max(slender > 0.5 ? 2 : 1, Math.floor(r() * SHOULDERS) + 1)
  for (let n = 0; n < many; n++, side = -side) {
    const high = between(HIGH, (many - n - r() * 0.9) / many)
    heads.push(head(heads[0].x + side * between(OUT) * s.w, between(WIDE) * s.w, high * s.tall * (1 - UNDER_ANVIL * anvil), 0))
  }
  const left = Math.min(...heads.map((h) => h.x - h.half)), right = Math.max(...heads.map((h) => h.x + h.half))
  heads.push(head((left + right) / 2, 0.94 * (right - left), Math.min(0.5 * s.tall, BASE_RISE * s.w), 0))
  return heads
}

/** How far a head's anvil has spread at a height: a share of its half width. */
const flareAt = (h: Head, t: number) => ANVIL_FLARE * h.anvil * Math.max(0, (t - FLARE_FROM) / (1 - FLARE_FROM)) ** 1.4

/** A head's half width at a height. */
export function halfAt(h: Head, y: number): number {
  const t = Math.min(1, Math.max(0, -y / h.tall))
  return Math.max(0.5, h.half * (1 - (1 - h.top) * t * (1 - h.anvil) + flareAt(h, t)))
}

/** Vertical distance from the column, in crown radii. */
export const crownAt = (h: Head, y: number) => y < h.joint ? (h.joint - y) / h.crown : 0

/** How far a head's axis is carried downwind at a height (px): its anvil's spread, on the wind's side. */
export function carriedAt(h: Head, y: number, lean: number): number {
  return lean * DOWNWIND * h.half * flareAt(h, Math.min(1, Math.max(0, -y / h.tall)))
}
