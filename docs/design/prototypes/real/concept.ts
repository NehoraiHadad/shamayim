import { lightOnly, type Painters } from '../../../../src/scene/paint/contract'
import { paintCanopy } from './canopy'
import { paintCloudSheet } from './cloudSheet'
import { paintCloudCells } from './cloudTower'
import { paintOutside } from './outside'
import { paintPlane } from './plane'
import { paintWater } from './sea'

/** The concept's painters, laid over today's real ones. */
export const CONCEPT: Partial<Painters> = {
  cloudSheet: { form: paintCloudSheet },
  cloudCells: { form: paintCloudCells },
  plane: lightOnly(paintPlane),
  canopy: lightOnly(paintCanopy),
  water: lightOnly(paintWater),
  outside: lightOnly(paintOutside),
}
