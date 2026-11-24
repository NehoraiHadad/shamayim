import type { LayerOf, RGB } from '../../model/types'
import type { CloudSprite } from '../../model/cloudSprite'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { layTower } from '../shared/cloud/layTower'
import { whitened } from './cloudLight'
import { towerMass, type TowerPoint } from './towerMass'

/*
 * The field's towers in the drawn hand: one mass of round puffs each (`towerMass`), every puff lit on its top and shaded
 * at its foot, the whole tower lit on the light's side, dark under its base. Every tone is the model's; far first.
 * Pure: the desc and the scratch surfaces from `env`.
 */

/** The puffs' light: a lit cap's and a shaded foot's, with the sky's light alone; what the direct light adds to a cap. */
const CAP = 0.55, FOOT = 0.75, CAP_SUN = 0.8
/** The whole tower's lit side and shade side. */
const SIDE_LIT = 0.6, SIDE_SHADE = 0.4
/** The base's dark, and the share of the height it climbs. */
const BASE_DARK = 0.85, BASE_CLIMB = 0.34
/** The silver rim of a tower before the sun. */
const SILVER = 0.6

export function paintDrawnCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) layTower(ctx, sprite, x, y, env, (s) => {
    const mass = towerMass(s), tone = drawnTone(s, mass.depth)
    return { depth: mass.depth, reach: mass.reach, at: (px, py) => {
      const point = mass.at(px, py)
      return point && { a: point.alpha, rgb: tone(py, point) }
    } }
  })
}

function drawnTone(s: CloudSprite, depth: number): (y: number, p: TowerPoint) => RGB {
  const under = mix(s.shade, s.lit, 0.6 * s.glow), bright = whitened(s.lit), [tx, ty] = s.toward ?? [0, -1]
  const lit = Math.min(1, s.litA)
  return (y, p) => {
    const climb = (depth - y) / (depth + s.tall * BASE_CLIMB)
    const low = BASE_DARK * Math.max(0, 1 - climb) ** 1.3
    const side = tx * p.across * p.edge + Math.max(0, -ty) * 0.25 * p.edge
    const puff = p.light > 0 ? p.light * (CAP + CAP_SUN * lit) : p.light * FOOT
    const lift = puff * (1 - 0.6 * low) + lit * (side > 0 ? SIDE_LIT : SIDE_SHADE) * side
    const body = mix(s.body, under, low)
    const turned = lift > 0 ? mix(body, bright, Math.min(0.92, lift)) : mix(body, s.shade, Math.min(0.85, -lift * 1.1))
    return s.silver > 0.05 ? mix(turned, bright, SILVER * s.silver * p.edge ** 3) : turned
  }
}
