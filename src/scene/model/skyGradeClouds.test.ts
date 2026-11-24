import { expect, it } from 'vitest'
import { skyContrastCeiling } from '../../theme/contrast'
import type { WorldState } from '../../world/types'
import { cloudLayersForSky } from './cloudLayers'
import { sheetPaintBound } from './cloudPaintBounds'
import { towerOpacity, type CloudSprite } from './cloudSprite'
import { skyColours, skyStops, stopAt } from './skyColour'
import { SKY_FILTER_MID, skyFilterReserve, skyFilterTransmission } from './skyFilter'
import { skyGradeOf } from './skyGrade'
import { BOX, sheetOf, skyGradeCloudFixture } from './skyGradeCloudFixture'
import { mixSrgb } from './tone'
import { towerPaintProfile } from './towerPaintBounds'

const { frame } = skyGradeCloudFixture()

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

it('eases a pale deck in from zero PM10 and solar-altitude weight', () => {
  const world = frame(), sheet = sheetOf(world), white = [1, 1, 1] as const
  const pale = { ...sheet, lattice: 'low' as const, body: white, shade: white, lit: white,
    alpha: sheet.alpha.map(() => 1), through: undefined }
  const clear = { ...world, clouds: [], cloudField: undefined }
  const paintedAlpha = sheetPaintBound(pale).alpha
  const withCover = (state: WorldState, cover: number) => {
    cloudLayersForSky(state, BOX).push({ ...pale, alpha: pale.alpha.map(() => cover) })
    return depth(state)
  }
  // PM10 starts at 100 and ramps to 300. Use independent weight probes here
  // to hold the palette, opacity and geometry fixed while testing grade onset.
  for (const axis of ['pm10', 'sun'] as const) {
    let previous = 0
    for (let i = 0; i <= 70; i++) {
      const dustVeilPotential = axis === 'pm10' ? (i / 2000) ** 2 * (3 - 2 * i / 2000) : 1
      const altitude = axis === 'sun' ? 2.9 + i / 100 : world.bodies.sun.altitude
      const state = { ...clear, air: { ...world.air, dustVeilPotential },
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
    const sky = { ...clear, air: { ...world.air, dustVeilPotential } }
    const slope = paleDepthSlope(sky)
    for (let i = 0; i <= 100; i++) {
      const state = { ...sky }
      const k = withCover(state, i / 100)
      if (i > 0) {
        const step = Math.abs(paintedAlpha(i / 100) - paintedAlpha((i - 1) / 100))
        expect(Math.abs(k - previous), `dust ${dustVeilPotential}, cover ${i / 100}`)
          .toBeLessThan(Math.max(0.004, slope * step))
      }
      expect(skyColours(state).bandWeight).toBeGreaterThan(0)
      previous = k
    }
  }
})

function paleDepthSlope(world: WorldState) {
  const white = [1, 1, 1] as const
  const floor = Math.min(skyContrastCeiling(world.light.palette.ink), skyContrastCeiling('#E8F9FF'))
    - skyFilterReserve(white)
  const middle = SKY_FILTER_MID * (BOX.landTop + world.relief.horizonY) / BOX.skyHeight
  const stops = skyStops(world, BOX)
  const anchors = [...stops.filter(([row]) => row <= middle).map(([, rgb]) => rgb), stopAt(stops, middle, mixSrgb)]
  // The brightest ramp endpoint bounds the sRGB luminance derivative, including the reserve's lifted input.
  const halfByte = 1 / (2 * 255)
  const maxSlope = (2.4 / 1.055) * (1 + halfByte) * ((1 + halfByte * (3 + halfByte) + 0.055) / 1.055) ** 1.4
  const luminancePerAlpha = maxSlope * Math.max(...anchors.map(([r, g, b]) => 1 - (0.2126 * r + 0.7152 * g + 0.0722 * b)))
  // In the knee the target loses at most dr/dalpha. At the root, L >= floor
  // and c L'(c) >= 2 L(c) - .005 (largest deficit at c = .1375).
  const luminancePerDepth = -Math.log(skyFilterTransmission(1, 0)[0]) * (2 * floor - 0.005)
  return luminancePerAlpha / luminancePerDepth
}
