import { useState } from 'react'
import { mixOklab } from './oklab'
import { SKY_THEMES, type ThemeId } from './skyThemes'

/** The paper sheet's colours: two states (light or dark) with a slow tint inside each, both from the sun's altitude. */
export interface SheetPaper {
  dark: boolean
  sheet: string
  sheetInk: string
  sheetMuted: string
  sheetAccent: string
}

/** Paper turns dark below −6° (with the stars) and light again above −4°; in between it keeps its state. */
export function isDarkPaper(altitude: number, wasDark: boolean | null): boolean {
  if (wasDark === null) return altitude < -5
  return wasDark ? altitude < -4 : altitude < -6
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const TIME_THEMES: ReadonlySet<ThemeId> = new Set(['dawn', 'dusk', 'night'])

function paperOf(id: ThemeId) {
  const { sheet, sheetInk, sheetMuted, sheetAccent } = SKY_THEMES[id]
  return { sheet, sheetInk, sheetMuted, sheetAccent }
}

function mixPaper(from: ThemeId, to: ThemeId, k: number) {
  const a = paperOf(from)
  const b = paperOf(to)
  return {
    sheet: mixOklab(a.sheet, b.sheet, k),
    sheetInk: mixOklab(a.sheetInk, b.sheetInk, k),
    sheetMuted: mixOklab(a.sheetMuted, b.sheetMuted, k),
    sheetAccent: mixOklab(a.sheetAccent, b.sheetAccent, k),
  }
}

/**
 * Light side: the weather's own paper, warming towards the dawn paper over the sun's last 10° (morning and evening).
 * Dark side: dusk's blue-hour paper, deepening into night between −6° and −12°.
 */
export function sheetLight(altitude: number, weather: ThemeId, dark: boolean): SheetPaper {
  if (dark) return { dark, ...mixPaper('dusk', 'night', clamp01((-6 - altitude) / 6)) }
  const base = TIME_THEMES.has(weather) ? 'clearDay' : weather
  return { dark, ...mixPaper(base, 'dawn', clamp01((10 - altitude) / 10)) }
}

/** The paper for real now (not the scrubbed time: the sheet describes now), remembering its state for the dead band. */
export function useSheetPaper(altitude: number, weather: ThemeId): SheetPaper {
  const [wasDark, setDark] = useState(() => isDarkPaper(altitude, null))
  const dark = isDarkPaper(altitude, wasDark)
  if (dark !== wasDark) setDark(dark)
  return sheetLight(altitude, weather, dark)
}

export function sheetVars(p: SheetPaper): Record<string, string> {
  return { '--sheet': p.sheet, '--sheet-ink': p.sheetInk, '--sheet-muted': p.sheetMuted, '--sheet-accent': p.sheetAccent }
}
