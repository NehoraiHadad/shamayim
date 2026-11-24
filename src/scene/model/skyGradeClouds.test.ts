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
import { towerPaintProfile } from './towerPaintBounds'
import { towerOpacity, type CloudSprite } from './cloudSprite'

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
  const white = [1, 1, 1] as const, sprite: CloudSprite = { genus: 'cu', seed: 1, w: 40, under: 4, tall: 40, lean: 0, tau: 6, share: 1,
    body: white, shade: white, lit: white, litA: 0, toward: null, silver: 0, glow: 0, rains: false }
  const profile = towerPaintProfile(sprite)!
  const edge = Math.min(...profile.rows)
  expect(profile.alphaAt(-sprite.tall + 4)).toBeCloseTo(towerOpacity(sprite), 10)
  let previous = depth(clear)
  for (let i = -1; i <= 1; i++) {
    const state = { ...clear }
    cloudLayersForSky(state, BOX).push({
      kind: 'cloudCells', id: 'cloudCells.tower', lattice: 'tower', surface: 'sky', z: 7.95, soft: true, key: 'tower',
      bounds: { x: 0, y: 0, w: BOX.width, h: BOX.skyHeight },
      cells: [{ x: BOX.width / 2, y: middle - edge - i / 100, speed: 0, sprite }],
    })
    const k = depth(state)
    // At the soft edge's zero-slope endpoint, a hundredth of a pixel is below raster precision.
    expect(Math.abs(k - previous)).toBeLessThan(0.004)
    previous = k
  }
})

it('limits model cloud composites through concentration and visibility sweeps', () => {
  const weather = [[100, 3], ...Array.from({ length: 18 }, (_, i) => [140 + 50 * i, 3]), [1000, 3],
    ...Array.from({ length: 30 }, (_, i) => [400, i + 1])]
  const sweep = (pm10: number, visibilityKm: number) => {
    const world = frame(pm10, visibilityKm)
    const grade = skyGradeOf(world, BOX), clean = frame(0, visibilityKm)
    const sheet = sheetOf(world), clearSheet = sheetOf(clean)
    const stops = skyStops(world, BOX), cleanStops = skyStops(clean, BOX)
    let worst = Infinity
    for (const [row, y] of sheet.ys.entries()) {
      if (y > SKY_FILTER_MID * (BOX.landTop + world.relief.horizonY)) break
      const maxAlpha = (s: typeof sheet) => Math.max(...s.alpha.slice(row * s.xs.length, (row + 1) * s.xs.length))
      const alpha = maxAlpha(sheet) * (sheet.through?.[row] ?? 1)
      const behind = rgbOf(hexOf(stopAt(stops, y / BOX.skyHeight, mixSrgb)))
      const cleanBehind = rgbOf(hexOf(stopAt(cleanStops, y / BOX.skyHeight, mixSrgb)))
      const cleanAlpha = maxAlpha(clearSheet)
      for (const tone of ['body', 'shade', 'lit'] as const) {
        const composite = rgbOf(hexOf(mixSrgb(behind, sheet[tone], alpha)))
        const cleanComposite = hexOf(mixSrgb(cleanBehind, clearSheet[tone], cleanAlpha))
        const contrast = ratio(world.light.palette.ink, hexOf(filterAt(grade, y, composite)))
        const target = Math.min(4.6, ratio(clean.light.palette.ink, cleanComposite))
        expect(contrast, `PM10 ${pm10}, ${visibilityKm} km, row ${row}`).toBeGreaterThanOrEqual(target)
        worst = Math.min(worst, contrast)
      }
    }
    return worst
  }
  let worstPm = 140, worst = Infinity
  for (const [pm10, km] of weather) {
    const contrast = sweep(pm10, km)
    if (km === 3 && pm10 >= 140 && contrast < worst) {
      worstPm = pm10
      worst = contrast
    }
  }
  // One-fiftieth of the coarse concentration step, over the two adjacent intervals.
  for (let pm10 = Math.max(140, worstPm - 50); pm10 <= Math.min(1000, worstPm + 50); pm10++) sweep(pm10, 3)
}, 30_000)

it('eases a pale deck in from zero PM10 and solar-altitude weight', () => {
  const world = frame(), sheet = sheetOf(world), white = [1, 1, 1] as const
  const pale = { ...sheet, lattice: 'low' as const, body: white, shade: white, lit: white,
    alpha: sheet.alpha.map(() => 1), through: undefined }
  const withCover = (state: WorldState, cover: number) => {
    const layers = cloudLayersForSky(state, BOX)
    layers.splice(0, layers.length, { ...pale, alpha: pale.alpha.map(() => cover) })
    return depth(state)
  }
  // PM10 starts at 100 and ramps to 300. Use independent weight probes here
  // to hold the palette, opacity and geometry fixed while testing grade onset.
  for (const axis of ['pm10', 'sun'] as const) {
    let previous = 0
    for (let i = 0; i <= 70; i++) {
      const dustVeilPotential = axis === 'pm10' ? (i / 2000) ** 2 * (3 - 2 * i / 2000) : 1
      const altitude = axis === 'sun' ? 2.9 + i / 100 : world.bodies.sun.altitude
      const state = { ...world, air: { ...world.air, dustVeilPotential },
        bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } } }
      const k = withCover(state, 1)
      if (!i) expect(k).toBe(0)
      // Two hundredths of optical depth is under 2% change in green transmission.
      expect(Math.abs(k - previous)).toBeLessThan(0.02)
      previous = k
    }
  }
  for (const dustVeilPotential of [0.001, 0.01, 1]) {
    let previous = 0
    for (let i = 0; i <= 100; i++) {
      const state = { ...world, air: { ...world.air, dustVeilPotential } }
      const k = withCover(state, i / 100)
      if (i > 0) expect(Math.abs(k - previous)).toBeLessThan(0.05)
      expect(skyColours(state).bandWeight).toBeGreaterThan(0)
      previous = k
    }
  }
})
