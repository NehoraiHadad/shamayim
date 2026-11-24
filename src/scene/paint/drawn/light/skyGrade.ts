import type { SkyGrade } from '../../../model/styleLight'
import { pigment } from '../kit/palette'

/** The sky's colours in the hand's pigment, as every other colour of the print: the value is the model's, the chroma the hand's. */
export const DRAWN_GRADE: SkyGrade = { key: 'print1', colour: (rgb) => pigment(rgb) }
