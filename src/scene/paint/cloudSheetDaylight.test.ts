import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { daylitShare } from '../../domain/cloudDaylight'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { buildField } from '../../world/field/field'
import { MOON_RGB } from '../../world/light'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { dustSky, inDust } from '../model/cloudDust'
import { cloudSheetOf, DIFFUSE_EXTINCTION } from '../model/cloudSheet'
import { gridFor } from '../model/cloudSheetGrid'
import { textureCorrection } from '../model/cloudSheetTexture'
import { sunlitTone } from '../model/cloudSunlit'
import { skyGeom } from '../model/sky'
import type { LayerOf, RGB } from '../model/types'
import { painterOf, SCENE_STYLES } from './painters'
import type { Ctx2D, PaintEnv } from './shared/base/hand'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const colours = { body: [0.57, 0.6, 0.64], shade: [0.37, 0.4, 0.44], lit: MOON_RGB, light: 0 } as const
const horizon: RGB = [0.7, 0.63, 0.54]
const sky = [colours.shade, colours.body, horizon] as const
type Sheet = LayerOf<'cloudSheet'>

function fixture(lattice: 'low' | 'mid') {
  const placeId = 'cellular-daylight'
  const field = buildField({
    placeId, at: '2026-11-17T12:00', hours: [], covers: { low: 0.74, mid: 0.63, high: 0 },
    lowBaseKm: 1.1, elevationKm: 0.05, weatherCode: 3,
    sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
  })
  const snapshot = layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1])
  expect(snapshot.layer).toBeDefined()
  const data = { ...snapshot.densityGrid, resolvedTauAt: () => 3, expectedTauAt: () => 1 }
  const sample = { ...snapshot, densityGrid: data }
  function frame(altitude: number, dusty: boolean, lit = colours.lit) {
    const world = {
      place: { id: placeId }, camera: SCENE_CAMERA, relief: { y: (angle: number) => terrainY(128, angle) },
      bodies: { sun: { azimuth: 180, altitude } },
      light: { palette: { horizon: '#B3A18A' }, diffuse: 0.2 },
      air: { visibilityKm: dusty ? 3 : 40, dustWeight: Number(dusty), dustVeilPotential: Number(dusty), fade: () => 0 },
    } as unknown as WorldState
    const geom = skyGeom(world, box)
    const daylit = daylitShare(altitude)
    const sheet = cloudSheetOf(world, geom, sample, {
      daylit, light: 0, body: inDust(world, colours.body), shade: inDust(world, colours.shade),
      lit: inDust(world, sunlitTone(world, snapshot.heightKm, 0.5, colours.body, lit)),
    })
    expect(sheet?.genus).toBe(lattice === 'low' ? 'sc' : 'ac')
    return { sheet: sheet!, world, geom }
  }
  return { frame, snapshot }
}

/** Read back the sampled grid and independently evaluate its uncorrected cellular source with zero direct sunlight. */
function uncorrected({ sheet, world, geom }: ReturnType<ReturnType<typeof fixture>['frame']>,
  snapshot: ReturnType<typeof fixture>['snapshot']) {
  const grid = gridFor(world.place.id, snapshot.layer!, geom, snapshot.heightKm, sheet.lattice === 'low' ? 'sc' : 'ac')
  const { texture, tau, weights, xs, detail, slant, fade, expected } = grid
  const corrected = textureCorrection(texture, tau, weights, xs.length, detail)
  const diffuse = (depth: number) => 1 - 1 / (1 + DIFFUSE_EXTINCTION * depth)
  return sheet.tone.map((_, index) => {
    const row = Math.floor(index / xs.length)
    const resolved = (1 - fade[row]) * -Math.expm1(-tau[index] * slant[row])
    const unresolved = fade[row] * -Math.expm1(-expected[index])
    const local = diffuse(tau[index] * slant[row] * corrected(index))
    const { kappa, meanVKm } = snapshot.layer!
    const far = 1 - 1 / (1 + DIFFUSE_EXTINCTION * kappa * meanVKm * slant[row])
    return resolved + unresolved ? (resolved * local + unresolved * far) / (resolved + unresolved) : local
  })
}

function maxStep(a: readonly number[], b: readonly number[]) {
  return a.reduce((max, channel, i) => Math.max(max, Math.abs(channel - b[i])), 0)
}

it.each(['low', 'mid'] as const)('keeps every %s sheet tone continuous across the daylight gates', (lattice) => {
  const { frame } = fixture(lattice)
  for (const dusty of [false, true]) {
    let previous: number[] | undefined
    let previousThrough: number[] | undefined
    for (let altitude = -8; altitude <= 9; altitude += 0.25) {
      const current = frame(altitude, dusty, horizon)
      const { sheet, world } = current
      if (altitude <= 3) {
        expect(sheet.daylit).toBeUndefined()
        expect(sheet.through).toBeUndefined()
        expect(dustSky(world, sky)).toEqual(sky)
      }
      const channels = [...sheet.tone, ...sheet.body, ...sheet.shade, ...sheet.lit, ...dustSky(world, sky).flat()]
      // Bound a quarter-degree change to 5% of the unit tone or RGB range.
      if (previous) expect(maxStep(channels, previous), `${altitude}°, dusty=${dusty}`).toBeLessThan(0.05)
      previous = channels
      const through = sheet.through ?? sheet.ys.map(() => 1)
      // Maximum smoothstep slope (1.5 / 4°) × 0.25° plus a hundredth for rounding.
      if (previousThrough) expect(maxStep(through, previousThrough)).toBeLessThan(0.104)
      previousThrough = through
    }
  }
}, 30_000)

function pixels(style: (typeof SCENE_STYLES)[number], sheet: Sheet) {
  let result: Uint8ClampedArray | undefined
  const ctx = { save() {}, restore() {}, drawImage() {} } as unknown as Ctx2D
  const env = { hand: { grain: 1 }, phase: 0, scale: 1, canvas: () => ({
    canvas: {}, ctx: {
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
      putImageData: (image: ImageData) => { result = image.data },
    },
  }) } as unknown as PaintEnv
  painterOf(sheet, style)?.form(ctx, sheet, env)
  expect(result?.some((channel, i) => i % 4 === 3 && channel > 0)).toBe(true)
  return result!
}

it.each(['low', 'mid'] as const)('renders the %s sheet with uncorrected pixels after civil twilight and by moonlight', (lattice) => {
  const { frame, snapshot } = fixture(lattice)
  // Sample just beyond civil twilight with a residual twilight tint, then with the moon's colour.
  for (const [altitude, lit] of [[-7, horizon], [-18, colours.lit]] as const) {
    const current = frame(altitude, false, lit)
    const reference = { ...current.sheet, tone: uncorrected(current, snapshot) }
    for (const style of SCENE_STYLES) expect(pixels(style, current.sheet)).toEqual(pixels(style, reference))
  }
})

it('keys the transmission that reaches the raster even when every other input is identical', () => {
  const { frame, snapshot } = fixture('low')
  const clean = frame(9, false)
  const dusty = frame(9, true)
  const sameColours = { ...colours, daylit: 1 }
  const clearSheet = cloudSheetOf(clean.world, clean.geom, snapshot, sameColours)
  const dustSheet = cloudSheetOf(dusty.world, dusty.geom, snapshot, sameColours)
  expect(clearSheet).toBeDefined()
  expect(dustSheet?.through).toBeDefined()
  const { key, through, ...rest } = dustSheet!
  const { key: clearKey, ...clearRest } = clearSheet!
  expect(rest).toEqual(clearRest)
  expect(through).toEqual(through!.map((value) => Math.round(value * 100) / 100))
  expect(key).not.toBe(clearKey)
})
