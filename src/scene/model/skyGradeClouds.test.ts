import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { ratio } from '../../theme/contrast'
import type { WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersForSky } from './cloudLayers'
import { skyColours, skyStops, stopAt } from './skyColour'
import { SKY_FILTER_MID } from './skyFilter'
import { filterAt, skyGradeOf } from './skyGrade'
import { hexOf, mixSrgb, rgbOf } from './tone'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let ramon: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
})
afterAll(() => vi.unstubAllGlobals())

function frame(pm10 = 400, visibilityKm = 3) {
  return makeWorldBuilder()({ ...worldInput(ramon, '2026-11-17T12:00'),
    forced: { pm10, dust: pm10, visibilityKm } })
}

function sheetOf(world: WorldState) {
  const sheet = cloudLayersForSky(world, BOX).find(layer => layer.kind === 'cloudSheet')
  if (!sheet) throw new Error('Missing Ramon cloud sheet')
  return sheet
}

const depth = (world: WorldState) => skyGradeOf(world, BOX)?.k ?? 0

it('keeps one sparse cloud node continuous from zero to one percent opacity', () => {
  const world = frame()
  let previous = depth({ ...world, clouds: [], cloudField: undefined })
  for (let i = 0; i <= 100; i++) {
    const sparse = { ...world }
    const layers = cloudLayersForSky(sparse, BOX)
    const sheet = sheetOf(sparse)
    layers.splice(0, layers.length, { ...sheet, alpha: sheet.alpha.map((_, j) => j === 0 ? i / 10_000 : 0) })
    const k = depth(sparse)
    // A 0.01-point alpha step moves each input channel by at most 1/10,000.
    // One filter half-byte at mid-grey is a looser bound than that perturbation.
    expect(Math.abs(k - previous), `opacity ${i / 10_000}`).toBeLessThan(0.004)
    previous = k
  }
})

it('keeps tower grade continuous as its crown enters the middle row', () => {
  const world = frame()
  const clear = { ...world, clouds: [], cloudField: undefined }
  const middle = (BOX.landTop + world.relief.horizonY) * SKY_FILTER_MID
  const white = [1, 1, 1] as const
  let previous = depth(clear)
  for (let i = -1; i <= 1; i++) {
    const state = { ...clear }
    cloudLayersForSky(state, BOX).push({
      kind: 'cloudCells', id: 'cloudCells.tower', lattice: 'tower', surface: 'sky', z: 7.95, soft: true, key: 'tower',
      bounds: { x: 0, y: 0, w: BOX.width, h: BOX.skyHeight },
      cells: [{ x: BOX.width / 2, y: middle + 40, speed: 0, sprite: {
        genus: 'cu', seed: 1, w: 40, under: 4, tall: 40 + i / 100, lean: 0, tau: 6, share: 1,
        body: white, shade: white, lit: white, litA: 0, toward: null, silver: 0, glow: 0, rains: false,
      } }],
    })
    const k = depth(state)
    // A hundredth of a pixel is at most 0.0005 of the half-column ramp.
    expect(Math.abs(k - previous)).toBeLessThan(0.004)
    previous = k
  }
})

it('limits model cloud composites through concentration and visibility sweeps', () => {
  const weather = [...Array.from({ length: 29 }, (_, i) => [100 + 25 * i, 3]),
    ...Array.from({ length: 30 }, (_, i) => [400, i + 1])]
  for (const [pm10, visibilityKm] of weather) {
    const world = frame(pm10, visibilityKm)
    const grade = skyGradeOf(world, BOX)
    // Zero dust weight uses the original sky and cloud styling.
    if (!skyColours(world).bandWeight) continue
    const sheet = sheetOf(world)
    const stops = skyStops(world, BOX)
    for (const [row, y] of sheet.ys.entries()) {
      if (y > SKY_FILTER_MID * (BOX.landTop + world.relief.horizonY)) break
      const nodes = sheet.alpha.slice(row * sheet.xs.length, (row + 1) * sheet.xs.length)
      const alpha = Math.max(...nodes) * (sheet.through?.[row] ?? 1)
      const behind = rgbOf(hexOf(stopAt(stops, y / BOX.skyHeight, mixSrgb)))
      for (const cloud of [sheet.body, sheet.shade, sheet.lit]) {
        const composite = rgbOf(hexOf(mixSrgb(behind, cloud, alpha)))
        expect(ratio(world.light.palette.ink, hexOf(filterAt(grade, y, composite))),
          `PM10 ${pm10}, ${visibilityKm} km, row ${row}`).toBeGreaterThanOrEqual(4.6)
      }
    }
  }
}, 30_000)
