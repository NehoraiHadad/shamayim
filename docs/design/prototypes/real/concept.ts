import type { Painters } from '../../../../src/scene/paint/contract'
import { paintCloudSheet } from './cloudSheet'

/** The concept's painters: what it paints anew, over the real hand's. */
export const CONCEPT: Partial<Painters> = {
  cloudSheet: { form: paintCloudSheet },
}
