import type { StyleLight } from '../../model/styleLight'
import type { Style } from '../contract'
import { LAND_LAMP } from './landPainters'
import { REAL_PAINTERS } from './painters'
import { SEA_LAMP } from './seaPainters'

/** The model's own light, with its place for what it falls on. */
const REAL_LIGHT: StyleLight = { key: 'real', lamp: [...LAND_LAMP, ...SEA_LAMP] }

/** The real hand. */
export const REAL: Style = { id: 'real', painters: REAL_PAINTERS, light: REAL_LIGHT }
