import type { LampKind } from '../../model/layers/lamp'
import type { Painters } from '../contract'

/** The kinds of the land whose lamp the hand asks for. */
export const LAND_LAMP: readonly LampKind[] = []

/** The hand's own painters of the land. */
export const LAND_PAINTERS: Partial<Painters> = {}
