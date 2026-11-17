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
    dust: pair(t.dust.top, t.dust.mid),
    heat: pair(t.heat.top, t.heat.mid),
    pale: pair(t.cloudy.horizon, mix(t.cloudy.horizon, '#FFFFFF', 0.35)),
  }
}
