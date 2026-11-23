import { expect, it } from 'vitest'
import { solarBeam, sunLight } from '../../world/sceneLight'
import type { CloudLayer, WorldState } from '../../world/types'
import { cloudBeam, litTone } from './cloudBeam'
import { labOf, toSrgb } from './tone'
import type { RGB } from './types'

it('uses spectral transmission for the illuminant and keeps the disc tone map', () => {
  const air = { visibilityKm: 12.4 }
  const atHeight = (km: number) => {
    const t = solarBeam(11.95, air, km).transmission
    return t.map((v) => toSrgb(v / Math.max(...t))) as unknown as RGB
  }
  const { a, b } = labOf(atHeight(0))
  expect(Math.abs(Math.atan2(b, a) * 180 / Math.PI - 70)).toBeLessThan(6)
  expect(atHeight(4)[2]).toBeGreaterThan(atHeight(0)[2])
  expect(sunLight(11.95, air).rgb[1]).toBeGreaterThan(0.85)
})

it('keeps the body at zero irradiance and adds light in every channel', () => {
  const body: RGB = [0.74, 0.77, 0.8]
  const beam: RGB = [1, 0.4, 0.3]
  expect(litTone(body, beam, 0)).toBe(body)
  expect(litTone(body, [0, 0, 0], 1)).toBe(body)
  for (const through of [0.2, 1]) {
    const lit = litTone(body, beam, through)
    for (let i = 0; i < 3; i++) expect(lit[i]).toBeGreaterThanOrEqual(body[i])
    expect(labOf(lit).l).toBeGreaterThan(labOf(body).l)
  }
})

it('leaves low cloud effectively unlit while sunset still reaches upper decks', () => {
  const air = { visibilityKm: 14.2 }
  const low = solarBeam(0.78, air, 0.6).transmission
  expect(low[0]).toBeLessThan(0.001)
  for (const altitude of [0.78, 2.99]) for (const height of [4, 9]) {
    const [red, green, blue] = solarBeam(altitude, air, height).transmission
    expect(red).toBeGreaterThan(green)
    expect(green).toBeGreaterThan(blue)
    expect(red).toBeGreaterThan(low[0])
  }
})

it('relays the warm irradiance of a sunlit upper deck across its sky view', () => {
  const sky = { bodies: { sun: { altitude: 0.78 } }, air: { visibilityKm: 14.2 },
    light: { diffuse: 0.94 } }
  const layer: CloudLayer = { level: 'low', cover: 0.6, baseM: 600, banks: [], drift: 0, litUnderside: 1, rains: false }
  const mid = { lattice: 'mid', baseKm: 4, meanVKm: 0.5, kappa: 4 }
  const beam = (cover: number) => cloudBeam({
    ...sky, cloudField: { field: { layers: [{ ...mid, cover }] } },
  } as WorldState, layer)
  const clear = beam(0)
  const overcast = beam(1)
  expect(clear.relay).toEqual([0, 0, 0])
  expect(overcast.direct).toEqual(clear.direct)
  expect(overcast.relay[0]).toBeGreaterThan(overcast.relay[1])
  expect(overcast.relay[1]).toBeGreaterThan(overcast.relay[2])
  expect(beam(0.76).relay[0]).toBeCloseTo(0.76 * overcast.relay[0], 8)
})