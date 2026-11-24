import { expect, it } from 'vitest'
import { captionTone } from './captionTone'
import { ratio } from './contrast'
import { skyLight } from './skyLight'
import { SKY_THEMES } from './skyThemes'

const ALTITUDES = Array.from({ length: 45 }, (_, i) => i * 2 - 20)
const palettes = [...Object.values(SKY_THEMES), ...ALTITUDES.flatMap(altitude => [true, false].flatMap(rising => [0, 60, 100].flatMap(cloudCover =>
  [0, 1].flatMap(wet => [null, 400].map(pm10 => skyLight({ altitude, rising, cloudCover, wet, pm10 }))))))]

it.each(['sky', 'land'] as const)('the lettering reads on its halo over %s in every light (WCAG AA)', (on) => {
  const worst = Math.min(...palettes.map((palette) => {
    return Math.min(...[palette.ridgeNear, palette.horizon].map((land) => {
      const { ink, halo } = captionTone(palette, on, land)
      return ratio(ink, halo)
    }))
  }))
  expect(worst).toBeGreaterThanOrEqual(4.5)
})
