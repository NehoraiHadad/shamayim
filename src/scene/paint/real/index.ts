import { PLAIN_LIGHT } from '../../model/styleLight'
import type { Style } from '../contract'
import { REAL_PAINTERS } from './painters'

/** The real hand, in the model's own light. */
export const REAL: Style = { id: 'real', painters: REAL_PAINTERS, light: PLAIN_LIGHT }
