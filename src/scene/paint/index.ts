import type { LayerDesc, LayerKind, LayerOf } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'
import { paintFarCities } from './farCities'
import { paintPlane, paintPlaneLight } from './planes'
import { paintSky } from './sky'
import { paintWater } from './water'

export { HAND, type Ctx2D, type Hand, type PaintEnv, type Scratch } from './hand'

/** A layer's painters: its form, and its light part when it has one (§1d, the scrub split). */
export interface Painter<K extends LayerKind = LayerKind> {
  form: (ctx: Ctx2D, desc: LayerOf<K>, env: PaintEnv) => void
  light?: (ctx: Ctx2D, desc: LayerOf<K>, env: PaintEnv) => void
  /**
   * The form draws nothing while there is a light part (a layer that is all light: the far towns, the water but for its
   * datum): the surface lays the light canvas alone, sparing a blit of an empty canvas every frame.
   */
  formless?: (desc: LayerOf<K>) => boolean
}

type Painters = { [K in LayerKind]?: Painter<K> }

/** The form of a layer that is all light (water, far towns): only its place, nothing drawn. */
const paintNothing = () => {}

/** One painter per layer kind; kinds without one yet (drawn from C2 on) are skipped. */
export const PAINTERS: Painters = {
  sky: { form: paintSky },
  plane: { form: paintPlane, light: paintPlaneLight },
  water: { form: paintNothing, light: paintWater, formless: () => true },
  farCities: { form: paintNothing, light: paintFarCities, formless: () => true },
}

export function painterOf(desc: LayerDesc): Painter | undefined {
  return PAINTERS[desc.kind] as Painter | undefined
}
