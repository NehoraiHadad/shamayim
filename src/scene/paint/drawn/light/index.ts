import type { StyleLight } from '../../../model/styleLight'
import { drawnMeet } from './meet'
import { drawnOutsideLook } from './outsideLook'
import { DRAWN_GRADE } from './skyGrade'
import { drawnTwilightScreen } from './twilightScreen'

/** The drawn hand's light: the illustrated palette over the town, facades screened at twilight, the sky in the print's pigment, the clouds with their air and their lamp; the town met with
 *  its ground. */
export const DRAWN_LIGHT: StyleLight = { key: 'drawn', screen: drawnTwilightScreen, outside: drawnOutsideLook, meet: drawnMeet, sky: { grade: DRAWN_GRADE }, cloudAir: true, lamp: ['cloudSheet'] }
