import { paintShafts, type Fibres } from '../curtain'
import type { Painters } from '../index'
import { paintEdge } from '../weather'
import { paintDrawnCells } from './cloudTower'
import { paintDrawnSheet } from './cloudSheet'
import { paintDrawnOutside } from './town'

/** A curtain of rain as a few long planes of heavier and lighter fall, no fibres. */
export const PLANES: Fibres = { thick: 0.7, rate: 0.62, long: 0.06, octaves: 1, gather: 3 }

/**
 * The drawn hand (docs/design/ILLUSTRATION.md, the v1b stills): the layer kinds it paints its own way. Every other kind is
 * the real hand's. Same descs, same facts: only the painting differs.
 */
export const DRAWN: Painters = {
  cloudSheet: { form: paintDrawnSheet },
  cloudCells: { form: paintDrawnCells },
  shafts: { form: (ctx, desc, env) => paintShafts(ctx, desc, env, PLANES) },
  edge: { form: (ctx, desc, env) => paintEdge(ctx, desc, env, PLANES) },
  outside: { form: () => {}, light: paintDrawnOutside, formless: () => true },
}
