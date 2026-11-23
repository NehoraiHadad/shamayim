import { smoothstep } from '../../domain/smoothstep'
import type { CloudSprite } from './cloudSprite'
import { detailTile, tileAt } from './detailTile'

/*
 * A tower's body as one field (no puffs): a column narrowing upward under a domed crown, a mature Cb's top flaring into
 * its anvil, a flat base; its outline moved in and out by fractal noise, so the mass is always one piece with a soft,
 * lumpy edge. Sprite px, the origin at the middle of the near base edge, y down. Pure: the sprite alone.
 */

/** The column's top width against its base; how much wider an anvil's top is than the base. */
const TOP_WIDTH = 0.75, ANVIL_FLARE = 0.9
/** The height (0 base … 1 top) the anvil flares from. */
const FLARE_FROM = 0.55
/** The crown's depth against the width: a dome, or an anvil's flat cap. */
const DOME = 0.5, CAP = 0.2
/** The base's depth below the near edge at least, against the width: a flat underside seen nearly edge on. */
const BASE_DEPTH = 0.08
/** How far the noise moves the outline (against the half width): broad swells, then rounded cauliflower lumps. */
const SWELL = 0.6, LUMPS = 0.5
/** The noise tile's width against the tower's; its octaves: broad soft billows, no fine grain. */
const TILE_W = 1.7, OCTAVES = 2
/** How far the column's axis sways with height, against the half width: no straight pillar. */
const SWAY = 0.5
/** The softness of the edge against the half width: crisper on a growing crown than down the column. */
const SOFT = 0.42, SOFT_CROWN = 0.32
/** The share of the half width that is cloud whatever the noise: the column never parts. */
const CORE = 0.6
/** How far the noise thins the body from inside. */
const MOTTLE = 0.5
/** The share of the outline's noise read at the outline, the rest at the point itself (small overhangs). */
const EDGE = 0.35
/** Half widths out from the axis past which there is no cloud; the width (px) under which the lumps shrink. */
const REACH = 1.5, SMALL = 40
const NOISE_SEED = 4127

export interface TowerShape {
  /** The base's depth below the near edge, px. */
  depth: number
  /** The cloud at (x, y): its alpha, 0…1, and its relief there; null in open sky. */
  at(x: number, y: number): { a: number; bump: number } | null
  /** The surface's relief at (x, y), about 0: lumps stand out, creases lie in. */
  relief(x: number, y: number): number
}

export function towerShape(s: CloudSprite): TowerShape {
  const anvil = s.anvil ?? 0
  const tile = detailTile(NOISE_SEED, OCTAVES)
  const ou = (s.seed % 997) / 997, ov = (s.seed % 613) / 613
  const depth = Math.max(2, s.under, BASE_DEPTH * s.w)
  const crown = Math.min(0.6 * s.tall, s.w * (DOME + (CAP - DOME) * anvil))
  const joint = -(s.tall - crown)
  const half = (y: number) => {
    const t = Math.min(1, Math.max(0, -y / s.tall))
    return (s.w / 2) * (1 - (1 - TOP_WIDTH) * t * (1 - anvil)
      + ANVIL_FLARE * anvil * Math.max(0, (t - FLARE_FROM) / (1 - FLARE_FROM)) ** 1.5)
  }
  const relief = (x: number, y: number) => {
    const u = x / (TILE_W * s.w) + ou, v = y / (TILE_W * s.w) + ov
    const lump = 2 * Math.abs(tileAt(tile, u * 2 + 0.37, v * 2 + 0.71) - 0.5)
    return SWELL * (tileAt(tile, u, v) - 0.5) + LUMPS * (lump - 0.18)
  }
  const bumps = Math.min(1, s.w / SMALL)
  // What a row shares: its half width, its axis, how far past the column it is, its softness.
  let rowY = NaN, wide = 1, axis = 0, beyond = 0, knee = 0, soft = SOFT
  const toRow = (y: number) => {
    rowY = y
    wide = Math.max(0.5, half(y))
    axis = wide * SWAY * (tileAt(tile, ou, ov + y / (3 * s.w)) - 0.5) * Math.min(1, Math.max(0, -y / s.w))
    beyond = y > 0 ? y / depth : y < joint ? (joint - y) / crown : 0
    knee = y > 0 ? 0 : y < joint ? joint : y
    soft = SOFT + (SOFT_CROWN - SOFT) * smoothstep(0.5, 0.9, -y / s.tall) * (1 - anvil)
  }
  const at = (px: number, y: number) => {
    if (y !== rowY) toRow(y)
    const x = px - axis, across = x / wide, rho = Math.sqrt(across * across + beyond * beyond)
    if (rho > REACH) return null
    const bump = relief(x, y)
    const body = Math.min(1, 1 + MOTTLE * Math.min(0, bump))
    if (rho < CORE / 2) return { a: body, bump }
    // The outline moves by the noise partly read at the outline itself: one value out from the axis, so a lump stands out
    // of the mass more than it parts from it.
    const out = 1 / rho, edge = relief(x * out, knee + (y - knee) * out)
    const inside = Math.max(1 - rho + bumps * (EDGE * edge + (1 - EDGE) * bump), ((CORE - rho) / CORE) * soft * 2)
    const a = smoothstep(0, soft, inside) * body
    return a > 0 ? { a, bump } : null
  }
  return { depth, at, relief }
}
