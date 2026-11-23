import { smoothstep } from '../../domain/smoothstep'
import type { CloudSprite } from './cloudSprite'
import { detailTile, tileAt } from './detailTile'
import { halfAt, headsOf } from './towerHeads'

/*
 * A tower's body as one field (no puffs): its heads (`towerHeads`) grown together, over a flat base; the outline moved in
 * and out by fractal noise, so the mass is always one piece with a soft, lumpy edge. Sprite px, the origin at the middle
 * of the near base edge, y down. Pure: the sprite alone.
 */

/** The base's depth below the near edge at least, against the width: a flat underside seen nearly edge on. */
const BASE_DEPTH = 0.08
/** How flat the underside is: a power on the way down it (1 is a round bowl). */
const BASE_FLAT = 2.4
/** How far down the underside the heads round off into it. */
const HEAD_FOOT = 0.75
/** How far the noise moves the outline (against a head's half width): broad swells, then rounded cauliflower lumps. */
const SWELL = 0.5, LUMPS = 0.4
/** The share of that left on the underside: the base is flat, the lumps grow upward. */
const BASE_ROUGH = 0.2
/** The noise tile's width against the tower's; its octaves: broad soft billows, no fine grain. How much finer the lumps are. */
const TILE_W = 1.9, OCTAVES = 2, LUMP_RATE = 1.8
/** How far the column's axis sways with height, against the half width: no straight pillar. */
const SWAY = 0.5
/** The softness of the edge against the half width: crisper on a growing crown than down the column, an
 * anvil's ice fraying out. */
const SOFT = 0.42, SOFT_CROWN = 0.32, SOFT_ANVIL = 0.45
/** How much softer the underside of a near tower is: its base melts into the rain under it, no hard bowl. */
const SOFT_BASE = 0.5
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
const FAR = 70, FAR_SOFT = 0.15, FOOT = 0.4, FOOT_LEFT = 0.55
/** The width (px) from which and to which a tower is near: its lumps finer (a smaller tile, a higher rate) and standing
 *  out more, so a big cloud is not one smooth egg. */
const NEAR = [80, 170] as const, NEAR_SMALLER = 0.1, NEAR_FINER = 0.05, NEAR_ROUGHER = 0.08
/** Room past a head's own half width for the noise and the sway. */
const ROOM = 1.5
const NOISE_SEED = 4127

export interface TowerShape {
  /** The base's depth below the near edge, px. */
  depth: number
  /** How far from the middle the cloud can reach, px. */
  reach: number
  /** The cloud at (x, y): its alpha, 0…1, and its relief there; null in open sky. */
  at(x: number, y: number): { a: number; bump: number } | null
  /** The surface's relief at (x, y), about 0: lumps stand out, creases lie in. */
  relief(x: number, y: number): number
}

export function towerShape(s: CloudSprite): TowerShape {
  const far = 1 - Math.min(1, s.w / FAR), near = smoothstep(NEAR[0], NEAR[1], s.w)
  const rate = LUMP_RATE * (1 + NEAR_FINER * near), tileW = TILE_W * (1 - NEAR_SMALLER * near) * s.w
  const tile = detailTile(NOISE_SEED, far > 0 ? 1 : OCTAVES)
  const ou = (s.seed % 997) / 997, ov = (s.seed % 613) / 613
  const depth = Math.max(2, s.under, BASE_DEPTH * s.w)
  const heads = headsOf(s)
  const relief = (x: number, y: number) => {
    const u = x / tileW + ou, v = y / tileW + ov
    const lump = 2 * Math.abs(tileAt(tile, u * rate + 0.37, v * rate + 0.71) - 0.5)
    return (1 + NEAR_ROUGHER * near) * (SWELL * (tileAt(tile, u, v) - 0.5) + LUMPS * (lump - 0.18))
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
      at.axis = h.x + at.wide * sway
      at.beyond = y > 0 ? (n === heads.length - 1 ? (y / depth) ** BASE_FLAT : y / (HEAD_FOOT * depth)) : y < h.joint ? (h.joint - y) / h.crown : 0
      at.knee = y > 0 ? 0 : Math.max(y, h.joint)
    })
    const top = SOFT_CROWN + (SOFT_ANVIL - SOFT_CROWN) * (s.anvil ?? 0)
    soft = SOFT + (top - SOFT) * smoothstep(0.5, 0.9, -y / s.tall) + FAR_SOFT * far
      + SOFT_BASE * near * smoothstep(0, 0.8 * depth, y)
    foot = 1 - far * (1 - FOOT_LEFT) * (1 - smoothstep(0, FOOT, -y / s.tall))
    rough = 1 + (BASE_ROUGH - 1) * smoothstep(-0.15 * s.w, 0.3 * depth, y)
  }
  const at = (px: number, y: number) => {
    if (y !== rowY) toRow(y)
    let mass = -9, core = -9, main = row[0], rho = 9
    for (const h of row) {
      const across = (px - h.axis) / h.wide, r = Math.sqrt(across * across + h.beyond * h.beyond)
      const inside = 1 - r
      core = Math.max(core, CORE - r)
      if (inside > mass) { main = h; rho = r }
      const meet = Math.max(0, 1 - Math.abs(inside - mass) / CREASE)
      mass = Math.max(inside, mass) + (meet * meet * CREASE) / 4
    }
    if (mass < -REACH) return null
    const bump = relief(px, y)
    const body = foot * Math.min(1, 1 + MOTTLE * Math.min(0, bump))
    if (core > CORE / 2) return { a: body, bump }
    // The outline moves by the noise partly read at the outline itself: one value out from the axis, so a lump stands out
    // of the mass more than it parts from it.
    const out = 1 / Math.max(0.3, rho)
    const edge = relief(main.axis + (px - main.axis) * out, main.knee + (y - main.knee) * out)
    const inside = Math.max(mass + rough * (EDGE * edge + (1 - EDGE) * bump), (core / CORE) * soft * 2)
    const a = smoothstep(0, soft, inside) * body
    return a > 0 ? { a, bump } : null
  }
  // The noise and the sway carry the outline out by about a quarter of a head.
  const reach = Math.max(...heads.map((h) => Math.abs(h.x) + ROOM * Math.max(h.half, halfAt(h, -h.tall))))
  return { depth, reach, at, relief }
}
