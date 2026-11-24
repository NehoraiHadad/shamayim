import { afterAll, expect, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { planeSurfaceOf } from './landColour'
import { COVER_WATER, sampleBandAtKm } from './landPalette'
import { srgbRgbToLinear } from './landRadiance'

afterAll(() => vi.unstubAllGlobals())
/** CIE 1976 L*a*b* (D65). */
const lab = (rgb: RGB) => {
  const [r, g, b] = srgbRgbToLinear(rgb)
  const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b), z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
const dE = (a: RGB, b: RGB) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }

it('temporary: the face tone with and without the colour painted over open-water footprints', async () => {
  stubPublicFetch()
  const loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES])
  for (const [id, place] of loaded) for (const at of ['2026-11-17T12:00', '2026-02-15T12:00']) {
    const world = buildWorld(worldInput(place, at)), { land, terrain } = world
    const stands = (i: number) => land.rays[i].near === 'water' && land.rays[i].bands.some((b) => b.sample.cover !== COVER_WATER)
    const painted: WorldState = { ...world, land: { ...land, rays: land.rays.map((ray, i) =>
      stands(i) ? { ...ray, near: { ...sampleBandAtKm(land, i, 0.3) } } : ray) } }
    const a = planeSurfaceOf(world, 'near', terrain.near).mean, b = planeSurfaceOf(painted, 'near', terrain.near).mean
    console.info('WF', id, at.slice(0, 7), 'water', land.rays.filter((r) => r.near === 'water').length, 'with dry band', land.rays.filter((_, i) => stands(i)).length,
      'unknown', land.rays.filter((r) => r.near === undefined).length, 'dE', dE(a, b).toFixed(3))
  }
  expect(loaded.size).toBeGreaterThan(5)
}, 300_000)
