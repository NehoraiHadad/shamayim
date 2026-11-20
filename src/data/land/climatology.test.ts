import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { climateZoneAt, climatologyAt } from './climatology'

describe('climatology fallback (coordinate-indexed Köppen-Geiger, zero place names)', () => {
  it('classifies climate zones from coordinates and elevation without place names', () => {
    expect(climateZoneAt(30.6, 34.8, 500)).toBe('arid')            // subtropical desert plateau
    expect(climateZoneAt(31.46, 35.38, -390)).toBe('arid')         // deep subtropical rift depression
    expect(climateZoneAt(32.35, 35.53, -175)).toBe('semiarid')     // mid-latitude rain-shadow rift
    expect(climateZoneAt(31.78, 35.21, 780)).toBe('mediterranean') // orographic highland
    expect(climateZoneAt(32.10, 34.80, 15)).toBe('mediterranean')  // eastern Mediterranean coast
    expect(climateZoneAt(33.00, 35.50, 600)).toBe('mediterranean') // northern highland
    expect(climateZoneAt(51.50, -0.10, 20)).toBe('temperate')      // oceanic NW Europe
    expect(climateZoneAt(4.0, -72.0, 200)).toBe('tropical')        // equatorial
    expect(climateZoneAt(46.5, 8.0, 2600)).toBe('alpine')          // high mountain
  })

  it('distinguishes opposite seasonal rainfall regimes at matched latitude and elevation', () => {
    // 34.0°N, 20 m: California west coast (Mediterranean dry-summer) vs SE US Atlantic coast (humid subtropical wet-summer)
    expect(climateZoneAt(34.0, -118.5, 20)).toBe('mediterranean')
    expect(climateZoneAt(34.0, -78.0, 20)).toBe('humid-subtropical')
    const westSummer = climatologyAt(34.0, -118.5, 20, 8, 3) // Aug grass
    const eastSummer = climatologyAt(34.0, -78.0, 20, 8, 3)  // Aug grass
    expect(westSummer.dryness).toBeGreaterThan(eastSummer.dryness + 0.5)
    expect(eastSummer.ndvi).toBeGreaterThan(westSummer.ndvi + 0.25)

    // Matched southern-hemisphere pair (-33.5°, 20 m): SW Cape (Mediterranean) vs E Australia (humid subtropical)
    expect(climateZoneAt(-33.5, 18.4, 20)).toBe('mediterranean')
    expect(climateZoneAt(-33.5, 151.2, 20)).toBe('humid-subtropical')
    const capeJan = climatologyAt(-33.5, 18.4, 20, 1, 3)
    const eastAusJan = climatologyAt(-33.5, 151.2, 20, 1, 3)
    expect(capeJan.dryness).toBeGreaterThan(eastAusJan.dryness + 0.5)
  })

  it('models Mediterranean winter greening, summer drying and southern-hemisphere phase inversion', () => {
    const northWinter = climatologyAt(32.8, 35.5, 400, 2, 3)
    const northSummer = climatologyAt(32.8, 35.5, 400, 8, 3)
    expect(northWinter.source).toBe('climatology')
    expect(northWinter.ndvi).toBeGreaterThan(northSummer.ndvi + 0.2)
    expect(northSummer.dryness).toBeGreaterThan(northWinter.dryness + 0.5)

    const southFeb = climatologyAt(-33.5, 18.4, 400, 2, 3)
    const southAug = climatologyAt(-33.5, 18.4, 400, 8, 3)
    expect(southAug.ndvi).toBeGreaterThan(southFeb.ndvi + 0.2)
    expect(southFeb.dryness).toBeGreaterThan(southAug.dryness + 0.5)
  })

  it('accounts for winter precipitation as well as temperature in the snow fallback', () => {
    // Warm lowlands: zero snow
    expect(climatologyAt(32.1, 34.8, 15, 1, 3).snowProb).toBe(0)
    // Cold AND wet winter (Alps 2200 m & Mediterranean high peak 2200 m in Jan): high snow probability
    const wetAlpine = climatologyAt(46.5, 8.0, 2200, 1, 6).snowProb
    const wetMedPeak = climatologyAt(33.3, 35.8, 2200, 1, 6).snowProb
    expect(wetAlpine).toBeGreaterThan(0.55)
    expect(wetMedPeak).toBeGreaterThan(0.5)
    // Cold AND dry winter at matched/colder winter temp (Gobi cold desert BWk & dry-winter Mongolia Dwc): low snow probability
    const dryColdDesert = climatologyAt(42.0, 100.0, 1400, 1, 6).snowProb
    const dryContinental = climatologyAt(47.9, 106.9, 1350, 1, 6).snowProb
    expect(dryColdDesert).toBeLessThan(0.2)
    expect(dryContinental).toBeLessThan(0.25)
    expect(wetAlpine).toBeGreaterThan(dryContinental + 0.4)
    expect(climatologyAt(33.3, 35.8, 2200, 7, 6).snowProb).toBe(0)
    expect(climatologyAt(60.0, 10.0, 100, 1, 8).snowProb).toBe(0) // water
  })

  it('never references place names in src/data/land production modules', () => {
    const dir = path.resolve(__dirname)
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    const forbidden = /\b(jerusalem|haifa|tel[- ]?aviv|shadmot|galilee|negev|dead[- ]?sea|jezreel|golan|eilat|hermon|tiberias|kinneret|karmei)\b/i
    const hits: string[] = []
    for (const file of files) {
      const code = fs.readFileSync(path.join(dir, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
      const m = code.match(forbidden)
      if (m) hits.push(`${file}: ${m[0]}`)
    }
    expect(hits).toEqual([])
  })
})
