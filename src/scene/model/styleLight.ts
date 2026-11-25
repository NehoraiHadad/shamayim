import type { Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import type { FallTile } from './fallTile'
import type { LandIrradiance } from './landIrradiance'
import type { LampKind } from './layers/lamp'
import type { outsideShape } from './outsideShape'
import type { LayerOf, OutsideItem, Plain, SceneBox, Shine, Tones } from './types'

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

/**
 * How a hand paints the sky's colours: a pure function of the colour (sRGB 0-1, and so its answer) and the sun's true
 * altitude (deg). The model asks it once for each colour it makes of the sky (`skyTone.ts`), never for the light on things.
 */
export interface SkyGrade {
  /** The grade's identity in the cache keys: another function or other numbers, another key. */
  key: string
  colour: (rgb: RGB, sunAltitude: number) => RGB
}

/** A hand's light, where it does not take the model's own. Passed as a value: the model knows no hand. */
export interface StyleLight {
  /** Tells the hands' light keys apart. */
  key: string
  screen?: (irr: LandIrradiance) => TwilightScreen
  lamp?: readonly LampKind[]
  /** Asks for the cloud sheets' places in their own air (`CloudAir`). */
  cloudAir?: boolean
  /** Asks for the near rain and snow on a larger tile. */
  fallTile?: FallTile
  outside?: (facts: OutsideFacts) => OutsideLook
  /**
   * The place and the near plane it stands on, met: a hand that prints the two as one block (the town's ground in the
   * plane's ink, the houses' seats cut in the plane) adds to each what it reads of the other, in their `own` and keys.
   */
  meet?: (outside: LayerOf<'outside'>, near: LayerOf<'plane'>) => { outside: LayerOf<'outside'>; near: LayerOf<'plane'> }
  sky?: { grade?: SkyGrade }
}

/** The model's own light. One object, so whoever takes it shares one set of caches. */
export const PLAIN_LIGHT: StyleLight = { key: 'plain' }
