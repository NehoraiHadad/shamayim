import { THRESHOLDS as T } from '../config/thresholds'
import type { DayNormal } from '../domain/types'

export function thresholdsFor(normal?: DayNormal) {
  const k = normal ? Math.max(1, (normal.gustMax + normal.gustMaxSd) / T.wind.gusts) : 1
  const veryHot = normal ? Math.min(T.dayTemp.veryHot, Math.max(T.heat.floor, normal.tempMax + T.heat.aboveNormal)) : T.dayTemp.veryHot
  return {
    wind: { brisk: T.wind.brisk * k, strong: T.wind.strong * k, gusts: T.wind.gusts * k },
    veryHot, heatHours: normal ? veryHot - 3 : T.heatHours,
  }
}
