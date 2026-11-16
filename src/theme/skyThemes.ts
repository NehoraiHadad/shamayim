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
  /** Week sheet surface and its text. */
  sheet: string
  sheetInk: string
  sheetMuted: string
}

const daySheet = { sheet: '#FAF6EE', sheetInk: '#1C1A17', sheetMuted: '#6B645A' }
const nightSheet = { sheet: '#12162B', sheetInk: '#EEF1FF', sheetMuted: '#9AA3C7' }

export const SKY_THEMES: Record<ThemeId, SkyTheme> = {
  dawn: {
    top: '#1F2A52', mid: '#8E4A6E', horizon: '#F6B26B', ink: '#FFF8EC', accent: '#FFD9A0',
    ridgeFar: '#3A2A4A', ridgeNear: '#1A1428', ...daySheet,
  },
  clearDay: {
    top: '#0E4C96', mid: '#2F7CC0', horizon: '#E9D3A8', ink: '#FFFFFF', accent: '#FFD23F',
    ridgeFar: '#5B6F86', ridgeNear: '#2E3B4E', ...daySheet,
  },
  heat: {
    top: '#7E2A10', mid: '#B85A22', horizon: '#F2CF92', ink: '#FFF6E8', accent: '#FFE08A',
    ridgeFar: '#8A5A3A', ridgeNear: '#4A2A1A', ...daySheet,
  },
  cloudy: {
    top: '#3A4352', mid: '#5E6979', horizon: '#B9BFC9', ink: '#FFFFFF', accent: '#E6EBF2',
    ridgeFar: '#5A6170', ridgeNear: '#2C313C', ...daySheet,
  },
  rain: {
    top: '#16232F', mid: '#2C4A5E', horizon: '#6F8FA0', ink: '#F2FAFF', accent: '#7FE0D0',
    ridgeFar: '#2E4352', ridgeNear: '#121C24', ...daySheet,
  },
  dust: {
    top: '#5E4424', mid: '#8A6538', horizon: '#D7BE8C', ink: '#FFF9EC', accent: '#F4D58D',
    ridgeFar: '#8C7350', ridgeNear: '#4A3820', ...daySheet,
  },
  dusk: {
    top: '#2B2350', mid: '#8C3F66', horizon: '#F2994A', ink: '#FFF4EA', accent: '#FFC27A',
    ridgeFar: '#3E2A48', ridgeNear: '#1C1428', ...nightSheet,
  },
  night: {
    top: '#070B1E', mid: '#131C3F', horizon: '#2A2F5C', ink: '#EEF1FF', accent: '#F2D58A',
    ridgeFar: '#1A1F35', ridgeNear: '#0B0E1C', ...nightSheet,
  },
}

/** Theme tokens as CSS custom properties for the app root. */
export function themeVars(id: ThemeId): Record<string, string> {
  const t = SKY_THEMES[id]
  return {
    '--sky-top': t.top,
    '--sky-mid': t.mid,
    '--sky-horizon': t.horizon,
    '--ink': t.ink,
    '--accent': t.accent,
    '--ridge-far': t.ridgeFar,
    '--ridge-near': t.ridgeNear,
    '--sheet': t.sheet,
    '--sheet-ink': t.sheetInk,
    '--sheet-muted': t.sheetMuted,
  }
}
