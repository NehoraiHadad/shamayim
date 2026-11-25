import type { LayerOf, RGB } from '../../model/types'

/** How much sky light reaches the drawn town, its brighter side, and the colour at each tier. */
export type SkyForm = { strength: number; side: number; tiers: { top: RGB; face: RGB; foot: RGB }[] }

/** What this hand's light (`light/outsideLook.ts`) adds to the outside layer for its painter (`town.ts`): the desc's `own`. */
export type OwnOutside = {
  form: SkyForm
  /** The ink the near plane prints the town's ground in (`light/meet`): set where the plane cuts the town's seats. */
  ground?: RGB
}

/**
 * The sky's form over the town. A layer without it was lit for another hand: a fault of the caller's, loud in dev and
 * tests; a release paints no town.
 */
export function skyFormIn(desc: LayerOf<'outside'>): SkyForm | undefined {
  const form = (desc.own as OwnOutside | undefined)?.form
  if (!form && import.meta.env?.DEV) throw new Error(`layer "${desc.id}" was not lit for the drawn hand: it has no sky form`)
  return form
}
