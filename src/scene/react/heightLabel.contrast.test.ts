import { describe, expect, it } from 'vitest'
import { sunElevation } from '../../atmo/airInput'
import { SHADMOT_MEHOLA } from '../../config/place'
import { mix, ratio } from '../../theme/contrast'
import { skyLight, type SkyLight } from '../../theme/skyLight'
import { SKY_THEMES } from '../../theme/skyThemes'

const moments = [
  { name: 'dawn', time: '06:00', rising: true },
  { name: 'noon', time: '12:00', rising: false },
  { name: 'dusk', time: '16:40', rising: false },
  { name: 'night', time: '23:00', rising: false },
]

const livePalettes = moments.map(({ name, time, rising }) => [
  `live ${name}`,
  skyLight({
    altitude: sunElevation(`2026-11-17T${time}`, SHADMOT_MEHOLA),
    rising,
    cloudCover: 0,
    wet: 0,
    pm10: null,
  }),
] as const)
const palettes: ReadonlyArray<readonly [string, SkyLight]> = [...Object.entries(SKY_THEMES), ...livePalettes]

describe('height label contrast (WCAG AA)', () => {
  for (const [name, { ink, ridgeNear, ridgeFar, top, mid, horizon }] of palettes) {
    it(`${name}: ink on the near ridge ≥ 4.5`, () => {
      expect(ratio(ink, ridgeNear)).toBeGreaterThanOrEqual(4.5)
    })

    it(`${name}: ink on the translucent backing ≥ 4.5`, () => {
      // SceneOverlay.module.css uses 72% near ridge over the scene. Check every
      // land and sky tone in the palette, including the darkest and lightest.
      for (const backdrop of [ridgeNear, ridgeFar, top, mid, horizon]) {
        expect(ratio(ink, mix(backdrop, ridgeNear, 0.72)), `over ${backdrop}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})
