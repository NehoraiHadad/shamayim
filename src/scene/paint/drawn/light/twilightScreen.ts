import { smoothstep } from '../../../../domain/smoothstep'
import type { Normal } from '../../../../world/livingLight'
import type { LandIrradiance } from '../../../model/landIrradiance'
import type { TwilightScreen } from '../../../model/styleLight'

/** Retain the existing drawn hand's distant-town and landmark tones. */
export function drawnTwilightScreen({ sunDir, sunAlt }: LandIrradiance): TwilightScreen {
  const horizontal = Math.hypot(sunDir.across, sunDir.ahead) || 1
  const twilight = smoothstep(13, 2, sunAlt) * smoothstep(-13, -4, sunAlt)
  return (n: Normal) => {
    const toward = (n[0] * sunDir.across + n[1] * sunDir.ahead) / horizontal
    const screen = (1 - Math.abs(n[2])) * twilight
    return { sky: 1 - screen * (.998 - .28 * (.5 + .5 * toward) ** 3), ground: 1 - .83 * screen }
  }
}
