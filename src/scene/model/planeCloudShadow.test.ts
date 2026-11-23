import { describe, expect, it } from 'vitest'
import { DISC_EDGE_10_90, shadowCoverage, SOLAR_DIAMETER_RAD } from './cloudShadowEdge'
import { linearLuminance, shadeLinearRgb } from './landRadiance'
import { cloudScatter, shadowAlphaTable, shadowSeconds, shadowStep, shadowTransport, type ReceiverShadow } from './planeCloudShadow'

const shadow: ReceiverShadow = { plane: 'far', open: 0.72, blobs: [], from: 10, speed: 0.64,
  beamOverSky: 4, skyDisplay: 0.07, hazeShare: 0.40, hazeY: 0.28 }

describe('cloud receiver transmission', () => {
  it('starts at deck transmission, grows monotonically and reaches the diffuse endpoint', () => {
    const table = shadowAlphaTable(shadow)
    const onset = -Math.log(shadow.open) * 64
    expect(table.slice(0, Math.floor(onset) + 1).every((x) => x === 0)).toBe(true)
    expect(table[Math.ceil(onset) + 2]).toBeGreaterThan(0)
    expect(table.every((x, i) => i === 0 || x >= table[i - 1])).toBe(true)
    expect(table.at(-1)).toBe(255)
    // Reference calculation with the IEC transfer at the 66th depth bin (linear endpoints 0.154 and 0.222…).
    const half = table[Math.round(-Math.log(shadow.open * 0.5) * 64)]
    expect(half).toBe(101)
  })

  it('preserves the carried footprint across a minute and offsets the raster update boundaries', () => {
    const x = 20
    const at = (s: ReceiverShadow, centre: number, phase: number) => centre + s.speed * shadowSeconds(s, phase, false)
    expect(at(shadow, x, 69.999)).toBeCloseTo(at({ ...shadow, from: 70 }, x + shadow.speed * 60, 70.001), 2)
    expect(shadowStep({ ...shadow, plane: 'near' }, 11, false, 1)).toBe(1)
    expect(shadowStep({ ...shadow, plane: 'back' }, 11, false, 1)).toBe(0)
  })

  it('projects at least the 10–90% transmission width of the finite solar disc', () => {
    const disc = 2.2 * SOLAR_DIAMETER_RAD
    const radius = .015
    const sample = Array.from({ length: 1001 }, (_, i) => {
      const km = radius + disc * (i / 1000 - .5)
      return { km, transmission: 1 - shadowCoverage(km, radius, disc) }
    })
    const t10 = sample.find(p => p.transmission >= .1)!
    const t90 = sample.find(p => p.transmission >= .9)!
    expect(t90.km - t10.km).toBeGreaterThanOrEqual(DISC_EDGE_10_90 * disc)
  })

  it('keeps sunlit ground hue and energy when the removed beam becomes diffuse', () => {
    const ground = [.46, .39, .29] as const, beam = [1.24, 1.12, .98] as const
    const ambient = [.16, .20, .255] as const, moon = [0, 0, 0] as const
    const lit = shadeLinearRgb(ground, beam, moon, ambient, 1, 0, 1, .38)
    const opaque = cloudScatter(35), neutral = Math.min(...beam)
    let previous = linearLuminance(lit)
    for (let depth = 0; depth <= 35; depth += .125) {
      const { direct, scattered } = shadowTransport(depth, .95, opaque)
      expect(direct + scattered).toBeLessThanOrEqual(1 + 1e-12)
      const received = beam.map(value => direct * value + scattered * neutral) as [number, number, number]
      expect(received.every((channel, i) => channel <= beam[i] + 1e-12)).toBe(true)
      const shaded = shadeLinearRgb(ground, received, moon, ambient, 1, 0, 1, .38)
      const y = linearLuminance(shaded)
      expect(y).toBeLessThanOrEqual(previous + 1e-12)
      previous = y
      if (depth !== 35) continue
      expect(y / linearLuminance(lit)).toBeGreaterThan(.35)
      expect(y / linearLuminance(lit)).toBeLessThan(.60)
      expect(shaded[0]).toBeGreaterThan(shaded[1])
      expect(shaded[1]).toBeGreaterThan(shaded[2])
      expect((shaded[2] / shaded[0]) / (lit[2] / lit[0])).toBeLessThan(1.4)
    }
  })
})
