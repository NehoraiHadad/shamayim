import { rainRate } from '../world/airParts'
import { fallingSnowAmount } from '../world/snowLine'
import type { AirInput } from './airTypes'
import { fieldWeather } from './fieldWeather'

export function weatherEffects(phase: PhaseInput, cape: number | null, hourlySnow = false) {
  const { weatherCode, precipitation, snowfall, temperature, humidity } = phase
  const fallingSnow = fallingSnowAmount(weatherCode, snowfall)
  const rainMmH = hourlySnow ? 0 : rainRate({ weatherCode, precipitation, snowfall, temperature })
  return {
    rainMmH,
    fallingSnow,
    snowCloudRate: fallingSnow > 0 ? Math.max(0.1, snowfall) : 0,
    thunderWeight: Number(weatherCode >= 95),
    showerWeight: Number(!hourlySnow && weatherCode >= 80 && weatherCode <= 82),
    fieldWeather: fieldWeather(weatherCode, rainMmH, humidity, cape),
  }
}

export type PhaseInput = Pick<AirInput, 'weatherCode' | 'precipitation' | 'snowfall' | 'temperature' | 'humidity'>
