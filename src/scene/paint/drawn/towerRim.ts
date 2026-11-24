import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import { rng } from '../shared/base/core'
import type { TowerCap } from './towerCaps'
import type { TowerMass } from './towerMass'

/*
 * The caps on a tower's rim: at every step of its height one on each side, and across its crown, each on the edge of the
 * mass and leaning out of it. A small tower has none: its lattice makes its outline. Pure.
 */

/** The width between rim caps against the tower's, the tower's width (px) they grow in over, a cap's least and most size against the step. */
const EVERY = 0.12, OVER = [50, 120] as const, SIZE = [0.55, 1.15] as const
/** How far in (of its size) a cap stands from the edge, how far it strays (of the step), how far a side's leans out (rad). */
const INTO = 0.35, STRAY = 0.5, LEAN = 0.5
/** The looks for the edge in a step between caps; what keeps the rim's places apart in the seed. */
const LOOKS = 5, SEED = 6151, SIDE = 97

export function rimOf(s: CloudSprite, mass: TowerMass, solid: number): TowerCap[] {
  const grown = smoothstep(OVER[0], OVER[1], s.w), step = EVERY * s.w, out: TowerCap[] = []
  if (!grown) return out
  const place = (n: number, side: number, from: (at: number) => readonly [number, number], dx: number, dy: number, most: number) => {
    const seed = s.seed + SEED * (n + 1) + SIDE * side, random = rng(seed), [x0, y0] = from(n + STRAY * (random() - 0.5))
    const r = (SIZE[0] + (SIZE[1] - SIZE[0]) * random()) * step * grown, at = edgeFrom(mass, x0, y0, dx, dy, most, step / LOOKS, solid)
    const x = x0 + dx * (at + INTO * r), y = y0 + dy * (at + INTO * r), p = at < most ? mass.at(x, y) : null
    if (p) out.push({ x, y, r, tilt: -LEAN * dx + STRAY * (random() - 0.5), seed, across: p.across, light: p.light, edge: p.edge })
  }
  for (let n = 0; n * step < s.tall; n++) for (const side of [-1, 1]) place(n, side, (at) => [side * mass.reach, -at * step], -side, 0, mass.reach)
  for (let n = 0; n * step < 2 * mass.reach; n++) place(n, 0, (at) => [at * step - mass.reach, -s.tall * 1.1], 0, 1, s.tall)
  return out
}

/** How far along a way the mass begins, between two looks. */
function edgeFrom(mass: TowerMass, x: number, y: number, dx: number, dy: number, most: number, look: number, solid: number): number {
  for (let at = 0, before = 0; at < most; at += look) {
    const now = mass.at(x + dx * at, y + dy * at)?.alpha ?? 0
    if (now >= solid) return at - look * ((now - solid) / Math.max(1e-6, now - before))
    before = now
  }
  return most
}
