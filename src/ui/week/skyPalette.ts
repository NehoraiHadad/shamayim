import { mix } from '../../theme/contrast'
import { SKY_THEMES } from '../../theme/skyThemes'

/**
 * The few sky colours the week swatches need, read from the sky themes. This is the only place the sheet depends on
 * the theme shape: when the scene moves to continuous light, map its colours here and nothing else changes.
 */
export interface SkyPalette {
  /** Midday sky, upper and lower tone, per weather. */
  clear: SkyPair
  overcast: SkyPair
  rain: SkyPair
  dust: SkyPair
  heat: SkyPair
  /** Fog / snow: a pale, low-contrast sky. */
  pale: SkyPair
}

export interface SkyPair {
  top: string
  low: string
}

const pair = (top: string, low: string): SkyPair => ({ top, low })

export function skyPalette(): SkyPalette {
  const t = SKY_THEMES
  return {
    clear: pair(t.clearDay.top, t.clearDay.mid),
    overcast: pair(t.cloudy.top, t.cloudy.mid),
    rain: pair(t.rain.top, t.rain.mid),
    // Dust: a desaturated ochre-grey (sharav greys the sky); heat: red-orange, paler at the top (glare).
    // Kept apart on purpose, so the two brown days of a week never read the same.
    dust: pair(mix(t.dust.top, t.cloudy.top, 0.45), mix(t.dust.mid, t.cloudy.mid, 0.45)),
    heat: pair(mix(t.heat.mid, t.heat.horizon, 0.28), mix(t.heat.mid, '#C8401C', 0.5)),
    pale: pair(t.cloudy.horizon, mix(t.cloudy.horizon, '#FFFFFF', 0.35)),
  }
}
