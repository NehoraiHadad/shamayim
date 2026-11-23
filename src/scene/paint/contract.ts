import type { StyleLight } from '../model/styleLight'
import type { LayerKind, LayerOf } from '../model/types'
import type { Ctx2D, PaintEnv } from './shared/base/hand'

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

/** Every layer kind a painter paints: all but the contrails, which the surface lays itself. */
export type PaintedKind = Exclude<LayerKind, 'contrail'>

/** A style's painters, one for every painted kind: a kind left out is a type error. */
export type Painters = { readonly [K in PaintedKind]: Painter<K> }

/** The kinds every style paints its own way: the shared painters hold none of them. */
export type OwnKind = 'cloudSheet' | 'cloudCells' | 'shafts' | 'edge' | 'outside'

/** The kinds every style paints with the same painter. */
export type SharedPainters = Omit<Painters, OwnKind>

/** One hand of the scene: its id in the registry (`styles.ts`), its painters and its light. Same world, same facts: only the hand differs. */
export interface Style {
  readonly id: string
  readonly painters: Painters
  /** The model's own light (`PLAIN_LIGHT`), or where the hand lights things its own way. */
  readonly light: StyleLight
}

/** The form of a layer that is all light (water, far towns): only its place, nothing drawn. */
const paintNothing = () => {}
const always = () => true

/** A layer that is all light: its light part over a form that draws nothing. */
export function lightOnly<K extends LayerKind>(light: NonNullable<Painter<K>['light']>): Painter<K> {
  return { form: paintNothing, light, formless: always }
}
