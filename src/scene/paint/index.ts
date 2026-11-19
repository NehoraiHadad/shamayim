import type { LayerDesc, LayerKind, LayerOf } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'
import { paintPlane, paintPlaneLight } from './planes'
import { paintSky } from './sky'

export { HAND, type Ctx2D, type Hand, type PaintEnv, type Scratch } from './hand'

/** A layer's painters: its form, and its light part when it has one (§1d, the scrub split). */
export interface Painter<K extends LayerKind = LayerKind> {
  form: (ctx: Ctx2D, desc: LayerOf<K>, env: PaintEnv) => void
  light?: (ctx: Ctx2D, desc: LayerOf<K>, env: PaintEnv) => void
}

type Painters = { [K in LayerKind]?: Painter<K> }

/** One painter per layer kind; kinds without one yet (drawn from C2 on) are skipped. */
export const PAINTERS: Painters = {
  sky: { form: paintSky },
  plane: { form: paintPlane, light: paintPlaneLight },
}

export function painterOf(desc: LayerDesc): Painter | undefined {
  return PAINTERS[desc.kind] as Painter | undefined
}
