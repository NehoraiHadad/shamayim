import type { CloudSighting } from '../domain/cloudSightings'
import type { LocalTime } from '../domain/types'
import { isSceneStyle, type SceneStyle } from '../scene/sceneStyle'
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

/** `?style=drawn` (or `real`) forces the scene's hand. */
export function forcedStyle(): SceneStyle | null {
  const style = param('style')
  return isSceneStyle(style) ? style : null
}

const WX_KEYS = {
  rain: 'precipitation', snow: 'snowfall', wind: 'windSpeed', gust: 'windGusts', dir: 'windDirection',
  temp: 'temperature', cloud: 'cloudCover', pm10: 'pm10', vis: 'visibilityKm', code: 'weatherCode', hum: 'humidity',
  depth: 'snowDepth',
} as const

/**
 * `?wx=rain:12,wind:45,dir:270,cloud:90,code:63` overrides air inputs for visual QA of conditions
 * the real sky is not showing today. Keys: rain (mm/h), snow (cm/h), wind, gust, dir, temp, cloud, pm10, vis (km), code, hum (%),
 * depth (lying snow, m).
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

/**
 * `?seen=250:8:6,95:20:4` pins the single clouds the satellite "sees" (azimuth°:distance km:width km, comma-separated),
 * for visual QA on a day without them.
 */
export function forcedSightings(): CloudSighting[] | null {
  const seen = param('seen')
  if (!seen) return null
  return seen.split(',').map((part) => part.split(':').map(Number))
    .filter((v) => v.length === 3 && v.every(Number.isFinite))
    .map(([azimuth, distanceKm, widthKm]) => ({ azimuth, distanceKm, widthKm }))
}

/** `?perf=1` shows the canvas scene's timings in a small HUD (`scene/react/PerfHud.tsx`). */
export function perfHud(): boolean {
  return param('perf') === '1'
}

/** `?picker=open` opens the place picker on load, for screenshots of it. */
export function pickerOpenOnLoad(): boolean {
  return param('picker') === 'open'
}

/**
 * `?rain=arrive` (or `here`, `pass`, `far`, `still`, `none`, or `bearing:km:radiusKm:band[:towardDeg:kmh],…`) replaces
 * the radar with synthetic moving rain, for QA of the radar page's rainy states (see `data/overhead/syntheticRain.ts`).
 */
export function forcedRain(): string | null {
  return param('rain')
}
