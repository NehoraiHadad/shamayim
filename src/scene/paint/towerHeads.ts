import { smoothstep } from '../../domain/smoothstep'
import { rng } from './core'
import type { CloudSprite } from './cloudSprite'

/*
 * The heads a tower is made of, as the painter's field reads them: the main column under its crown, and lower shoulders
 * beside it that grew from the same base. Their number, place, width and height are the cell's own (its seed), so no two
 * towers share an outline. Sprite px, the origin at the middle of the near base edge, y down. Pure: the sprite alone.
 */

/** The main column's width against the cell's, as shoulders stand beside it; its top's width against its base. */
const MAIN_WIDTH = 0.8, TOP_WIDTH = 0.8
/** The shoulders: how many at most, their distance from the column and width (of the cell's), their height (of the tower's). */
const SHOULDERS = 3, OUT = [0.18, 0.3], WIDE = [0.4, 0.62], HIGH = [0.35, 0.88]
/** A slender tower's shoulders stand this much farther out and wider: a heap of turrets, not a pillar (the sky is drawn
 *  taller than it is wide, so a true column looks like one). Slender from this height to that, against the width. */
const SPREAD = 0.3, BROADER = 0.45, SLENDER = [1.6, 3] as const
/** How much lower a shoulder stands under an anvil: the mature column rises clear of them. */
const UNDER_ANVIL = 0.35
/** How much wider an anvil's top is than the column; the height (0 base … 1 top) it flares from. */
const ANVIL_FLARE = 1.6, FLARE_FROM = 0.58
/** How high the shared base rises, against the cell's width. */
const BASE_RISE = 0.3
/** The crown's depth against the column's width: a dome, or an anvil's flat cap. */
const DOME = 0.6, CAP = 0.22

export interface Head {
  /** The column's middle, its half width at the base and its height. */
  x: number; half: number; tall: number
  /** Where the crown begins (y) and how deep it is. */
  joint: number; crown: number
  /** 0…1: how far its top spreads into an anvil. */
  anvil: number
}

/** The main column first, then its shoulders, last the base they all stand on (the whole underside is its own). */
export function headsOf(s: CloudSprite): Head[] {
  const r = rng(s.seed ^ 0x51ed), anvil = s.anvil ?? 0
  const slender = smoothstep(SLENDER[0], SLENDER[1], s.tall / s.w)
  const between = ([a, b]: readonly number[]) => a + (b - a) * r()
  const head = (x: number, w: number, tall: number, flare: number): Head => {
    const crown = Math.min(0.6 * tall, w * (DOME + (CAP - DOME) * flare))
    return { x, half: w / 2, tall, joint: crown - tall, crown, anvil: flare }
  }
  const heads = [head((r() - 0.5) * 0.2 * s.w, MAIN_WIDTH * s.w, s.tall, anvil)]
  let side = r() < 0.5 ? -1 : 1
  for (let n = Math.floor(r() * SHOULDERS) + 1; n > 0; n--, side = -side) {
    heads.push(head(heads[0].x + side * between(OUT) * (1 + SPREAD * slender) * s.w,
      between(WIDE) * (1 + BROADER * slender) * s.w, between(HIGH) * s.tall * (1 - UNDER_ANVIL * anvil), 0))
  }
  const left = Math.min(...heads.map((h) => h.x - h.half)), right = Math.max(...heads.map((h) => h.x + h.half))
  heads.push(head((left + right) / 2, 0.94 * (right - left), Math.min(0.5 * s.tall, BASE_RISE * s.w), 0))
  return heads
}

/** A head's half width at a height. */
export function halfAt(h: Head, y: number): number {
  const t = Math.min(1, Math.max(0, -y / h.tall))
  return Math.max(0.5, h.half * (1 - (1 - TOP_WIDTH) * t * (1 - h.anvil)
    + ANVIL_FLARE * h.anvil * Math.max(0, (t - FLARE_FROM) / (1 - FLARE_FROM)) ** 1.4))
}
