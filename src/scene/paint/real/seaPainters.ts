import type { LampKind } from '../../model/layers/lamp'
import { lightOnly, type Painters } from '../contract'
import { paintRealCanopy } from './canopy'
import { paintRealWater } from './sea/water'

/** The kinds of the trees and the sea whose lamp the hand asks for. */
export const SEA_LAMP: readonly LampKind[] = []

/** The hand's own painters of the trees and the sea. */
export const SEA_PAINTERS: Partial<Painters> = {
  canopy: lightOnly(paintRealCanopy),
  water: lightOnly(paintRealWater),
}
