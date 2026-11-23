import type { Style } from '../contract'
import { DRAWN_LIGHT } from './light'
import { DRAWN_PAINTERS } from './painters'

/** The drawn hand (docs/design/ILLUSTRATION.md, the v1b stills). */
export const DRAWN: Style = { id: 'drawn', painters: DRAWN_PAINTERS, light: DRAWN_LIGHT }
