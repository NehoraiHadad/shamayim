import type { AirInput } from '../atmo/airTypes'
import type { AirState } from '../atmo/airTypes'
import { rainRate } from './airParts'
import { mapAir } from './mapAir'
import { unionOf, type Covers } from './clouds'
import { smoothstep } from './ridgeLighting'
import { eveningShare } from './livingLight'
import type { Night } from './types'

/**
 * The share of windows lit: all through the evening, half late at night and before dawn, a fifth in the small hours;
 * by day a third under a storm, a downpour or a thick haze.
 */
export function litShareOf(input: AirInput, air: AirState): number {
  const dull = 0.3 * Math.max(input.thunderWeight ?? Number(input.weatherCode >= 95),
    smoothstep(6.5, 8.5, rainRate(input)), smoothstep(0.55, 0.65, air.haze.farFade))
  // The living light: the night's share by the hour read smoothly, faded in through the dusk (the sun from −2° to −6°)
  // instead of switched on at −4° and on the hour.
  const dusk = smoothstep(-2, -6, input.sunElevation)
  return dull + (eveningShare(input.localHour) - dull) * dusk
}

/**
 * Night: the share of lit windows and the aviation lights (on whenever windows are lit), the clear share of the sky the
 * stars show through, and how dark it is.
 */
export function nightOf(shown: AirInput, covers: Covers): Night {
  const litShare = litShareOf(shown, mapAir(shown))
  return {
    litShare,
    aviation: litShare > 0.02,
    starsThrough: 1 - unionOf(covers),
    dark: smoothstep(-4, -12, shown.sunElevation),
  }
}
