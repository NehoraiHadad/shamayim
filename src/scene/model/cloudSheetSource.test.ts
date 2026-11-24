import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import type { Ctx2D, PaintEnv } from '../paint/shared/base/hand'
import { PAINTERS, SCENE_STYLES, type SceneStyle } from '../paint/painters'
import { cloudLayersOf } from './cloudLayers'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const SHOWERS = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45,
  windDirection: 250, humidity: 80 }
/** The spread (L*) of the thick interior main's painter had, and how much of it is wanted back. */
const MAIN = 0.97, KEPT = 0.6
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

/** The L* of a sheet's pixels in the sky's upper half (lower, it is its far source) as a style paints it; none where it is thin. */
function lightness(sheet: LayerOf<'cloudSheet'>, style: SceneStyle) {
  let image = { data: new Uint8ClampedArray(), width: 0, height: 0 }
  const scratch = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: (next: typeof image) => { image = next } }
  PAINTERS[style].cloudSheet.form({ save() {}, restore() {}, drawImage() {} } as unknown as Ctx2D, sheet,
    { canvas: (w: number, h: number) => ({ canvas: {}, ctx: scratch, w, h }) } as unknown as PaintEnv)
  const linear = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return Array.from({ length: image.width * Math.floor(image.height / 2) }, (_, i) => {
    const [r, g, b, a] = image.data.slice(i * 4, i * 4 + 4)
    return a < 234 ? NaN : 116 * Math.cbrt(0.2126 * linear(r / 255) + 0.7152 * linear(g / 255) + 0.0722 * linear(b / 255)) - 16
  })
}

describe.each(SCENE_STYLES)('a thick shower cloud, %s', (style) => {
  it('has a base that is not one flat grey, as bright on the whole as it was', () => {
    const sheet = sheetOf('mid'), now = lightness(sheet, style), flat = lightness({ ...sheet, source: undefined }, style)
    const change = now.map((value, i) => value - flat[i]).filter((value) => !Number.isNaN(value))
    const mean = change.reduce((sum, v) => sum + v, 0) / change.length
    const spread = Math.sqrt(change.reduce((sum, v) => sum + (v - mean) ** 2, 0) / change.length)
    console.info('SOURCE', style, JSON.stringify({ count: change.length, mean, spread }))
    expect(change.length).toBeGreaterThan(2000)
    expect(spread).toBeGreaterThanOrEqual(KEPT * MAIN)
    expect(spread).toBeLessThanOrEqual(MAIN)
    expect(Math.abs(mean)).toBeLessThanOrEqual(1)
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
