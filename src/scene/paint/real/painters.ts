import { AIR_PAINTERS } from './airPainters'
import { paintCloudCells } from './cloudCells'
import { paintCloudSheet } from './cloudSheet'
import { lightOnly, type Painters } from '../contract'
import { paintShafts, type Fibres } from '../shared/weather/curtain'
import { LAND_PAINTERS } from './landPainters'
import { paintOutside } from './outside'
import { SEA_PAINTERS } from './seaPainters'
import { SHARED } from '../shared/painters'
import { paintEdge } from '../shared/weather/edge'

/** A curtain's fine fibres: long streaks of heavier fall, over three octaves of noise. */
const FIBRES: Fibres = { thick: 1.1, rate: 0.55, long: 0.16, octaves: 3, gather: 1 }

/** The real hand's painters: the clouds and the town as the eye sees them from the place. */
export const REAL_PAINTERS: Painters = {
  ...SHARED,
  ...LAND_PAINTERS,
  ...SEA_PAINTERS,
  ...AIR_PAINTERS,
  cloudSheet: { form: paintCloudSheet },
  cloudCells: { form: paintCloudCells },
  shafts: { form: (ctx, desc, env) => paintShafts(ctx, desc, env, FIBRES) },
  edge: { form: (ctx, desc, env) => paintEdge(ctx, desc, env, FIBRES) },
  outside: lightOnly(paintOutside),
}
