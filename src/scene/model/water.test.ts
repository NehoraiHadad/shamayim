import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { deltaE } from '../../theme/oklab'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { xOf } from '../../domain/camera'
import { SCENE_W } from '../../world/sceneBox'
import { facetShare } from '../../world/water'
import type { WorldInput } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import { aerialFor, hazeOf } from './landVeil'
import { hexOf } from './tone'
import type { Box, LayerOf, RGB, SceneBox, SceneModel } from './types'
import { fresnel } from './water'

/**
 * Stage C3 (docs/design/CANVAS-SCENE-PLAN.md §4): the water, the far towns and the haze band, structurally, over the 8
 * baseline places.
 */
const DAY = '2026-11-17'
const HOURS = ['06:20', '07:30', '08:00', '12:00', '15:00', '16:30', '21:00', '23:30']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

const at = (hour: string) => `${DAY}T${hour}` as LocalTime
/** One builder per place keeps its terrain, place and marks across hours (the world's own memoisation). */
const builders = new Map<string, ReturnType<typeof makeWorldBuilder>>()
const world = (id: string, hour: string, forced: WorldInput['forced'] = null) => {
  if (!builders.has(id)) builders.set(id, makeWorldBuilder())
  return builders.get(id)!({ ...worldInput(loaded.get(id)!, at(hour)), forced })
}
const waterOf = (model: SceneModel) => layersOn(model, 'land').filter((l): l is LayerOf<'water'> => l.kind === 'water')
const townsOf = (model: SceneModel) => layersOn(model, 'land').find((l): l is LayerOf<'farCities'> => l.kind === 'farCities')
const de = (a: RGB, b: RGB) => deltaE(hexOf(a), hexOf(b))
const overlaps = (clear: readonly Box[], x: number, y: number, w: number, h: number) =>
  clear.some((b) => x < b.x + b.w - 0.01 && x + w > b.x + 0.01 && y < b.y + b.h - 0.01 && y + h > b.y + 0.01)

describe('water', () => {
  it('is drawn only where the world has water in view, at its true bearings', { timeout: 30000 }, () => {
    for (const { id } of SCENE_PLACES) {
      const w = world(id, '12:00')
      const bands = waterOf(sceneModel(w, BOX)).flatMap((l) => l.bands)
      expect(bands.length, id).toBe(w.water.spans.length)
      const ranges = bands.map((band) => band.far.map(([x]) => x)).map((xs) => [Math.min(...xs), Math.max(...xs)])
      for (const span of w.water.spans) {
        const from = span.from * BOX.width / SCENE_W, to = span.to * BOX.width / SCENE_W
        expect(ranges.some(([a, b]) => Math.abs(a - from) < 1e-6 && Math.abs(b - to) < 1e-6), id).toBe(true)
      }
    }
    // The plan's acceptance: water at Tiberias, Ein Gedi and Haifa; none at Tel Aviv, Jerusalem, Rosh Pina, Shadmot.
    for (const id of ['tiberias', 'ein-gedi', 'haifa']) expect(world(id, '12:00').water.spans.length, id).toBeGreaterThan(0)
    for (const id of ['tel-aviv', 'jerusalem', 'rosh-pina', 'shadmot-mehola']) {
      expect(waterOf(sceneModel(world(id, '12:00'), BOX)).flatMap((l) => l.bands), id).toEqual([])
    }
  })

  it('keeps the sea-level datum to places below sea level', () => {
    for (const { id } of SCENE_PLACES) {
      const w = world(id, '12:00')
      const datum = waterOf(sceneModel(w, BOX)).find((l) => l.datum)?.datum
      // Only below sea level (the fixture's height is below it everywhere), where the land reaches 0 m above the dot.
      expect(Boolean(datum), id).toBe(w.labels.below && Boolean(w.labels.datum))
      // The place's own datum (`world/datum.ts`): sea level drawn where its picture puts 0 m, above the dot.
      if (datum) {
        expect(datum.y, id).toBe(w.labels.datum!.y)
        expect(datum.y, id).toBeLessThan(w.place3.dot.y)
      }
    }
  })

  it('glints only under a light that stands over the water and above the land', { timeout: 60000 }, () => {
    let seen = 0
    for (const { id } of SCENE_PLACES) {
      const input = worldInput(loaded.get(id)!, at('12:00'))
      const build = makeWorldBuilder()
      for (const hour of HOURS) {
        const w = build({ ...input, selected: at(hour) })
        const glints = waterOf(sceneModel(w, BOX)).flatMap((l) => l.glints)
        if (!glints.length) continue
        seen++
        const { light, lit } = w.water
        expect(lit, `${id} ${hour}`).toBe(true)
        expect(light!.altitude, `${id} ${hour}`).toBeGreaterThan(0)
        const x = xOf(light!.azimuth, w.camera) * BOX.width / SCENE_W
        for (const g of glints) {
          expect(g.x, `${id} ${hour}`).toBeCloseTo(x, 3)
          const span = w.water.spans.find((s) => x >= s.from * BOX.width / SCENE_W && x <= s.to * BOX.width / SCENE_W)
          expect(span, `${id} ${hour}`).toBeTruthy()
        }
        // A sun behind the land (or under the horizon) leaves the water in shade.
        if (light!.altitude > 0 && w.bodies.sun.up && !w.bodies.sun.overLand && !w.water.byMoon) throw new Error(`${id} ${hour}`)
      }
    }
    expect(seen).toBeGreaterThan(0)
    // The plan's acceptance: strong at 07:30 over the Kinneret and the Dead Sea, gone at noon (the sun too high).
    for (const id of ['tiberias', 'ein-gedi']) {
      const morning = waterOf(sceneModel(world(id, '07:30', { cloudCover: 10, thickCloud: 0 }), BOX)).flatMap((l) => l.glints)
      expect(morning.length, id).toBe(1)
      expect(morning[0].alpha, id).toBeGreaterThan(0.3)
      expect(waterOf(sceneModel(world(id, '12:00', { cloudCover: 10, thickCloud: 0 }), BOX)).flatMap((l) => l.glints), id).toEqual([])
    }
  })

  it('takes the glint\'s strength and width from the one wind', () => {
    // The flat mirror sends the light back where the depression equals the altitude; more wind spreads it.
    expect(facetShare(10, 10, 5)).toBeCloseTo(1, 6)
    expect(facetShare(14, 0.3, 1)).toBeLessThan(facetShare(14, 0.3, 8))
    const calm = waterOf(sceneModel(world('ein-gedi', '07:30', { cloudCover: 0, thickCloud: 0, windSpeed: 2 }), BOX)).flatMap((l) => l.glints)
    const windy = waterOf(sceneModel(world('ein-gedi', '07:30', { cloudCover: 0, thickCloud: 0, windSpeed: 40 }), BOX)).flatMap((l) => l.glints)
    expect(calm.length).toBe(1)
    expect(windy.length).toBe(1)
    expect(windy[0].spread).toBeGreaterThan(calm[0].spread)
  })

  it('mirrors the sky at the horizon, more of its own dark nearer the eye (Fresnel)', () => {
    expect(fresnel(0.5)).toBeGreaterThan(0.9)
    expect(fresnel(10)).toBeLessThan(0.45)
    expect(fresnel(90)).toBeCloseTo(0.02, 2)
    for (let d = 0.2; d < 40; d += 2) expect(fresnel(d + 2)).toBeLessThan(fresnel(d))
  })

  it('ruffles with the wind: more ripples, shorter, in more wind', () => {
    const ripples = (kmh: number) => {
      const layer = waterOf(sceneModel(world('ein-gedi', '12:00', { windSpeed: kmh }), BOX))
      const all = layer.flatMap((l) => [...l.ruffle.lit, ...l.ruffle.shade])
      return { n: all.length, w: all.reduce((sum, s) => sum + s.w, 0) / all.length }
    }
    const calm = ripples(3), windy = ripples(40)
    expect(windy.n).toBeGreaterThan(calm.n)
    expect(windy.w).toBeLessThan(calm.w)
  })
})

describe('haze', () => {
  it('moves every tone on the land monotonically toward the air with distance', () => {
    for (const id of ['haifa', 'tiberias']) {
      for (const hour of ['08:00', '12:00', '21:00']) {
        const w = world(id, hour)
        const haze = hazeOf(w)
        const aerial = aerialFor(w, haze)
        for (const rgb of [[0.9, 0.85, 0.8], [0.1, 0.2, 0.25]] as RGB[]) {
          let last = Infinity
          for (const km of [1, 3, 6, 10, 15, 22, 30, 45]) {
            const d = de(aerial(rgb, km), haze)
            expect(d, `${id} ${hour} ${km}`).toBeLessThanOrEqual(last + 1e-9)
            last = d
          }
        }
      }
    }
  })

  it('takes the far towns toward the air tier by tier, and drops those past the visibility', () => {
    for (const id of ['tel-aviv', 'haifa']) {
      const w = world(id, '11:00')
      const towns = townsOf(sceneModel(w, BOX))!
      expect(towns, id).toBeTruthy()
      const haze = hazeOf(w)
      // Tiers come far to near; their distance from the air's colour grows as they come nearer.
      for (let i = 1; i < towns.tiers.length; i++) {
        expect(towns.tiers[i].km).toBeLessThan(towns.tiers[i - 1].km)
        expect(de(towns.tiers[i].unresolved, haze)).toBeGreaterThanOrEqual(de(towns.tiers[i - 1].unresolved, haze) - 1e-9)
      }
      const count = (t: LayerOf<'farCities'> | undefined) => t?.tiers.reduce((n, tier) => n + tier.blocks.length, 0) ?? 0
      const hazy = townsOf(sceneModel(world(id, '11:00', { visibilityKm: 6 }), BOX))
      expect(count(hazy), id).toBeLessThan(count(towns))
      for (const tier of hazy?.tiers ?? []) for (const b of tier.blocks) expect(b.km, id).toBeLessThanOrEqual(0.77 * 6)
    }
  })

  it('lays a band at the horizon that strengthens as the visibility falls', () => {
    const clear = sceneModel(world('haifa', '12:00', { visibilityKm: 40 }), BOX)
    const hazy = sceneModel(world('haifa', '12:00', { visibilityKm: 4 }), BOX)
    const band = (m: SceneModel) => layersOn(m, 'sky').find((l): l is LayerOf<'sky'> => l.kind === 'sky')!.band
    expect(band(hazy)!.alpha).toBeGreaterThan(band(clear)?.alpha ?? 0)
    expect(band(hazy)!.y).toBeCloseTo(BOX.landTop + world('haifa', '12:00').relief.horizonY, 6)
  })
})

describe('far towns', () => {
  it('stand by day and light their windows by night, from the far raster', () => {
    for (const id of ['tel-aviv', 'haifa']) {
      const day = townsOf(sceneModel(world(id, '11:00'), BOX))!
      expect(day.tiers.some((t) => t.blocks.length > 0), id).toBe(true)
      expect(day.tiers.some((t) => t.mass.some((m) => m.boxes.length > 0)), id).toBe(true)
      expect(day.lights, id).toEqual([])
      const night = townsOf(sceneModel(world(id, '21:00'), BOX))!
      expect(night.lights.length, id).toBeGreaterThan(10)
    }
    // No far raster in view: no towns.
    expect(townsOf(sceneModel(world('ramon-crater', '11:00'), BOX))).toBeUndefined()
  })

  it('keeps a lone built cell to a breath of tone: blocks rise only where the town is dense', () => {
    const towns = townsOf(sceneModel(world('haifa', '11:00'), BOX))!
    const blocks = towns.tiers.reduce((n, t) => n + t.blocks.length, 0)
    expect(blocks).toBeLessThan(world('haifa', '11:00').farCities.patches.length * 2)
  })
})

describe('text zones', () => {
  it('keep clear of ripples, glints, town blocks, masses and lights', { timeout: 60000 }, () => {
    for (const { id } of SCENE_PLACES) {
      for (const hour of ['07:30', '11:00', '21:00']) {
        const model = sceneModel(world(id, hour), BOX)
        const { clear } = model
        for (const layer of waterOf(model)) {
          for (const s of [...layer.ruffle.lit, ...layer.ruffle.shade]) expect(overlaps(clear, s.x, s.y - 0.3, s.w, 0.6), id).toBe(false)
          for (const g of layer.glints) for (const s of g.sparks) expect(overlaps(clear, s.x, s.y - 0.3, s.w, 0.6), id).toBe(false)
        }
        const towns = townsOf(model)
        for (const tier of towns?.tiers ?? []) {
          for (const b of tier.blocks) expect(overlaps(clear, b.x, b.base - b.h, b.w, b.h), id).toBe(false)
          for (const m of tier.mass.flatMap((step) => step.boxes)) expect(overlaps(clear, m.x, m.y, m.w, m.h), id).toBe(false)
        }
        for (const l of towns?.lights ?? []) expect(overlaps(clear, l.x - l.r, l.y - l.r, 2 * l.r, 2 * l.r), id).toBe(false)
      }
    }
  })
})

describe('determinism', () => {
  it('builds the same water and towns twice, and keys them by their inputs', () => {
    const a = sceneModel(world('haifa', '07:30'), BOX), b = sceneModel(world('haifa', '07:30'), BOX)
    expect(JSON.stringify(waterOf(a))).toBe(JSON.stringify(waterOf(b)))
    expect(JSON.stringify(townsOf(a))).toBe(JSON.stringify(townsOf(b)))
    // The shapes are the form (kept through a scrub); the hour's colours are the light.
    const later = sceneModel(world('haifa', '21:00'), BOX)
    expect(townsOf(later)!.key).toBe(townsOf(a)!.key)
    expect(townsOf(later)!.light!.key).not.toBe(townsOf(a)!.light!.key)
    expect(waterOf(later).map((l) => l.key)).toEqual(waterOf(a).map((l) => l.key))
    expect(waterOf(later).map((l) => l.light!.key)).not.toEqual(waterOf(a).map((l) => l.light!.key))
  })
})
