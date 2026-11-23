import type { LayerOf } from '../../model/types'
import { paintTower } from './cloudTower'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'

/** The field's towers, far first (the model's order), each at its cell's place. Pure: the desc and the scratch surfaces from `env`. */
export function paintCloudCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) paintTower(ctx, sprite, x, y, env)
}
