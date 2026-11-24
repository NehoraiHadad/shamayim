import { beforeAll, expect, it, vi } from 'vitest'
import * as interpolation from '../../domain/smoothstep'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LocalTime } from '../../domain/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { labOf, mixRgb } from './tone'
import type { LayerOf, RGB } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(({ id }) => ['haifa', 'neve-zohar', 'tiberias'].includes(id)))
}, 120_000)

function frame(id: string, at: LocalTime) {
  const world = makeWorldBuilder()(worldInput(loaded.get(id)!, at))
  const sheets = cloudLayersOf(world, box).filter((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet')
  expect(sheets.length).toBeGreaterThan(0)
  return { altitude: world.bodies.sun.altitude, sheets, world }
}

function tone(rgb: RGB) {
  const { l, a, b } = labOf(rgb)
  return { l, h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, c: Math.hypot(a, b) }
}

it.each([['haifa', '2026-11-17T15:30'], ['neve-zohar', '2026-11-17T16:00'], ['haifa', '2026-03-15T07:00']] as const)(
  'a daylit sheet is never darker than its body, nor olive, at %s %s', (id, at) => {
    const { sheets, altitude } = frame(id, at)
    expect(altitude).toBeGreaterThan(6)
    expect(sheets.length).toBeGreaterThan(1)
    expect(sheets.every(({ daylit }) => daylit! > 0.9)).toBe(true)
    for (const { lit, body, shade, id: layer } of sheets) {
      expect(tone(lit).l, layer).toBeGreaterThanOrEqual(tone(body).l - 0.002)
      // White to cream: a low sun's warmth, never a saturated straw (a sunlit white stays within C .05 of grey).
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const { h, c } = tone(t < 0.5 ? mixRgb(lit, body, t * 2) : mixRgb(body, shade, t * 2 - 1))
        expect(c, layer).toBeLessThan(0.05)
        if (c > 0.02) expect(h < 96 || h > 230, `${layer} hue ${h}`).toBe(true)
      }
    }
  }, 60_000)

it('keeps the twilight palette below 3° with zero daylight tone weight', () => {
  const { sheets, altitude } = frame('haifa', '2026-11-17T16:30')
  expect(altitude).toBeLessThan(3)
  expect(sheets.every(({ daylit }) => !daylit)).toBe(true)
  const mid = sheets.find(({ lattice }) => lattice === 'mid')
  expect(mid).toBeDefined()
  expect(tone(mid!.lit).c).toBeGreaterThan(0.08)
  expect(tone(mid!.lit).h).toBeLessThan(40)
})

it('raises the tone of an opaque cellular texel in the recorded Haifa 16:30 world', () => {
  const { sheets, altitude, world } = frame('haifa', '2026-11-17T16:30')
  expect(altitude).toBeCloseTo(1.4, 0)
  const { smoothstep } = interpolation
  const recovery = vi.spyOn(interpolation, 'smoothstep').mockImplementation((low, high, altitude) =>
    low === -6 && high === -3 ? 0 : smoothstep(low, high, altitude))
  try {
    // The same world, snapshots and palette isolate recovery and exercise the pre-raster cache.
    const uncorrected = cloudLayersOf(world, box)
    let largestLift = 0
    for (const sheet of sheets) {
      if (sheet.genus !== 'sc' && sheet.genus !== 'ac') continue
      const reference = uncorrected.find((layer): layer is LayerOf<'cloudSheet'> =>
        layer.kind === 'cloudSheet' && layer.id === sheet.id)!
      expect(sheet.alpha).toEqual(reference.alpha)
      const lift = sheet.tone.reduce((max, value, index) =>
        sheet.alpha[index] >= 0.98 ? Math.max(max, value - reference.tone[index]) : max, 0)
      if (lift > 0) expect(sheet.key).not.toBe(reference.key)
      largestLift = Math.max(largestLift, lift)
    }
    expect(largestLift).toBeGreaterThan(0)
  } finally {
    recovery.mockRestore()
  }
})

it.each([['haifa', '2026-11-17T14:30'], ['tiberias', '2026-11-17T15:30']] as const)('lights no opaque column of a daylit low deck as a thin one, at %s %s', (id, at) => {
  const { altitude, sheets } = frame(id, at)
  expect(altitude).toBeGreaterThanOrEqual(7)
  const low = sheets.find(({ lattice }) => lattice === 'low')
  expect(low).toBeDefined()
  const { alpha, tone: tones, ys, xs } = low!
  const opaque: number[] = []
  // The upper sky, where a cell is wide on the screen and one node's colour is a patch.
  for (let n = 0; n < ys.length * xs.length; n++) if (ys[Math.floor(n / xs.length)] < 240 && alpha[n] >= 0.98) opaque.push(tones[n])
  expect(opaque.length).toBeGreaterThan(50)
  expect(Math.min(...opaque)).toBeGreaterThan(0.15)
}, 60_000)
