import { PLAIN_LIGHT } from '../../model/styleLight'
import { paintCloudCells } from '../cloudCells'
import { paintCloudSheet } from '../cloudSheet'
import { lightOnly, type Style } from '../contract'
import { paintShafts, type Fibres } from '../curtain'
import { paintOutside } from '../outside'
import { SHARED } from '../shared/painters'
import { paintEdge } from '../weather'

/** A curtain's fine fibres: long streaks of heavier fall, over three octaves of noise. */
const FIBRES: Fibres = { thick: 1.1, rate: 0.55, long: 0.16, octaves: 3, gather: 1 }

/** The real hand: the clouds and the town as the eye sees them from the place. */
export const REAL: Style = {
  id: 'real',
  light: PLAIN_LIGHT,
  painters: {
    ...SHARED,
    cloudSheet: { form: paintCloudSheet },
    cloudCells: { form: paintCloudCells },
    shafts: { form: (ctx, desc, env) => paintShafts(ctx, desc, env, FIBRES) },
    edge: { form: (ctx, desc, env) => paintEdge(ctx, desc, env, FIBRES) },
    outside: lightOnly(paintOutside),
  },
}
