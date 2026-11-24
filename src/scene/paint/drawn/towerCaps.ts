import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import { rng } from '../shared/base/core'
import type { Cap } from './cloudCaps'
import { OVER_TOP, UNDER_FOOT, type TowerMass } from './towerMass'
import { rimOf } from './towerRim'

/*
 * Where a tower's caps stand: on two lattices of the tower's own width, each cap inscribed in the mass and stepping a little
 * over its edge, so that they make its outline too; and along its rim, so that no plain edge is left. They stand by the tower, so they grow as it grows and never jump. Pure.
 */

export interface TowerCap extends Cap { across: number; light: number; edge: number }

/** The lattices: the width between caps against the tower's, the tower's width (px) they grow in over, how near the edge they stand, the share kept inside. */
const TIERS = [{ every: 0.17, over: null, edge: 0, inside: 1 }, { every: 0.095, over: [90, 220], edge: 0.5, inside: 0.35 }] as const
/** How far a cap strays from its place (against the lattice), its least and most size, how seldom it is large. */
const STRAY = 0.9, SIZE = [0.45, 1.2] as const, SELDOM = 1.4
/** The most a cap steps out of the mass (of its size), and the mass's half width against the tower's. */
const OVER = 0.4, HALF = 0.38
/** The share of places left empty, and how high (of the tower's height) the caps begin and a foot's scallops end. */
const QUIET = 0.08, FROM = [0.03, 0.08] as const
/** A cap comes up over this much of the mass and of its edge, and is drawn from this size (px); its reach against its size. */
const EASE = 0.25, NEAR = 0.15, LEAST = 1.8, REACH = 1.25
/** How far a cap leans out of its mass, and at random (rad). */
const LEAN = 0.45, SWAY = 0.3
/** A foot's scallop against its place's size, and its flatness. */
const SCALLOP = 0.75
export const FLAT = 0.4
/** Keeps a lattice's places apart in the seed. */
const ACROSS = 7919, UP = 104_729, TIER = 31, FIRST = 512

/** The room a cap at a height has under the layer's top. */
const roomAt = (s: CloudSprite, y: number) => (y + s.tall + OVER_TOP) / REACH

/** The caps, far to near, and the scallops of the foot. */
export function towerCaps(s: CloudSprite, mass: TowerMass, solid: number): { caps: TowerCap[]; foot: Cap[] } {
  const caps: TowerCap[] = [], foot: Cap[] = []
  TIERS.forEach(({ every, over, edge, inside }, tier) => {
    const step = every * s.w, grown = over ? smoothstep(over[0], over[1], s.w) : 1
    if (grown <= 0) return
    const wide = Math.ceil(mass.reach / step), rows = Math.ceil((s.tall * 1.1) / step), lowest = tier ? 0 : Math.ceil(mass.depth / step)
    for (let j = -lowest; j <= rows; j++) for (let i = -wide; i <= wide; i++) {
      const seed = s.seed + (i + FIRST) * ACROSS + (j + FIRST) * UP + tier * TIER, random = rng(seed)
      const x = (i + STRAY * (random() - 0.5)) * step, y = -(j + STRAY * (random() - 0.5)) * step
      const size = (SIZE[0] + (SIZE[1] - SIZE[0]) * random() ** SELDOM) * step * grown, keep = random(), sway = random() - 0.5
      const p = mass.at(x, y)
      if (!p || keep < QUIET) continue
      const come = smoothstep(solid, solid + EASE, p.alpha) * (keep > inside ? smoothstep(edge - NEAR, edge, p.edge) : 1), high = smoothstep(...FROM, -y / s.tall)
      const whole = Math.min(size, (1 - p.edge) * HALF * s.w + OVER * size), r = Math.min(whole * come * high, roomAt(s, y)), tilt = LEAN * p.across * p.edge + SWAY * sway
      if (r > LEAST) caps.push({ x, y, r, tilt, seed, across: p.across, light: p.light, edge: p.edge })
      const low = tier ? 0 : Math.min(SCALLOP * size * come * (1 - high), (Math.max(mass.depth, s.under) + UNDER_FOOT - y) / FLAT)
      if (low > LEAST) foot.push({ x, y, r: low, tilt, seed })
    }
  })
  for (const rim of rimOf(s, mass, solid)) {
    const r = Math.min(rim.r * smoothstep(...FROM, -rim.y / s.tall), roomAt(s, rim.y))
    if (r > LEAST) caps.push({ ...rim, r })
  }
  caps.sort((a, b) => a.y - 0.2 * a.r - (b.y - 0.2 * b.r))
  return { caps, foot }
}
