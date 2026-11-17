import { THRESHOLDS as T } from '../config/thresholds'
import type { DayNormal, DayPoint } from '../domain/types'
import { deg } from './phrases'

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export function normalClause(day: DayPoint, normal?: DayNormal): string | null {
  if (!normal) return null
  const gap = day.tempMax - normal.tempMax
  if (Math.abs(gap) < Math.max(T.anomaly.minDelta, T.anomaly.sdFactor * normal.tempMaxSd)) return null
  const strong = Math.abs(gap) >= T.anomaly.strong
  const word = gap > 0 ? (strong ? 'חם בהרבה' : 'חם') : (strong ? 'קר בהרבה' : 'קריר')
  const month = MONTHS[Number(day.date.slice(5, 7)) - 1]
  return `${word} מהרגיל ל${month}${strong ? ',' : ''} ב־${deg(Math.abs(gap))}`
}
