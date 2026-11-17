import type { AirInput, AirState } from '../airTypes'
import type { MarkLife } from '../../data/landmarks/types'

const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function mapMarks(input: AirInput, air: AirState): MarkLife {
  const night = input.sunElevation <= -4
  let litShare = 0
  if (night) {
    const hour = input.localHour
    litShare = hour >= 17 && hour < 23 ? 1
      : hour >= 23 || hour < 1 ? 0.5
      : hour < 5 ? 0.2 : 0.5
  } else if (input.weatherCode >= 95 || air.thunder || input.precipitation >= 7.5 || air.haze.farFade > 0.6) litShare = 0.3

  const along = Math.abs(air.wind.u) < 0.35
  const leanDeg = input.windSpeed >= 8 && !along
    ? Math.sign(air.wind.u) * (1.5 + 5 * clamp((input.windSpeed - 8) / 32)) : 0
  const noWet = input.precipitation === 0 && input.snowfall === 0 && air.grains.count === 0
  const dry = noWet && air.streaks.count === 0
  const swayT = clamp((input.windSpeed - 8) / 22)
  const sway = !input.preview && dry && input.windSpeed >= 8 && input.windSpeed <= 20
    && !(air.heat.band > 0 && air.rays.alpha > 0)
    ? { ampDeg: (2 + 6 * swayT) * (along ? 0.5 : 1), periodS: 2.6 - swayT } : null
  const moving = [air.rain.count + air.snow.count, air.grains.count, air.streaks.count, air.heat.band, air.rays.alpha]
    .filter((value) => value > 0).length
  const turbineT = clamp((input.windSpeed - 11) / 40)
  const turbinePeriodS = !input.preview && noWet && moving < 2
    && input.windSpeed >= 11 && input.windSpeed <= 90 ? 7 - 3.5 * turbineT : null

  return {
    litShare,
    aviation: litShare > 0,
    leanDeg,
    sway,
    turbinePeriodS,
    hideFar: air.haze.farFade >= 0.85,
    farBleach: air.heat.band > 0 ? 0.85 : 1,
  }
}
