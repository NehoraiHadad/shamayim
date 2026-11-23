import { beforeAll, expect, it } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import type { WorldInput } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { labOf } from './tone'
import type { LayerOf, RGB } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES]
    .filter(({ id }) => ['haifa', 'neve-zohar', 'ramon-crater'].includes(id)))
}, 120_000)

function frame(id: string, at: LocalTime, over: Partial<WorldInput> = {}, build = makeWorldBuilder()) {
  const world = build({ ...worldInput(loaded.get(id)!, at), ...over })
  const sheets = cloudLayersOf(world, box).filter((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet')
  return { altitude: world.bodies.sun.altitude, sheets, world }
}

function tone(rgb: RGB) {
  const { l, a, b } = labOf(rgb)
  return { l, h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, c: Math.hypot(a, b) }
}

it('keeps the lit endpoint above the body without olive or straw tones', () => {
  for (const [id, at] of [['haifa', '2026-11-17T15:30'], ['neve-zohar', '2026-11-17T16:00'], ['haifa', '2026-11-17T16:30']] as const) {
    const { sheets } = frame(id, at)
    expect(sheets.some(({ lattice }) => lattice === 'low')).toBe(true)
    for (const { lit, body, id: layer } of sheets) {
      expect(tone(lit).l, layer).toBeGreaterThanOrEqual(tone(body).l - 0.002)
      const { h, c } = tone(lit)
      if (c > 0.02) expect(h < 92 || h > 240, layer).toBe(true)
    }
  }
})

it('gives the shadowed low deck a single chromaticity across the sunset patch', () => {
  const { sheets } = frame('haifa', '2026-11-17T16:30')
  const low = sheets.find(({ lattice }) => lattice === 'low')!
  const [lit, body, shade] = [low.lit, low.body, low.shade].map(labOf)
  // Compare chromaticity at equal lightness. A shaded face receives less of the same fill.
  for (const endpoint of [body, shade]) {
    expect(Math.hypot(lit.a / lit.l - endpoint.a / endpoint.l, lit.b / lit.l - endpoint.b / endpoint.l)).toBeLessThan(0.004)
  }
})

const sunsets = ['2026-11-17T16:35', '2026-03-15T17:50'] as const
const covers = [
  { low: 0.15, mid: 0.15, high: 0.15 },
  { low: 0.5, mid: 0.5, high: 0.25 },
]
const sweeps = ['haifa', 'ramon-crater'].flatMap((id) => sunsets.flatMap((at) =>
  covers.map((forcedLayers) => ({ id, at, forcedLayers }))))

it.each(sweeps)('tracks lit and body lightness through sunset at $id $at ($forcedLayers.low low cover)', ({
  id, at, forcedLayers,
}) => {
  const build = makeWorldBuilder()
  const input = worldInput(loaded.get(id)!, at)
  const rows = Array.from({ length: 13 }, (_, i) => {
    const selected = addMinutes(at, (i - 6) * 10)
    const { low, mid, high } = forcedLayers
    const cloudCover = 100 * (1 - (1 - low) * (1 - mid) * (1 - high))
    const world = build({ ...input, selected, forcedLayers, forced: { cloudCover, precipitation: 0 } })
    return { selected, altitude: world.bodies.sun.altitude, sheets: cloudLayersOf(world, box)
      .filter((layer): layer is LayerOf<'cloudSheet'> => layer.kind === 'cloudSheet') }
  })
  expect(rows[0].altitude).toBeGreaterThan(5)
  expect(rows.at(-1)!.altitude).toBeLessThan(-8)
  const pairs = rows.slice(1).map((next, i) => ({ next, prev: rows[i] }))
    .filter(({ next, prev }) => next.altitude <= 5 && prev.altitude >= -8)
  expect(pairs.length).toBeGreaterThan(3)
  for (const lattice of ['low', 'mid', 'high']) {
    for (const { next, prev } of pairs) {
      const a = prev.sheets.find((sheet) => sheet.lattice === lattice)
      const b = next.sheets.find((sheet) => sheet.lattice === lattice)
      expect(a && b, lattice).toBeTruthy()
      for (const endpoint of ['lit', 'body'] as const) {
        const step = Math.abs(labOf(b![endpoint]).l - labOf(a![endpoint]).l)
        expect(step, `${next.selected} ${lattice} ${endpoint}, ${prev.altitude} → ${next.altitude}°`).toBeLessThanOrEqual(0.05)
      }
    }
  }
}, 30_000)

it('uses the direct-light share to turn drawn relief toward the March morning sun', () => {
  const { altitude, sheets, world } = frame('haifa', '2026-03-15T07:00')
  expect(altitude).toBeGreaterThan(0)
  const cloud = world.clouds.find(({ level }) => level === 'low')!
  const low = sheets.find(({ lattice }) => lattice === 'low')!
  expect(cloud.litUnderside).toBeGreaterThan(0)
  expect(low.lowSun ?? 0).toBeGreaterThan(0)
  expect(low.lowSun!).toBeLessThanOrEqual(cloud.litUnderside + 1 / 255)
})
