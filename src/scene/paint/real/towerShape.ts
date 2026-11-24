import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import { detailTile, tileAt } from '../shared/base/detailTile'
import { domeTile } from './domeTile'
import { carriedAt, crownAt, halfAt, headsOf } from '../../model/towerHeads'

/*
 * A tower's body as one field (no puffs): its heads (`towerHeads`) grown together, over a flat base; the outline moved in
 * and out by fractal noise, so the mass is always one piece with a soft, lumpy edge. Sprite px, the origin at the middle
 * of the near base edge, y down. Pure: the sprite alone.
 */

/** The base's depth below the near edge at least, against the width: a flat underside seen nearly edge on. */
const BASE_DEPTH = 0.08
/** How flat the underside is: a power on the way down it (1 is a round bowl). */
const BASE_FLAT = 1.5
/** How far down the underside the heads round off into it. */
const HEAD_FOOT = 0.75
/** How far the noise moves the outline (against a head's half width): broad swells, then rounded cauliflower lumps. */
const SWELL = 0.45, LUMPS = 0.55
/** The share of that left on the underside: the base is flat, the lumps grow upward. */
const BASE_ROUGH = 0.2
/** The noise tile's width against the tower's; its octaves: broad soft billows, no fine grain. How much finer the lumps are. */
const TILE_W = 1.9, OCTAVES = 2, LUMP_RATE = 0.9
/** How far the column's axis sways with height, against the half width: no straight pillar. */
const SWAY = 0.5
/** The softness of the edge against the half width: crisper on a growing crown than down the column, an
 * anvil's ice fraying out. */
const SOFT = 0.42, SOFT_CROWN = 0.32, SOFT_ANVIL = 0.45
/** How much softer the underside of a near tower is: its base melts into the rain under it, no hard bowl. */
const SOFT_BASE = 0.6
/** How much of the underside is gone at its far edge: it fades into the rain and the haze below, with no drawn edge. */
const UNDER_FADE = 0.8
/** The depth it fades over, against the width, where the underside itself is thinner. */
const FADE_DEEP = 0.4
/** The share of a head's half width that is cloud whatever the noise: the column never parts. */
const CORE = 0.6
/** How far the noise thins the body from inside. */
const MOTTLE = 0.5
/** The share of the outline's noise read at the outline, the rest at the point itself (small overhangs). */
const EDGE = 0.45
/** How rounded the crease between two heads is, against their half width. */
const CREASE = 0.4
/** How far out of the mass (against the half width) the noise can still make cloud. */
const REACH = 0.45
/** The width (px) under which a tower is far: one broad octave, its edges softer by this much, its foot (a share of
 * its height) melting into the haze to this share. */
const FAR = 70, FAR_SOFT = 0.1, FOOT = 0.5, FOOT_LEFT = 0.15
/** The width (px) from which and to which a tower is near: its lumps finer (a smaller tile, a higher rate) and standing
 *  out more, so a big cloud is not one smooth egg. */
const NEAR = [80, 170] as const, NEAR_SMALLER = 0, NEAR_FINER = 0.3, NEAR_ROUGHER = 0.1
/** Room past a head's own half width for the noise and the sway. */
const ROOM = 1.5
const NOISE_SEED = 4127

/** The cloud at a point: its alpha, 0…1, its lumps' relief there, and how far its head's side faces: across (+ right), and up. */
export interface TowerPoint { a: number; bump: number; side: number; rise: number }

export interface TowerShape {
  /** The base's depth below the near edge, px. */
  depth: number
  /** How far from the middle the cloud can reach, px. */
  reach: number
  /** The cloud at (x, y); null in open sky. The point is reused. */
  at(x: number, y: number): TowerPoint | null
  /** The surface's relief at (x, y), about 0: lumps stand out, creases lie in. */
  relief(x: number, y: number): number
}

export function towerShape(s: CloudSprite): TowerShape {
  const far = 1 - Math.min(1, s.w / FAR), near = smoothstep(NEAR[0], NEAR[1], s.w)
  const rate = LUMP_RATE * (1 + NEAR_FINER * near), tileW = TILE_W * (1 - NEAR_SMALLER * near) * s.w
  const tile = detailTile(NOISE_SEED, far > 0 ? 1 : OCTAVES), domes = domeTile(NOISE_SEED)
  const ou = (s.seed % 997) / 997, ov = (s.seed % 613) / 613
  const bowl = Math.max(2, Math.min(s.bowl ?? s.under, s.under), BASE_DEPTH * s.w), straight = Math.max(0, s.under - bowl)
  const depth = straight + bowl
  const heads = headsOf(s)
  const relief = (x: number, y: number) => {
    const u = x / tileW + ou, v = y / tileW + ov
    const lump = tileAt(domes, u * rate + 0.37, v * rate + 0.71)
    return (1 + NEAR_ROUGHER * near) * (SWELL * (tileAt(tile, u, v) - 0.5) + LUMPS * lump)
  }
  // What a row shares: each head's half width, axis and distance past its column, and the row's softness and roughness.
  const row = heads.map(() => ({ wide: 1, axis: 0, beyond: 0, knee: 0 }))
  let rowY = NaN, soft = SOFT, rough = 1, foot = 1
  const toRow = (y: number) => {
    rowY = y
    const sway = SWAY * (tileAt(tile, ou, ov + y / (3 * s.w)) - 0.5) * Math.min(1, Math.max(0, -y / s.w))
    heads.forEach((h, n) => {
      const at = row[n]
      at.wide = halfAt(h, y)
      at.axis = h.x + at.wide * sway + carriedAt(h, y, s.lean)
      at.beyond = y > straight ? (n === heads.length - 1 ? ((y - straight) / bowl) ** BASE_FLAT : (y - straight) / (HEAD_FOOT * bowl))
        : crownAt(h, y)
      at.knee = y > 0 ? 0 : Math.max(y, h.joint)
    })
    const top = SOFT_CROWN + (SOFT_ANVIL - SOFT_CROWN) * (s.anvil ?? 0)
    soft = SOFT + (top - SOFT) * smoothstep(0.5, 0.9, -y / s.tall) + FAR_SOFT * far
      + SOFT_BASE * near * smoothstep(-0.1 * s.w, depth, y)
    foot = (1 - far * (1 - FOOT_LEFT) * (1 - smoothstep(0, FOOT, -y / s.tall))) * (1 - UNDER_FADE * smoothstep(Math.min(0, depth - FADE_DEEP * s.w), depth, y))
    rough = 1 + (BASE_ROUGH - 1) * smoothstep(straight - 0.3 * s.w, straight + 0.3 * bowl, y)
  }
  const point: TowerPoint = { a: 0, bump: 0, side: 0, rise: 0 }
  const at = (px: number, y: number) => {
    if (y !== rowY) toRow(y)
    let mass = -9, core = -9, main = row[0], rho = 9, side = 0, rise = 0
    const sense = y > 0 ? -1 : 1
    for (const h of row) {
      const across = (px - h.axis) / h.wide, r = Math.sqrt(across * across + h.beyond * h.beyond)
      const inside = 1 - r
      core = Math.max(core, CORE - r)
      if (inside > mass) { main = h; rho = r }
      const meet = Math.max(0, 1 - Math.abs(inside - mass) / CREASE)
      // Two heads' sides meet in their crease as their masses do.
      const own = inside > mass ? 1 - meet / 2 : meet / 2
      side += (across - side) * own
      rise += (sense * h.beyond - rise) * own
      mass = Math.max(inside, mass) + (meet * meet * CREASE) / 4
    }
    if (mass < -REACH) return null
    const bump = point.bump = relief(px, y)
    point.side = Math.max(-1, Math.min(1, side))
    point.rise = Math.max(-1, Math.min(1, rise))
    const body = foot * Math.min(1, 1 + MOTTLE * Math.min(0, bump))
    if (core > CORE / 2) {
      point.a = body
      return point
    }
    // The outline moves by the noise partly read at the outline itself: one value out from the axis, so a lump stands out
    // of the mass more than it parts from it.
    const out = 1 / Math.max(0.3, rho)
    const edge = relief(main.axis + (px - main.axis) * out, main.knee + (y - main.knee) * out)
    const inside = Math.max(mass + rough * (EDGE * edge + (1 - EDGE) * bump), (core / CORE) * soft * 2)
    point.a = smoothstep(0, soft, inside) * body
    return point.a > 0 ? point : null
  }
  // The noise and the sway carry the outline out by about a quarter of a head.
  const reach = Math.max(...heads.map((h) => Math.abs(h.x) + ROOM * Math.max(h.half, halfAt(h, -h.tall)) + Math.abs(carriedAt(h, -h.tall, s.lean))))
  return { depth, reach, at, relief }
}
