import { THRESHOLDS } from '../config/thresholds'
import { HIGH_RES_DAYS } from './blend'
import type { Confidence } from './types'

export function confidenceFor(
  spread: { tempMax: number; precipProb: number }, dayOffset: number,
): Confidence {
  const c = THRESHOLDS.confidence
  if (spread.tempMax > c.tempMaxLow || spread.precipProb >= c.precipProbLow || dayOffset >= HIGH_RES_DAYS) return 'low'
  if (spread.tempMax > c.tempMaxMedium || spread.precipProb >= c.precipProbMedium) return 'medium'
  return 'high'
}
