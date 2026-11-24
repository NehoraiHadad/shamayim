import type { LampKind } from '../../model/layers/lamp'
import { lightOnly, type Painters } from '../contract'
import { paintRealPlane } from './land/plane'

/** The kinds of the land whose lamp the hand asks for. */
export const LAND_LAMP: readonly LampKind[] = ['plane']

/** The hand's own painters of the land. */
export const LAND_PAINTERS: Partial<Painters> = { plane: lightOnly(paintRealPlane) }
