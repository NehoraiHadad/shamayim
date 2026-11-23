import type { CloudSprite } from '../../model/cloudSprite'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { layTower } from '../shared/cloud/layTower'
import { towerShape } from './towerShape'
import { towerTone } from './towerTone'

/*
 * A tower (Cu con, Cg, Cb) in the sheets' soft hand (the owner's call, 22 Nov: soft and translucent, not cardboard): one
 * mass, its alpha from `towerShape` and its colour from `towerTone`, laid as a raster on a scratch sheet and stretched
 * with the canvas's own smoothing. No puffs, outlines or filter; seeded by the cell. Pure: the sprite, its place and the
 * scratch surface from `env`.
 */

export function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  layTower(c, s, x, y, env, (sprite) => {
    const shape = towerShape(sprite), tone = towerTone(sprite, shape)
    return { depth: shape.depth, reach: shape.reach, at: (px, py) => {
      const here = shape.at(px, py)
      return here && { a: here.a, rgb: tone(px, py, here.bump) }
    } }
  })
}
