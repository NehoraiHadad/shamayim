//# allFunctionsCalledOnLoad
import { isField, isIcon, type GlyphKind } from '../../world/glyphSpecs'
import { seeded } from '../../data/landmarks/hash'

/** Landmark icons keep their drawn orientation. Fields follow their sampled ground. */
export function glyphHand(kind: GlyphKind, seed: number): 1 | -1 {
  if (isIcon(kind) || isField(kind)) return 1
  return seeded(seed * 13 + 5)() < 0.5 ? -1 : 1
}
