import { sunElevation } from '../atmo/airInput'
import { SHADMOT_MEHOLA } from '../config/place'
import { isDarkPaper, sheetLight } from './sheetLight'
import { skyLight } from './skyLight'
import { SKY_THEMES } from './skyThemes'

const moments = [
  { name: 'dawn', time: '06:00', rising: true },
  { name: 'noon', time: '12:00', rising: false },
  { name: 'dusk', time: '16:40', rising: false },
  { name: 'night', time: '23:00', rising: false },
]

const weather = [
  { name: 'clear', theme: 'clearDay', cloudCover: 0, wet: 0 },
  { name: 'cloudy', theme: 'cloudy', cloudCover: 100, wet: 0 },
  { name: 'wet', theme: 'rain', cloudCover: 100, wet: 1 },
] as const

const liveSamples = moments.flatMap(({ name, time, rising }) => {
  const altitude = sunElevation(`2026-11-17T${time}`, SHADMOT_MEHOLA)
  const dark = isDarkPaper(altitude, null)
  return weather.map(({ name: condition, theme, cloudCover, wet }) => ({
    name: `live ${name}, ${condition}`,
    sky: skyLight({ altitude, rising, cloudCover, wet, pm10: null }),
    paper: sheetLight(altitude, theme, dark),
  }))
})

export const contrastSamples = [
  ...Object.entries(SKY_THEMES).map(([name, theme]) => ({ name, sky: theme, paper: theme })),
  ...liveSamples,
]
