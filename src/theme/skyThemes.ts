export type ThemeId = 'dawn' | 'clearDay' | 'heat' | 'cloudy' | 'rain' | 'dust' | 'dusk' | 'night'

export interface SkyTheme {
  top: string
  mid: string
  horizon: string
  ink: string
  accent: string
  /** Ridge silhouettes, far and near. */
  ridgeFar: string
  ridgeNear: string
  /** Paper sheet surface, its text, and an accent that reads on paper (the sky's mid tone). */
  sheet: string
  sheetInk: string
  sheetMuted: string
  sheetAccent: string
}

const dayInk = { sheetInk: '#1C1A17', sheetMuted: '#625C52' }
const nightInk = { sheetInk: '#EEF1FF', sheetMuted: '#A3ACCE' }

export const SKY_THEMES: Record<ThemeId, SkyTheme> = {
  dawn: {
    top: '#1F2A52', mid: '#7E3F62', horizon: '#F6B26B', ink: '#FFF8EC', accent: '#FFD9A0',
    ridgeFar: '#3A2A4A', ridgeNear: '#1A1428',
    sheet: '#FAF1EC', sheetAccent: '#8E4A6E', ...dayInk,
  },
  clearDay: {
    top: '#11519B', mid: '#3172B0', horizon: '#BBD5EC', ink: '#FFFFFF', accent: '#FFD23F',
    ridgeFar: '#5B6F86', ridgeNear: '#2E3B4E',
    sheet: '#F3F5F7', sheetAccent: '#2A6AA8', ...dayInk,
  },
  heat: {
    top: '#7E2A10', mid: '#A84F1C', horizon: '#F2CF92', ink: '#FFF6E8', accent: '#FFE08A',
    ridgeFar: '#8A5A3A', ridgeNear: '#4A2A1A',
    sheet: '#FBF3E6', sheetAccent: '#A84F1C', ...dayInk,
  },
  cloudy: {
    top: '#3A4352', mid: '#566170', horizon: '#B9BFC9', ink: '#FFFFFF', accent: '#E6EBF2',
    ridgeFar: '#5A6170', ridgeNear: '#2C313C',
    sheet: '#F1F2F3', sheetAccent: '#566170', ...dayInk,
  },
  rain: {
    top: '#16232F', mid: '#2C4A5E', horizon: '#6F8FA0', ink: '#F2FAFF', accent: '#7FE0D0',
    ridgeFar: '#2E4352', ridgeNear: '#121C24',
    sheet: '#EEF3F4', sheetAccent: '#2C6E7F', ...dayInk,
  },
  dust: {
    top: '#5E4424', mid: '#7E5C32', horizon: '#D7BE8C', ink: '#FFF9EC', accent: '#F4D58D',
    ridgeFar: '#8C7350', ridgeNear: '#4A3820',
    sheet: '#F6EFDF', sheetAccent: '#7E5C32', ...dayInk,
  },
  dusk: {
    top: '#2B2350', mid: '#7E3A5E', horizon: '#F2994A', ink: '#FFF4EA', accent: '#FFC27A',
    ridgeFar: '#3E2A48', ridgeNear: '#1C1428',
    sheet: '#211A33', sheetInk: '#F4EEF7', sheetMuted: '#B3A9C9', sheetAccent: '#FFC27A',
  },
  night: {
    top: '#070B1E', mid: '#131C3F', horizon: '#2A2F5C', ink: '#EEF1FF', accent: '#F2D58A',
    ridgeFar: '#1A1F35', ridgeNear: '#0B0E1C',
    sheet: '#12162B', sheetAccent: '#F2D58A', ...nightInk,
  },
}

/** Themes whose paper sheet is dark. */
export const DARK_SHEET: ReadonlySet<ThemeId> = new Set(['dusk', 'night'])

/** Theme tokens as CSS custom properties for the app root. */
export function themeVars(id: ThemeId): Record<string, string> {
  const t = SKY_THEMES[id]
  return {
    '--sky-top': t.top,
    '--sky-mid': t.mid,
    '--sky-horizon': t.horizon,
    '--ink': t.ink,
    '--focus': 'var(--ink)',
    '--accent': t.accent,
    '--ridge-far': t.ridgeFar,
    '--ridge-near': t.ridgeNear,
    '--sheet': t.sheet,
    '--sheet-ink': t.sheetInk,
    '--sheet-muted': t.sheetMuted,
    '--sheet-accent': t.sheetAccent,
  }
}
