import { expect, it } from 'vitest'
import { solarBeam, sunLight } from '../../world/sceneLight'
import type { FieldLayer } from '../../world/field/types'
import type { CloudLayer, WorldState } from '../../world/types'
import { beamIncidence, cloudBeam, diffuseIlluminance, litTone } from './cloudBeam'
import { tintFill } from './cloudExposure'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
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
  const mid = { lattice: 'mid', baseKm: 4, meanVKm: 0.3, kappa: 15,
    form: { conv: 0, strat: 0, sheet: 0, veil: 0 } }
  const high = { lattice: 'high', baseKm: 8, meanVKm: 2, kappa: 0.5,
    form: { ...mid.form, veil: 1 }, cover: 1 }
  const beam = (cover: number, screened = false) => cloudBeam({
    ...sky, cloudField: { field: { layers: [{ ...mid, cover }, ...(screened ? [high] : [])] } },
  } as WorldState, layer)
  const clear = beam(0)
  const broken = beam(0.5)
  expect(clear.relay).toEqual([0, 0, 0])
  expect(broken.direct).toEqual(clear.direct)
  expect(broken.relay[0]).toBeGreaterThan(broken.relay[1])
  expect(broken.relay[1]).toBeGreaterThan(broken.relay[2])
  expect(beam(0.25).relay[0]).toBeCloseTo(0.5 * broken.relay[0], 8)
  expect(beam(1).relay[0]).toBeLessThan(broken.relay[0])
  // Compare the incremental mid-deck relay in the presence of a screening high deck.
  const screened = (cover: number) => beam(cover, true).relay[0]
  expect(screened(0.5) - screened(0)).toBeLessThan(broken.relay[0])
})

it('transitions continuously between open cells and slabs at a low sun', () => {
  const form = { conv: 0, strat: 0, sheet: 0, veil: 0 }
  const deck = { lattice: 'mid', cover: 0.5, form } as FieldLayer
  expect(beamIncidence(deck, 0)).toBe(1)
  expect(beamIncidence({ ...deck, cover: 0.95 }, 0)).toBe(0)
  expect(beamIncidence({ ...deck, form: { ...form, sheet: 1 } }, 3)).toBeCloseTo(Math.sin(Math.PI / 60), 10)
})

it('continues the diffuse irradiance into twilight', () => {
  const horizon = diffuseIlluminance(0, 0.5)
  expect(diffuseIlluminance(-3, 0.5) / horizon).toBeCloseTo(0.09, 2)
  expect(diffuseIlluminance(-8, 0.5) / horizon).toBeCloseTo(0.001, 5)
  expect(diffuseIlluminance(-1e-6, 0.5)).toBeCloseTo(horizon, 6)
})

it('changes diffuse hue without adding the upper deck’s energy twice', () => {
  const body: RGB = [0.74, 0.77, 0.8]
  const warm: RGB = [1, 0.35, 0.1]
  const mixed = tintFill(body, warm, 1 / 3)
  expect(linearLuminance(srgbRgbToLinear(mixed))).toBeCloseTo(linearLuminance(srgbRgbToLinear(body)), 10)
  expect(mixed[0]).toBeGreaterThan(body[0])
  expect(mixed[2]).toBeLessThan(body[2])
})

it('uses the exponential aerosol scale height at the elevated horizon', () => {
  const height = 4
  const visibilityKm = 14.2
  const clean = solarBeam(0, { visibilityKm: Infinity }, height).transmission[1]
  const actual = solarBeam(0, { visibilityKm }, height).transmission[1]
  const horizonMass = Math.sqrt(Math.PI * 6371 / (2 * 1.5))
  const tau = (3.912 / visibilityKm - 0.0116) * 1.5 * Math.exp(-height / 1.5)
  expect(actual / clean).toBeCloseTo(Math.exp(-tau * horizonMass), 8)
  expect(solarBeam(-1e-6, { visibilityKm }, height).transmission[1]).toBeCloseTo(actual, 6)
})
