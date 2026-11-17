import type { SkyTheme } from '../../theme/skyThemes'
import { rgb } from './glUtil'

type RGB = [number, number, number]

export interface AirPalette {
  cloudLit: RGB
  cloudShade: RGB
  haze: RGB
  sun: RGB
  rain: RGB
  snow: RGB
  grains: RGB
  streaks: RGB
  /** Particle and cloud alpha multiplier (rain at night reads as sound, not light). */
  night: number
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Colours for the air come from the theme; the air never paints the sky colour itself. */
export function airPalette(theme: SkyTheme, hazeHex: string, night: boolean): AirPalette {
  const mid = rgb(theme.mid)
  const haze = rgb(hazeHex || theme.horizon)
  return {
    cloudLit: night ? rgb('#3A4070') : mix(rgb('#F7F8FA'), rgb(theme.horizon), 0.12),
    cloudShade: night ? rgb('#1A1F3A') : mix(mid, [0, 0, 0], 0.18),
    haze,
    sun: rgb(theme.accent),
    rain: rgb('#DCF0FF'),
    snow: rgb('#FFFFFF'),
    grains: mix(haze, [1, 1, 1], 0.2),
    streaks: rgb(theme.ink),
    night: night ? 0.7 : 1,
  }
}
