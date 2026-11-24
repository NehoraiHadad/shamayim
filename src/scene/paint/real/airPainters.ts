import type { StyleLight } from '../../model/styleLight'
import { lightOnly, type Painters } from '../contract'
import { paintNearFall } from './air/fall'
import { paintFog } from './air/fog'

/** The hand's own painters of what is in the air near the eye. */
export const AIR_PAINTERS: Partial<Painters> = {
  mist: lightOnly(paintFog),
  fall: { form: paintNearFall },
}

/** What the hand asks of the model for them. */
export const AIR_LIGHT: Pick<StyleLight, 'fallTile'> = { fallTile: { x: 2, y: 1 } }
