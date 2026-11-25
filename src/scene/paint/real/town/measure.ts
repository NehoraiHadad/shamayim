import type { MarkMeasure } from '../../shared/land/townGround'
import { TEXELS } from '../land/texels'

/*
 * The town's marks on its ground as the real hand measures them: a lane and a yard never under the near plane's texel (a
 * lane narrower than one is lost in it), most rows with a lane and most gaps trodden, so the ground reads lived on where
 * the houses stand; near a third of the houses with a small tree before them, its crown free to stand over the
 * neighbour's wall. The plane (its ground) and the town's fronts (its trees) take the same measure, so a garden's tree
 * stands in its garden.
 */
export const REAL_MARKS: MarkMeasure = { lane: 1.8 * TEXELS.near, yard: 1.5 * TEXELS.near, rows: 0.75, many: 14, yards: 0.6, fronts: 0.3, past: 0.18 }
