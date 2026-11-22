import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { tonesAt } from './marks'
import { aerialFor, hazeAt, hazeOf } from './landVeil'
import { skyAt } from './sky'
import { skyFormOf } from './ownSkyForm'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const lum = (c: readonly number[]) => .3 * c[0] + .6 * c[1] + .1 * c[2]
let loaded: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  const place = SCENE_PLACES.find(p => p.id === 'jerusalem')!
  loaded = (await loadPlaces([place])).get(place.id)!
})
afterAll(() => vi.unstubAllGlobals())

it.each(['2026-11-17T11:00', '2026-11-17T16:30'] as const)
('keeps reflected roof light below the sky through the same atmospheric path at %s', at => {
  const world = buildWorld(worldInput(loaded, at))
  const kms = [0, 10.5, 11.5, 12.5]
  const tones = kms.map(km => tonesAt(world, km))
  const form = skyFormOf(world, box, kms, 1)
  const sky = skyAt(world, box)(8), aerial = aerialFor(world, hazeOf(world))
  for (const [i, tier] of form.tiers.entries()) {
    expect(lum(tier.top)).toBeGreaterThanOrEqual(lum(tones[i].wall))
    expect(lum(tier.top)).toBeLessThan(lum(aerial(sky, kms[i])))
    expect(lum(tier.foot)).toBeLessThan(lum(tones[i].wall))
  }
  if (at.endsWith('16:30')) {
    // Zero-distance albedo bound + far control: verify distant dusk roof mixes linearly toward hazeOf(world) (Finding 10).
    expect(lum(form.tiers[0].top)).toBeLessThan(lum(sky))
    expect(lum(form.tiers[2].top)).toBeGreaterThan(lum(form.tiers[0].top))
    const h = hazeAt(world, kms[2]), air = hazeOf(world)
    const decode = (s: number) => s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    for (const channel of [0, 1, 2]) {
      const expected = decode(form.tiers[0].top[channel]) * (1 - h) + decode(air[channel]) * h
      expect(decode(form.tiers[2].top[channel])).toBeCloseTo(expected, 7)
    }
  }
})
