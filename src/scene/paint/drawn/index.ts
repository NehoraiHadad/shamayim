import type { Painters } from '../index'
import { paintDrawnCells } from './cloudTower'
import { paintDrawnSheet } from './cloudSheet'

/**
 * The drawn hand (docs/design/ILLUSTRATION.md, the v1b stills): the layer kinds it paints its own way. Every other kind is
 * the real hand's. Same descs, same facts: only the painting differs.
 */
export const DRAWN: Painters = {
  cloudSheet: { form: paintDrawnSheet },
  cloudCells: { form: paintDrawnCells },
}
