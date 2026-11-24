import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import { rng } from '../shared/base/core'
import type { Cap } from './cloudCaps'
import type { TowerMass } from './towerMass'

/*
 * Where a tower's caps stand: on two lattices of the tower's own width, each cap inscribed in the mass and stepping a little
 * over its edge, so that they make its outline too. They stand by the tower, so they grow as it grows and never jump. Pure.
 */

export interface TowerCap extends Cap { across: number; light: number }

/** The lattices: the width between caps against the tower's, the tower's width (px) they grow in over, how near the edge they stand, the share kept inside. */
const TIERS = [{ every: 0.19, over: null, edge: 0, inside: 1 }, { every: 0.1, over: [90, 220], edge: 0.5, inside: 0.3 }] as const
/** How far a cap strays from its place (against the lattice), its least and most size, how seldom it is large. */
const STRAY = 0.9, SIZE = [0.4, 1.15] as const, SELDOM = 1.4
/** The most a cap steps out of the mass (of its size), and the mass's half width against the tower's. */
const OVER = 0.45, HALF = 0.38
/** The share of places left empty, and how high (of the tower's height) the caps begin. */
const QUIET = 0.14, FROM = 0.05
/** How far a cap leans out of its mass, and at random (rad). */
const LEAN = 0.45, SWAY = 0.3
/** A foot's scallop against its place's size. */
const SCALLOP = 0.75
/** Keeps a lattice's places apart in the seed. */
const ACROSS = 7919, UP = 104_729, TIER = 31, FIRST = 512

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
      if (!p || p.alpha < solid || keep < QUIET || (p.edge < edge && keep > inside)) continue
      const r = Math.min(size, (1 - p.edge) * HALF * s.w + OVER * size), tilt = LEAN * p.across * p.edge + SWAY * sway
      if (-y > FROM * s.tall) caps.push({ x, y, r, tilt, seed, across: p.across, light: p.light })
      else if (!tier) foot.push({ x, y, r: SCALLOP * size, tilt, seed })
    }
  })
  caps.sort((a, b) => a.y - 0.2 * a.r - (b.y - 0.2 * b.r))
  return { caps, foot }
}
