import type { StyleLight } from '../../model/styleLight'
import type { Style } from '../contract'
import { REAL_PAINTERS } from './painters'

/** The model's own light, with its place for the clouds it goes through. */
const REAL_LIGHT: StyleLight = { key: 'real', lamp: ['cloudSheet'] }

/** The real hand. */
export const REAL: Style = { id: 'real', painters: REAL_PAINTERS, light: REAL_LIGHT }
