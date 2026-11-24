import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import { carriedAt, halfAt, headsOf } from '../../model/towerHeads'
import { billows } from './billows'

/*
 * A tower's body in the drawn hand: the model's heads (`towerHeads`: the cell's column, shoulders, base and
 * anvil) grown together, its outline standing on round puffs. Sprite px, the origin at the middle of the near base edge,
 * y down. Pure: the sprite alone.
 */

/** The base's depth against the width at least, how flat it is, and how far down it the heads round off. */
const BASE_DEPTH = 0.08, BASE_FLAT = 1.6, HEAD_FOOT = 0.75
/** How rounded the crease between two heads is, against their half width. */
const CREASE = 0.4
/** A puff's width against the tower's, what a far one's adds (fewer, calmer), and at least (px); its height against a
 *  sheet puff's. */
const PUFF = 0.3, PUFF_FAR = 0.14, PUFF_MIN = 7, PUFF_TALL = 1.5
/** The width (px) of a sheet puff (`billows`): its scale here. */
const SHEET_PUFF = 72
/** How far the puffs move the outline, against a head's half width; on the flat base; the small heads' weight. */
const HEADS = 0.6, HEADS_BASE = 0.12, SMALL = 0.28
/** How far inside the outline the column is cloud whatever the puffs: it never parts. */
const CORE = [0.2, 0.6] as const
/** The edge's softness: a growing crown's, the column's and what a far one's adds (its air), an anvil's ice, and what a near base adds. */
const SOFT_CROWN = 0.2, SOFT = 0.3, SOFT_FAR = 0.4, SOFT_ANVIL = 0.42, SOFT_BASE = 0.5
/** The underside's fade at its far edge, a dry one's and a raining one's, and the depth against the width it runs over. */
const UNDER_FADE = { dry: 0.35, rains: 0.8 } as const, FADE_DEEP = 0.35
/** A far tower's width (px), and the share of its height its foot melts into the haze over, to this share. */
const FAR = 70, FOOT = 0.6, FOOT_LEFT = 0.1
/** How far (px) the print may stand over the model's top, and under its near edge: the layer's own room. */
export const OVER_TOP = 10, UNDER_FOOT = 6
/** Room past a head's half width for the puffs. */
const ROOM = 1.4

interface TowerPoint {
  alpha: number
  /** The puff's light (+ its lit top). */
  light: number
  /** −1 … 1 across the mass, and how near the outline (0 middle … 1 edge). */
  across: number; edge: number
}

export interface TowerMass {
  depth: number; reach: number
  at(x: number, y: number): TowerPoint | null
  /** The share of the tower left at a height by the air and the rain at its foot. */
  footAt(y: number): number
}

export function towerMass(s: CloudSprite): TowerMass {
  const far = 1 - Math.min(1, s.w / FAR), near = smoothstep(80, 170, s.w)
  const bowl = Math.max(2, Math.min(s.bowl ?? s.under, s.under), BASE_DEPTH * s.w), straight = Math.max(0, s.under - bowl)
  const depth = straight + bowl, heads = headsOf(s), puff = billows(s.seed)
  const size = Math.max(PUFF_MIN, (PUFF + PUFF_FAR * far) * s.w) / SHEET_PUFF
  const row = heads.map(() => ({ wide: 1, axis: 0, beyond: 0 }))
  let rowY = NaN, soft = SOFT, rough = HEADS
  const footAt = (y: number) => (1 - far * (1 - FOOT_LEFT) * (1 - smoothstep(0, FOOT, -y / s.tall)))
    * (1 - (s.rains ? UNDER_FADE.rains : UNDER_FADE.dry) * smoothstep(Math.min(0, depth - FADE_DEEP * s.w), depth, y))
  const toRow = (y: number) => {
    rowY = y
    heads.forEach((h, n) => {
      row[n].wide = halfAt(h, y)
      row[n].axis = h.x + carriedAt(h, y, s.lean)
      row[n].beyond = y > straight ? (n === heads.length - 1 ? ((y - straight) / bowl) ** BASE_FLAT : (y - straight) / (HEAD_FOOT * bowl))
        : y < h.joint ? (h.joint - y) / h.crown : 0
    })
    const up = -y / s.tall, top = SOFT_CROWN + (SOFT_ANVIL - SOFT_CROWN) * (s.anvil ?? 0)
    soft = SOFT_FAR * far * (1 - up) + SOFT + (top - SOFT) * smoothstep(0.4, 0.85, up) + SOFT_BASE * near * smoothstep(-0.1 * s.w, depth, y)
    rough = HEADS + (HEADS_BASE - HEADS) * smoothstep(straight - 0.3 * s.w, straight + 0.3 * bowl, y)
  }
  const out: TowerPoint = { alpha: 0, light: 0, across: 0, edge: 0 }
  const at = (x: number, y: number) => {
    if (y !== rowY) toRow(y)
    let mass = -9, across = 0
    for (const h of row) {
      const a = (x - h.axis) / h.wide, inside = 1 - Math.sqrt(a * a + h.beyond * h.beyond)
      if (inside > mass) across = a
      const meet = Math.max(0, 1 - Math.abs(inside - mass) / CREASE)
      mass = Math.max(inside, mass) + (meet * meet * CREASE) / 4
    }
    if (mass < -HEADS) return null
    const p = puff(x / size, y / (size * PUFF_TALL))
    out.alpha = Math.max(smoothstep(0, soft, mass + rough * (p.high + SMALL * p.small)), smoothstep(CORE[0], CORE[1], mass))
    out.alpha *= smoothstep(s.tall + OVER_TOP, s.tall, -y) * smoothstep(Math.max(depth, s.under) + UNDER_FOOT, s.under, y)
    out.light = p.light
    out.across = Math.max(-1, Math.min(1, across))
    out.edge = 1 - Math.min(1, Math.max(0, mass))
    return out.alpha > 0.004 ? out : null
  }
  const reach = Math.max(...heads.map((h) => Math.abs(h.x) + ROOM * Math.max(h.half, halfAt(h, -h.tall)) + Math.abs(carriedAt(h, -h.tall, s.lean))))
  return { depth, reach, at, footAt }
}
