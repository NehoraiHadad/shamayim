import type { Style } from './contract'
import { DRAWN } from './drawn'
import type { SceneStyle } from './painters'
import { REAL } from './real'

/** The scene's styles whole, painters and light: one world, one model, several hands. The ids are `painters.ts`'s. */
export const STYLES: Readonly<Record<SceneStyle, Style>> = {
  real: REAL,
  drawn: DRAWN,
}
