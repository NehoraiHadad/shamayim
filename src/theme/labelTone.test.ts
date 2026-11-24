import { expect, it } from 'vitest'
import { ratio } from './contrast'
import { labelTone } from './labelTone'
import { skyLight } from './skyLight'
import { SKY_THEMES } from './skyThemes'

const ALTITUDES = Array.from({ length: 45 }, (_, i) => i * 2 - 20)
const palettes = [...Object.values(SKY_THEMES), ...ALTITUDES.flatMap((altitude) => [true, false].flatMap((rising) => [0, 60, 100].flatMap((cloudCover) =>
  [0, 1].flatMap((wet) => [null, 400].map((pm10) => skyLight({ altitude, rising, cloudCover, wet, pm10 }))))))]

it.each(['sky', 'land'] as const)('the height reads on its halo over %s in every light, on clear land and on land pale with fog (WCAG AA)', (on) => {
  const worst = Math.min(...palettes.flatMap((palette) => [palette.ridgeNear, palette.ridgeFar, palette.horizon, '#C8CED4'].map((land) => {
    const { ink, halo } = labelTone(palette, on, land)
    return ratio(ink, halo)
  })))
  expect(worst).toBeGreaterThanOrEqual(4.5)
})

it('letters pale land darkly and dark land lightly', () => {
  const noon = skyLight({ altitude: 50, rising: false, cloudCover: 100, wet: 0, pm10: null })
  expect(labelTone(noon, 'land', '#DDE2E6').ink).toBe(noon.ridgeNear)
  expect(labelTone(noon, 'land', noon.ridgeNear).ink).toBe(noon.ink)
})
