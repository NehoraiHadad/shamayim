import type { StyleLight } from '../../../model/styleLight'
import { drawnOutsideLook } from './outsideLook'
import { drawnTwilightScreen } from './twilightScreen'

/** The drawn hand's light: the illustrated palette over the town, and facades screened at twilight. */
export const DRAWN_LIGHT: StyleLight = { key: 'drawn', screen: drawnTwilightScreen, outside: drawnOutsideLook }
