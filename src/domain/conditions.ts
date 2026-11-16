export type ConditionKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'thunder'
  | 'snow'

/** Map a WMO weather code to one of nine visual/semantic kinds. */
export function conditionOf(code: number): ConditionKind {
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || code === 80) return 'rain'
  if (code === 81 || code === 82) return 'showers'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloudy'
}

const LABELS: Record<ConditionKind, { day: string; night: string }> = {
  clear: { day: 'שמשי', night: 'בהיר' },
  partly: { day: 'מעונן חלקית', night: 'מעונן חלקית' },
  cloudy: { day: 'מעונן', night: 'מעונן' },
  fog: { day: 'ערפל', night: 'ערפל' },
  drizzle: { day: 'טפטוף', night: 'טפטוף' },
  rain: { day: 'גשום', night: 'גשום' },
  showers: { day: 'ממטרים', night: 'ממטרים' },
  thunder: { day: 'סופת רעמים', night: 'סופת רעמים' },
  snow: { day: 'שלג', night: 'שלג' },
}

export function conditionLabel(kind: ConditionKind, isDay: boolean): string {
  return isDay ? LABELS[kind].day : LABELS[kind].night
}

export function isWet(kind: ConditionKind): boolean {
  return kind === 'drizzle' || kind === 'rain' || kind === 'showers' || kind === 'thunder'
}
