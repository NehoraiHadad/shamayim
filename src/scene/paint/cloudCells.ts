import type { LayerOf } from '../model/types'
import { paintCloud } from './clouds/index'
import type { Ctx2D, PaintEnv } from './hand'

/** The field's towers, far first (the model's order), each sprite at its cell's place. Pure: the desc alone. */
export function paintCloudCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) paintCloud(ctx, sprite, x, y, env)
}
