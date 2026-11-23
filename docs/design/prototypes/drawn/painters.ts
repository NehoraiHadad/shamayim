import { lightOnly, type Painters } from '../../../../src/scene/paint/contract'
import { SHARED } from '../../../../src/scene/paint/shared/painters'
import { paintEdge } from '../../../../src/scene/paint/shared/weather/edge'
import { paintDrawnBodies } from './bodies'
import { paintCutCanopy } from './canopy'
import { paintCutCells } from './cells'
import { paintCutPlane } from './plane'
import { paintCutShafts } from './rain'
import { paintCutSheet } from './sheet'
import { paintDrawnSky } from './sky'
import { paintCutMarks, paintCutOutside } from './town'
import { paintCutWater } from './water'

const PLANES = { thick: 0.7, rate: 0.62, long: 0.06, octaves: 1, gather: 3 }

/** The prototype's painters: the drawn style's concept, one line a layer kind. */
export const DRAWN_PAINTERS: Painters = {
  ...SHARED,
  sky: { form: paintDrawnSky },
  bodies: { form: paintDrawnBodies },
  cloudSheet: { form: paintCutSheet },
  cloudCells: { form: paintCutCells },
  shafts: { form: paintCutShafts },
  edge: { form: (ctx, desc, env) => paintEdge(ctx, desc, env, PLANES) },
  plane: lightOnly(paintCutPlane),
  canopy: lightOnly(paintCutCanopy),
  water: lightOnly(paintCutWater),
  marks: lightOnly(paintCutMarks),
  outside: lightOnly(paintCutOutside),
}
