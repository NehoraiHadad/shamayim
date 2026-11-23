import { lightOnly, type Painters } from '../contract'
import { paintShafts, type Fibres } from '../shared/weather/curtain'
import { SHARED } from '../shared/painters'
import { paintEdge } from '../shared/weather/edge'
import { paintDrawnCells } from './cloudTower'
import { paintDrawnSheet } from './cloudSheet'
import { paintDrawnOutside } from './town'

/** A curtain of rain as a few long planes of heavier and lighter fall, no fibres. */
const PLANES: Fibres = { thick: 0.7, rate: 0.62, long: 0.06, octaves: 1, gather: 3 }

/** The drawn hand's painters: clouds, curtains and town as an illustrator masses them. */
export const DRAWN_PAINTERS: Painters = {
  ...SHARED,
  cloudSheet: { form: paintDrawnSheet },
  cloudCells: { form: paintDrawnCells },
  shafts: { form: (ctx, desc, env) => paintShafts(ctx, desc, env, PLANES) },
  edge: { form: (ctx, desc, env) => paintEdge(ctx, desc, env, PLANES) },
  outside: lightOnly(paintDrawnOutside),
}
