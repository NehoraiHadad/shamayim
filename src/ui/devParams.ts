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
