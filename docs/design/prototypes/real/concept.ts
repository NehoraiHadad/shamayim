import { lightOnly, type Painters } from '../../../../src/scene/paint/contract'
import { paintShafts, type Fibres } from '../../../../src/scene/paint/shared/weather/curtain'
import { paintCanopy } from './canopy'
import { paintCloudSheet } from './cloudSheet'
import { paintCloudCells } from './cloudTower'
import { paintOutside } from './outside'
import { paintPlane } from './plane'
import { paintWater } from './sea'

/** A curtain of rain: long fine streaks gathered into heavier and lighter falls. */
const FIBRES: Fibres = { thick: 1.1, rate: 0.7, long: 0.14, octaves: 3, gather: 0.85 }

/** The concept's painters, laid over today's real ones. */
export const CONCEPT: Partial<Painters> = {
  cloudSheet: { form: paintCloudSheet },
  cloudCells: { form: paintCloudCells },
  shafts: { form: (ctx, desc, env) => paintShafts(ctx, desc, env, FIBRES) },
  plane: lightOnly(paintPlane),
  canopy: lightOnly(paintCanopy),
  water: lightOnly(paintWater),
  outside: lightOnly(paintOutside),
}
