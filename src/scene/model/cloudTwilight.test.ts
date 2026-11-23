import { beforeAll, expect, it } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LocalTime } from '../../domain/types'
import type { WorldInput } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { hexOf, labOf } from './tone'
import type { LayerOf, RGB } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES]
    .filter(({ id }) => ['haifa', 'neve-zohar'].includes(id)))
})

function frame(id: string, at: LocalTime, over: Partial<WorldInput> = {}, build = makeWorldBuilder()) {
  const world = build({ ...worldInput(loaded.get(id)!, at), ...over })
  const sheets = cloudLayersOf(world, box).filter((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet')
  return { altitude: world.bodies.sun.altitude, sheets, world }
}

function tone(rgb: RGB) {
  const { l, a, b } = labOf(rgb)
  return { rgb: hexOf(rgb), l, h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, c: Math.hypot(a, b) }
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
  // Compare Cartesian chroma so near-neutral colours have no unstable hue-angle denominator.
  for (const endpoint of [body, shade]) {
    expect(Math.hypot(lit.a - endpoint.a, lit.b - endpoint.b)).toBeLessThan(0.002)
  }
})

it('tracks the sheet tones through sunset in near-clear and broken cover', () => {
  const rows = ([undefined, { low: 0.15, mid: 0, high: 0 }, { low: 0.5, mid: 0.5, high: 0.25 }] as const)
    .map((forcedLayers) => {
      const build = makeWorldBuilder()
      return Array.from({ length: 13 }, (_, i) => {
        const min = 15 * 60 + 30 + i * 10
        const at = `2026-11-17T${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}` as LocalTime
        const { altitude, sheets } = frame('haifa', at, { forcedLayers }, build)
        return { at, altitude, layers: sheets.map(({ lattice, lit, shade, body }) => ({
          lattice, lit: tone(lit), body: tone(body), shade: tone(shade),
        })) }
      })
    })
  const maxSteps: number[] = []
  for (const series of rows) {
    expect(series[0].altitude).toBeGreaterThan(5)
    expect(series[series.length - 1].altitude).toBeLessThan(-8)
    const steps = series.slice(1).flatMap((next, i) => {
      const prev = series[i]
      if (next.altitude > 5 || prev.altitude < -8) return []
      const before = prev.layers.find(({ lattice }) => lattice === 'low')
      const after = next.layers.find(({ lattice }) => lattice === 'low')
      expect(before && after, next.at).toBeTruthy()
      return Math.abs(after!.lit.l - before!.lit.l)
    })
    expect(steps.length).toBeGreaterThan(3)
    maxSteps.push(Math.max(...steps))
  }
  console.log(JSON.stringify({
    haifa: rows[0].slice(0, 10).map(({ at, altitude, layers }) => ({ at, altitude,
      lit: Object.fromEntries(layers.map(({ lattice, lit }) => [lattice, lit])),
    })),
    maxSteps: { observed: maxSteps[0], nearClear: maxSteps[1], broken: maxSteps[2] },
  }))
  for (const max of maxSteps) expect(max).toBeLessThanOrEqual(0.05)
})

it('records which face receives low-angle light at the drawn morning case', () => {
  const { altitude, sheets, world } = frame('haifa', '2026-03-15T07:00')
  console.log(JSON.stringify({ morning: { altitude, layers: sheets.map((sheet) => ({
    lattice: sheet.lattice, drawnLowSun: 'lowSun' in sheet ? sheet.lowSun : 0,
    underside: world.clouds.find(({ level }) => level === sheet.lattice)?.litUnderside,
    body: tone(sheet.body), lit: tone(sheet.lit),
  })) } }))
  expect(sheets.length).toBeGreaterThan(0)
})
