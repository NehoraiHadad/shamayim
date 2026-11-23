//# allFunctionsCalledOnLoad
import type { Normal } from '../../world/livingLight'
import type { WorldState } from '../../world/types'
import type { LandIrradiance } from './landIrradiance'
import type { outsideShape } from './outsideShape'
import type { OutsideItem, Plain, SceneBox, Shine, Tones } from './types'

/** How much of the sky's and the ground's light a face keeps at twilight. */
export type TwilightScreen = (n: Normal) => { sky: number; ground: number }

/** What the model knows of the place in view when a hand lights it its own way. */
export interface OutsideFacts {
  world: WorldState
  box: SceneBox
  shape: ReturnType<typeof outsideShape>
  /** Screen px per scene unit. */
  sx: number
}

/** A hand's own light of the place in view. */
export interface OutsideLook {
  tiers: Tones[]
  items: OutsideItem[]
  shine: Shine
  /** What the layer's light key carries of it. */
  key: string
  /** Data for this hand's painter alone, the desc's `own`: neither the model nor a shared painter reads it. */
  own?: Plain
}

/** A hand's light, where it does not take the model's own. Passed as a value: the model knows no hand. */
export interface StyleLight {
  /** Tells the hands' light keys apart. */
  key: string
  screen?: (irr: LandIrradiance) => TwilightScreen
  outside?: (facts: OutsideFacts) => OutsideLook
}

/** The model's own light. One object, so whoever takes it shares one set of caches. */
export const PLAIN_LIGHT: StyleLight = { key: 'plain' }
