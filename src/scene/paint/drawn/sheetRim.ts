import { smoothstep } from '../../../domain/smoothstep'
import { DRAWN, onGrid, sizeAt, type SheetCap, type Spot } from './sheetCap'
import { nearAt, type Cut, type Eased } from './sheetEdge'

/*
 * The caps on a broken sheet's rim: a place near the edge stands on the edge itself, facing out of the mass, so that no edge
 * is left plain; large ones come together. On a foot they stand deep in it, shallow scallops with no light of their own. They
 * go with the cloud's air, and grow from nothing as a place nears the edge. Pure: the field, the cut and the place's numbers.
 */

/** Where a lattice's places are a rim's (its half pitch against the size): they come in over, let go over. */
export const RIMS = [0.26, 0.36, 0.52, 0.72] as const
/** How far from the edge (of the size) a place still stands on it. */
const BAND = 0.8
/** A cap's least and most size (of the size), how seldom it is large, and what its group leaves a small one. */
export const OUT = [0.3, 1] as const
const SELDOM = 1.3, GROUP = 0.25
/** How far in (of itself) a cap stands, at a top and at a foot, and how the edge faces (its way out, down) over that. */
const SET = [0.25, 0.64] as const, DOWN = [-0.2, 0.75] as const
/** How far (px) the way out is read over, and how clear it must be; the turn (rad) its own light goes over. */
const OUTWARD = 6, CLEAR = [0.3, 0.8] as const, TURNS = [0.9, 1.5] as const, SWAY = 0.3
/** How near (`nearAt`) feet are scalloped: far ones are level. */
const LEVEL = [0.25, 0.6] as const

/** The cap a place near the edge has; `group` (0 … 1) is shared with the places round it. */
export function rimAt({ f }: Eased, cut: Cut, { x: px, y: py, half, weight, seed }: Spot, random: () => number, group: () => number): SheetCap | null {
  const from = onGrid(f, px, py), size = sizeAt(f, from.gy), q = half / size
  const there = smoothstep(RIMS[0], RIMS[1], q) * (1 - smoothstep(RIMS[2], RIMS[3], q)) * weight
  if (!there) return null
  const { inside } = cut, away = inside(px, py), off = away / (BAND * size)
  if (off * off >= 1) return null
  const dx = inside(px - OUTWARD, py) - inside(px + OUTWARD, py), dy = inside(px, py - OUTWARD) - inside(px, py + OUTWARD), d = Math.sqrt(dx * dx + dy * dy)
  const clear = smoothstep(CLEAR[0], CLEAR[1], d / (2 * OUTWARD))
  if (!clear) return null
  const nx = dx / d, ny = dy / d, down = smoothstep(DOWN[0], DOWN[1], ny)
  const bold = random() ** SELDOM * (GROUP + (1 - GROUP) * group()), level = 1 - down * (1 - smoothstep(LEVEL[0], LEVEL[1], nearAt(f, from.gy)))
  const r = size * (OUT[0] + (OUT[1] - OUT[0]) * bold) * there * clear * level * (1 - off * off)
  if (r <= DRAWN) return null
  const turn = Math.atan2(nx, -ny), into = away - (SET[0] + (SET[1] - SET[0]) * down) * r, x = px + nx * into, y = py + ny * into
  return { x, y, r, ...onGrid(f, x, y), side: cut.sideAt(x, y), seed, tilt: turn + SWAY * (random() - 0.5), lit: 1 - smoothstep(TURNS[0], TURNS[1], Math.abs(turn)) }
}
