import { afterAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { sunDisc } from './bodies'
import type { LayerOf, SceneBox } from './types'
import { wearLayers } from './wear'
import { grainLayers, mistiness, mistLayers } from './weather'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const PAPER = { sheet: '#F3F5F7', ink: '#1C1A17', muted: '#625C52', accent: '#3172B0' }
const GRAIN_IDS = ['grains.sky', 'grains.land', 'grains.gale']

const maxStep = (samples: number[][]) => Math.max(...samples.slice(1).flatMap((values, i) =>
  values.map((v, j) => Math.abs(v - samples[i][j]))))

const geometryOf = ({ bounds, animated, marks }: LayerOf<'grains'>) => ({ bounds, animated,
  marks: marks.map(({ x, y, len, r }) => ({ x, y, len, r })) })

afterAll(() => vi.unstubAllGlobals())

it('eases mist, grains, wear dust and sun colour as PM10 rises through 50 µg/m³', async () => {
  stubPublicFetch()
  const place = SCENE_PLACES.find(({ id }) => id === 'jerusalem')!
  const loaded = (await loadPlaces([place])).get(place.id)!
  const time = '2026-11-17T12:00'
  const input = worldInput(loaded, time)
  const build = makeWorldBuilder()
  // Damp, short-visibility air makes both mist bands and wear dust measurable. A gale exercises the grain crossfade.
  const forced = { humidity: 99, visibilityKm: 4, windSpeed: 45, windDirection: 270 }
  const samples = Array.from({ length: 41 }, (_, i) => {
    const air = [{ time, pm10: 30 + i, dust: null, uv: null }]
    const world = build({ ...input, forecast: { ...input.forecast, air }, forced })
    const bands = mistLayers(world, BOX).flatMap((layer) => layer.bands.map(({ alpha }) => alpha))
    const grains = grainLayers(world, BOX)
    const item = wearLayers(world, ['sweater'], PAPER, { width: 335, dpr: 2 })
      .find((layer) => layer.kind === 'wearItem')!
    const sun = sunDisc(world, BOX)!
    const grainAlpha = GRAIN_IDS.map((id) => {
      const marks = grains.find((layer) => layer.id === id)?.marks ?? []
      return Math.max(0, ...marks.map(({ alpha }) => alpha))
    })
    return {
      mist: [mistiness(world), bands[0] ?? 0, bands[1] ?? 0],
      grainAlpha,
      wear: [item.item.dust],
      sun: [...sun.rgb, ...sun.core, ...sun.limb],
      grains,
    }
  })

  const first = samples[0], last = samples.at(-1)!
  expect(first.mist.every((alpha) => alpha > 0)).toBe(true)
  expect(last.mist).toEqual([0, 0, 0])
  expect(first.grainAlpha.slice(0, 2)).toEqual([0, 0])
  expect(first.grainAlpha[2]).toBeGreaterThan(0)
  expect(last.grainAlpha.slice(0, 2).every((alpha) => alpha > 0.1)).toBe(true)
  expect(last.grainAlpha[2]).toBe(0)
  expect(first.wear[0]).toBe(0)
  expect(last.wear[0]).toBeGreaterThan(0.8)
  expect(Math.abs(first.sun[2] - last.sun[2])).toBeGreaterThan(0.05)

  // The 40–60 smoothstep has a maximum slope of 0.075 per µg/m³. The sun limit is per normalized RGB channel.
  const limits = { mist: 0.102, grainAlpha: 0.023, wear: 0.067, sun: 0.03 }
  for (const metric of Object.keys(limits) as (keyof typeof limits)[]) {
    const measured = maxStep(samples.map((sample) => sample[metric]))
    expect(measured, metric).toBeLessThanOrEqual(limits[metric])
  }

  const midpoint = samples[20].grains
  expect(midpoint.map(({ id }) => id).sort()).toEqual([...GRAIN_IDS].sort())
  for (const layer of midpoint) {
    const peers = samples.flatMap((sample) => sample.grains.filter(({ id }) => id === layer.id))
    for (const peer of peers) expect(geometryOf(peer), peer.id).toEqual(geometryOf(layer))
    expect(new Set(peers.map(({ key }) => key)).size).toBeGreaterThan(1)
  }
})
