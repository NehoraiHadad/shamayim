import { smoothstep } from '../domain/smoothstep'

/**
 * Track D's weather classes expressed as numeric inputs before the timeline mixes them. With the hour's CAPE (J/kg) the
 * code is weighed by the fuel it has: a thunder code over little CAPE is a weaker storm; rain falling through air with
 * fuel is showers whatever the code calls it; fuel and no rain still grows Cu con. Levant cool-season storms run on a
 * few hundred J/kg (cold air aloft), so 400 is a full storm's fuel. Without CAPE the code alone decides.
 */
export function fieldWeather(code: number, rate: number, humidity: number | null, cape: number | null = null) {
  const shower = Number(code >= 80 && code <= 82), storm = Number(code >= 95 && code <= 99)
  const fuel = cape === null ? null : smoothstep(0, 400, cape)
  return {
    // A storm hour's cloud is the storm's: its rain is not counted again as showers.
    convectiveShower: fuel === null || storm ? shower
      : Math.max(shower, smoothstep(100, 500, cape!) * smoothstep(0.2, 1, rate), 0.5 * smoothstep(500, 1500, cape!)),
    convectiveStorm: fuel === null ? storm : storm * (0.7 + 0.3 * fuel),
    steadyRain: Number((code >= 51 && code <= 65) || (code >= 71 && code <= 75)),
    nimbostratus: Number(code >= 61 && code <= 65),
    fallMs: code >= 71 && code <= 77 ? 1 : rate < 0.5 ? 1.5 : rate < 2.5 ? 4 : rate < 8 ? 6 : 8,
    dryVirga: rate < 0.2 && humidity !== null && humidity < 45 ? humidity / 45 : 1,
  }
}

export type FieldWeather = ReturnType<typeof fieldWeather>

export function mixFieldWeather(a: FieldWeather, b: FieldWeather, t: number): FieldWeather {
  const mix = (key: keyof FieldWeather) => a[key] + (b[key] - a[key]) * t
  return {
    convectiveShower: mix('convectiveShower'), convectiveStorm: mix('convectiveStorm'), steadyRain: mix('steadyRain'),
    nimbostratus: mix('nimbostratus'), fallMs: mix('fallMs'), dryVirga: mix('dryVirga'),
  }
}
