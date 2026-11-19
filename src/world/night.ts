import type { AirInput } from '../atmo/airTypes'
import { mapAir } from '../atmo/mapAir'
import { mapMarks } from '../atmo/life/mapMarks'
import { unionOf, type Covers } from './clouds'
import { smoothstep } from './ridgeLighting'
import type { Night } from './types'

/**
 * Night: the share of lit windows and the aviation lights (as the SVG marks take them, `mapMarks`), the clear share of
 * the sky the stars show through, and how dark it is.
 */
export function nightOf(shown: AirInput, covers: Covers): Night {
  const marks = mapMarks(shown, mapAir(shown))
  return {
    litShare: marks.litShare,
    aviation: marks.aviation,
    starsThrough: 1 - unionOf(covers),
    dark: smoothstep(-4, -12, shown.sunElevation),
  }
}
