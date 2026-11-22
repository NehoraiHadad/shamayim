/** Track D's weather classes expressed as numeric inputs before the timeline mixes them. */
export function fieldWeather(code: number, rate: number, humidity: number | null) {
  return {
    convectiveShower: Number(code >= 80 && code <= 82),
    convectiveStorm: Number(code >= 95 && code <= 99),
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
