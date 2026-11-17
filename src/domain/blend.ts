export const HIGH_RES_DAYS = 5

export interface ModelPair<T> { icon: T | null; ecmwf: T | null }

export function iconWeight(dayOffset: number): number {
  return dayOffset >= 0 && dayOffset < HIGH_RES_DAYS ? 0.6 : 0.4
}

export function blendNumber(pair: ModelPair<number>, weight: number): number | null {
  if (pair.icon === null) return pair.ecmwf
  if (pair.ecmwf === null) return pair.icon
  return pair.icon * weight + pair.ecmwf * (1 - weight)
}

export function blendWeatherCode(
  code: ModelPair<number>, precipProb: ModelPair<number>, weight: number,
): number | null {
  const iconWet = code.icon !== null && code.icon >= 51 && (precipProb.icon ?? -1) >= 40
  const ecmwfWet = code.ecmwf !== null && code.ecmwf >= 51 && (precipProb.ecmwf ?? -1) >= 40
  if (iconWet || ecmwfWet) {
    return weight >= 0.5 ? (iconWet ? code.icon : code.ecmwf) : (ecmwfWet ? code.ecmwf : code.icon)
  }
  return weight >= 0.5 ? (code.icon ?? code.ecmwf) : (code.ecmwf ?? code.icon)
}

export function roundTemperature(value: number): number {
  return Math.round(value * 10) / 10
}
