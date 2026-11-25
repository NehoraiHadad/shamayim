import type { LayerOf } from '../../../model/types'

/** A texel (px) of each plane: finer near, where its marks are seen. */
export const TEXELS: Record<LayerOf<'plane'>['plane'], number> = { back: 3, far: 2, near: 1.5 }
