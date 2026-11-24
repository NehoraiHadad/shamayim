import type { StyleLight } from '../../../model/styleLight'
import { drawnOutsideLook } from './outsideLook'
import { DRAWN_GRADE } from './skyGrade'
import { drawnTwilightScreen } from './twilightScreen'

/** The drawn hand's light: the illustrated palette over the town, facades screened at twilight, the sky in the print's pigment. */
export const DRAWN_LIGHT: StyleLight = { key: 'drawn', screen: drawnTwilightScreen, outside: drawnOutsideLook, sky: { grade: DRAWN_GRADE } }
