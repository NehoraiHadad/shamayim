import type { LocalTime } from '../domain/types'
import { SKY_THEMES, type ThemeId } from '../theme/skyThemes'

/** Dev-only URL overrides for visual QA. Always null in production builds. */
function param(name: string): string | null {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get(name)
}

/** `?at=2026-11-17T13:00` pins the clock (day/night themes, sentences). */
export function pinnedTime(): LocalTime | null {
  const at = param('at')
  return at && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(at) ? at : null
}

/** `?theme=rain` forces a sky theme. */
export function forcedTheme(): ThemeId | null {
  const id = param('theme')
  return id && id in SKY_THEMES ? (id as ThemeId) : null
}

const WX_KEYS = {
  rain: 'precipitation', snow: 'snowfall', wind: 'windSpeed', gust: 'windGusts', dir: 'windDirection',
  temp: 'temperature', cloud: 'cloudCover', pm10: 'pm10', vis: 'visibilityKm', code: 'weatherCode',
} as const

/**
 * `?wx=rain:12,wind:45,dir:270,cloud:90,code:63` overrides air inputs for visual QA of conditions
 * the real sky is not showing today. Keys: rain (mm/h), snow (cm/h), wind, gust, dir, temp, cloud, pm10, vis (km), code.
 */
export function forcedWeather(): Record<string, number> | null {
  const wx = param('wx')
  if (!wx) return null
  const out: Record<string, number> = {}
  for (const pair of wx.split(',')) {
    const [k, v] = pair.split(':')
    const key = WX_KEYS[k as keyof typeof WX_KEYS]
    if (key && !Number.isNaN(Number(v))) out[key] = Number(v)
  }
  if ('temperature' in out) out.feelsLike = out.temperature
  if ('pm10' in out) out.dust = out.pm10
  return out
}
