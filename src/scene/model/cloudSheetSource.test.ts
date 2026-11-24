import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import type { Ctx2D, PaintEnv } from '../paint/shared/base/hand'
import { paintDrawnSheet } from '../paint/drawn/cloudSheet'
import { paintCloudSheet } from '../paint/real/cloudSheet'
import { cloudLayersOf } from './cloudLayers'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const SHOWERS = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45,
  windDirection: 250, humidity: 80 }
/** The thick interior's spread (L*) before this, flat, and main's: no more than it. */
const FLAT = 0.35, MAIN = 0.97
const styles = { real: paintCloudSheet, drawn: paintDrawnSheet }
let world: WorldState
beforeAll(async () => {
  stubPublicFetch()
  const haifa = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))).get('haifa')!, at = '2026-11-17T12:00' as LocalTime
  const input = worldInput(haifa, at, at)
  // The place's own ground (m), as the scene's harness gives it.
  world = buildWorld({ ...input, forecast: { ...input.forecast, elevation: 63 }, forced: SHOWERS })
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const sheetOf = (lattice: string) =>
  cloudLayersOf(world, BOX).find((layer): layer is LayerOf<'cloudSheet'> => layer.kind === 'cloudSheet' && layer.lattice === lattice)!

/** The L* of a sheet's thick pixels as a style paints it, over the same sky. */
function lightness(sheet: LayerOf<'cloudSheet'>, paint: typeof paintCloudSheet) {
  let image = { data: new Uint8ClampedArray(), width: 0, height: 0 }
  const scratch = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: (next: typeof image) => { image = next } }
  paint({ save() {}, restore() {}, drawImage() {} } as unknown as Ctx2D, sheet,
    { canvas: (w: number, h: number) => ({ canvas: {}, ctx: scratch, w, h }) } as unknown as PaintEnv)
  const values: number[] = [], linear = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  // The upper half of the sky: lower, the sheet is its far source.
  for (let at = 0; at < image.width * 210 / 2 * 4; at += 4) if (image.data[at + 3] >= 234) {
    const [r, g, b] = [0, 1, 2].map((k) => linear(image.data[at + k] / 255))
    values.push(116 * Math.cbrt(0.2126 * r + 0.7152 * g + 0.0722 * b) - 16)
  }
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  return { count: values.length, mean, deviation: Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length) }
}

describe.each(Object.entries(styles))('a thick shower cloud, %s', (style, paint) => {
  it('has a base that is not one flat grey, as bright on the whole as it was', () => {
    const sheet = sheetOf('mid'), now = lightness(sheet, paint), flat = lightness({ ...sheet, source: undefined }, paint)
    console.info('SOURCE', style, JSON.stringify({ now, flat }))
    expect(now.count).toBeGreaterThan(2000)
    expect(now.deviation).toBeGreaterThanOrEqual(Math.hypot(flat.deviation, 0.55))
    expect(now.deviation).toBeLessThanOrEqual(Math.hypot(Math.max(flat.deviation, FLAT), MAIN))
    expect(Math.abs(now.mean - flat.mean)).toBeLessThanOrEqual(1)
  })
})

it('leaves a sheet whose tone shows its texture, and the extinction, alone', () => {
  const sheet = sheetOf('mid')
  expect(sheet.genus).toBe('ns')
  const { source = [], alpha } = sheet
  expect(source.some((value) => Math.abs(value - 1) > 0.02)).toBe(true)
  // None on the whole, as it is drawn, and none in the open.
  const { ys, xs } = sheet
  let sum = 0
  for (let row = 0; row < ys.length; row++) {
    const height = (ys[Math.min(ys.length - 1, row + 1)] - ys[Math.max(0, row - 1)]) / 2
    for (let i = row * xs.length; i < (row + 1) * xs.length; i++) {
      sum += height * (source[i] - 1)
      if (alpha[i] < 0.05) expect.soft(Math.abs(source[i] - 1)).toBeLessThan(0.01)
    }
  }
  expect(Math.abs(sum / (xs.length * ys[ys.length - 1]))).toBeLessThan(1e-9)
  expect(sheetOf('high').source).toBeUndefined()
})
