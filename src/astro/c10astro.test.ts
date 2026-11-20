import { describe, expect, it } from 'vitest'
import { bandBrightness, galacticToEquatorial } from './galaxy'
import { planetPosition, sunLongitude } from './planets'
import { showerOn, SHOWERS } from './showers'

const DEG = 180 / Math.PI
const dLon = (name: Parameters<typeof planetPosition>[0], at: string) => {
  const d = new Date(at)
  return ((planetPosition(name, d).longitude - sunLongitude(d)) + 540) % 360 - 180
}

describe('planet ephemeris (C10) against known events', () => {
  it('puts Venus at its greatest elongations of 2025 (47.2° east on Jan 10, 45.9° west on Jun 1)', () => {
    expect(planetPosition('venus', new Date('2025-01-10T00:00Z')).elongation).toBeCloseTo(47.2, 0)
    expect(planetPosition('venus', new Date('2025-06-01T00:00Z')).elongation).toBeCloseTo(45.9, 0)
    expect(dLon('venus', '2025-01-10T00:00Z')).toBeGreaterThan(0)
    expect(dLon('venus', '2025-06-01T00:00Z')).toBeLessThan(0)
  })

  it('never takes Venus more than ~47.5° from the sun', () => {
    for (let day = 0; day < 600; day += 5) {
      expect(planetPosition('venus', new Date(Date.UTC(2025, 0, 1 + day))).elongation).toBeLessThan(47.6)
    }
  })

  it('puts the outer planets opposite the sun at their oppositions', () => {
    for (const [name, at] of [['jupiter', '2026-01-10T00:00Z'], ['saturn', '2025-09-21T00:00Z'], ['mars', '2025-01-16T00:00Z']] as const) {
      expect(Math.abs(dLon(name, at))).toBeGreaterThan(178.5)
    }
  })

  it('places Mars at opposition 2025 in Gemini (RA ≈ 7h56m, Dec ≈ +25°) and Jupiter at opposition 2026 (RA ≈ 7h27m, Dec ≈ +22°)', () => {
    const mars = planetPosition('mars', new Date('2025-01-16T00:00Z'))
    expect(((mars.rightAscension * DEG / 15) + 24) % 24).toBeCloseTo(7.93, 0)
    expect(mars.declination * DEG).toBeCloseTo(25, 0)
    const jupiter = planetPosition('jupiter', new Date('2026-01-10T00:00Z'))
    expect(((jupiter.rightAscension * DEG / 15) + 24) % 24).toBeCloseTo(7.45, 0)
    expect(jupiter.declination * DEG).toBeCloseTo(22.2, 0)
  })

  it('computes magnitudes: Venus ≈ −4.4, Jupiter ≈ −2.7 at opposition, Mars −1.4 at opposition and ≈ +1.2 at conjunction', () => {
    expect(planetPosition('venus', new Date('2025-01-10T00:00Z')).magnitude).toBeCloseTo(-4.4, 0)
    expect(planetPosition('jupiter', new Date('2026-01-10T00:00Z')).magnitude).toBeCloseTo(-2.7, 0)
    expect(planetPosition('mars', new Date('2025-01-16T00:00Z')).magnitude).toBeCloseTo(-1.4, 0)
    const far = planetPosition('mars', new Date('2026-01-09T00:00Z')).magnitude
    expect(far).toBeGreaterThan(1)
    expect(far).toBeLessThan(1.7)
  })
})

describe('galactic frame (C10)', () => {
  it('puts the galactic centre at RA 266.4°, Dec −28.94° and the north galactic pole at RA 192.86°, Dec +27.13°', () => {
    const centre = galacticToEquatorial(0, 0)
    expect(centre.rightAscension * DEG).toBeCloseTo(266.4, 1)
    expect(centre.declination * DEG).toBeCloseTo(-28.94, 1)
    const pole = galacticToEquatorial(0, 90)
    expect(pole.declination * DEG).toBeCloseTo(27.13, 1)
  })

  it('makes the band brightest toward the centre, faint toward the anticentre', () => {
    expect(bandBrightness(0)).toBeGreaterThan(bandBrightness(180) * 2)
  })
})

describe('meteor showers by date (C10)', () => {
  it('finds the major showers on their peak nights', () => {
    expect(showerOn('2026-08-12')?.shower.name).toBe('Perseids')
    expect(showerOn('2026-12-13')?.shower.name).toBe('Geminids')
    expect(showerOn('2027-01-03')?.shower.name).toBe('Quadrantids')
    expect(showerOn('2026-11-17')?.shower.name).toBe('Leonids')
    expect(showerOn('2026-10-21')?.shower.name).toBe('Orionids')
  })

  it('has no shower on ordinary nights', () => {
    for (const date of ['2026-03-15', '2026-06-20', '2026-09-15', '2026-02-10']) expect(showerOn(date)).toBeNull()
  })

  it('fades a sharp shower within days of its peak (the Quadrantids gone by Jan 7)', () => {
    expect(showerOn('2027-01-07')).toBeNull()
    expect(showerOn('2026-08-16')?.zhr ?? 0).toBeLessThan(showerOn('2026-08-12')!.zhr)
  })

  it('lists every shower with a radiant on the sky', () => {
    for (const s of SHOWERS) {
      expect(s.ra).toBeGreaterThanOrEqual(0)
      expect(Math.abs(s.dec)).toBeLessThanOrEqual(90)
    }
  })
})
