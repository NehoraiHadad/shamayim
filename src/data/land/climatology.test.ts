import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { climateZoneAt, climatologyAt } from './climatology'
import { koppenAt, rawKoppenAt } from './koppenGrid'
import koppenTable from './koppenTable.json'

describe('climatology fallback (generated Beck et al. 2018 0.5° Köppen-Geiger, zero place names)', () => {
  it('verifies generated cells against Beck_KG_V1_present_0p5.tif source pixels, mountain/coastal transitions and ocean nodata', () => {
    expect(koppenTable.tifSha256).toBe('4dcc0f4a6343af2ac354c4a9676262510c3a96acceab2d992a6c2f5e86659756')
    expect(koppenTable.rows).toBe(360)
    expect(koppenTable.cols).toBe(720)

    // Verified directly against Beck_KG_V1_present_0p5.tif (classes: 8=Csa, 9=Csb, 4=BWh, 5=BWk, 12=Cwb, 14=Cfa, 15=Cfb, 21=Dwa, 29=ET, 0=ocean)
    expect(rawKoppenAt(32.35, 35.53)).toBe('M')   // Beck 8 (Csa)
    expect(rawKoppenAt(31.78, 35.21)).toBe('M')   // Beck 8 (Csa)
    expect(rawKoppenAt(30.60, 34.80)).toBe('B')   // Beck 4 (BWh)
    expect(rawKoppenAt(31.46, 35.38)).toBe('B')   // Beck 4 (BWh)
    expect(rawKoppenAt(45.75, 126.65)).toBe('d')  // Beck 21 (Dwa, dry-winter continental)
    expect(rawKoppenAt(42.00, 100.00)).toBe('B')  // Beck 5 (BWk, cold desert)

    // Mountain & highland transitions absent from hand-written rectangles:
    expect(rawKoppenAt(-16.50, -68.10)).toBe('E') // Beck 29 (ET, Andean Altiplano)
    expect(rawKoppenAt(9.00, 38.70)).toBe('H')    // Beck 12 (Cwb, Ethiopian Highlands wet-summer highland vs surrounding Aw)
    expect(rawKoppenAt(-39.80, -73.20)).toBe('C') // Beck 15 (Cfb, southern Chile oceanic transition south of Csb)
    expect(rawKoppenAt(-33.45, -70.66)).toBe('M') // Beck 9 (Csb, central Chile Mediterranean)

    // Ocean nodata is explicit in rawKoppenAt; coastal sea cells resolve to the adjacent coast via koppenAt
    expect(rawKoppenAt(30.0, -40.0)).toBeNull()   // Open North Atlantic: Beck 0
    expect(rawKoppenAt(34.0, -78.0)).toBeNull()   // 10 km off Carolina coast: Beck 0
    expect(koppenAt(34.0, -78.0)).toBe('H')       // Coastal neighbor resolves to Beck 14 (Cfa)
  })

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
    // 34.4°N, 20 m: California west coast (Csb/Csa dry-summer) vs SE US Atlantic coast (Cfa wet-summer)
    expect(climateZoneAt(34.42, -119.70, 20)).toBe('mediterranean')
    expect(climateZoneAt(34.20, -77.90, 20)).toBe('humid-subtropical')
    const westSummer = climatologyAt(34.42, -119.70, 20, 8, 3)
    const eastSummer = climatologyAt(34.20, -77.90, 20, 8, 3)
    expect(westSummer.dryness).toBeGreaterThan(eastSummer.dryness + 0.5)
    expect(eastSummer.ndvi).toBeGreaterThan(westSummer.ndvi + 0.25)

    // Southern-hemisphere pair (-33.5°, 20 m): SW Cape (Csb) vs E Australia (Cfa)
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
    expect(climatologyAt(32.1, 34.8, 15, 1, 3).snowProb).toBe(0)
    const wetAlpine = climatologyAt(46.5, 8.0, 2200, 1, 6).snowProb
    const wetMedPeak = climatologyAt(33.3, 35.8, 2200, 1, 6).snowProb
    expect(wetAlpine).toBeGreaterThan(0.55)
    expect(wetMedPeak).toBeGreaterThan(0.5)

    // Cold AND dry winter (Gobi BWk & NE China Dwa): low snow probability
    const dryColdDesert = climatologyAt(42.0, 100.0, 1400, 1, 6).snowProb
    const dryContinental = climatologyAt(45.75, 126.65, 1350, 1, 6).snowProb
    expect(dryColdDesert).toBeLessThan(0.2)
    expect(dryContinental).toBeLessThan(0.25)
    expect(wetAlpine).toBeGreaterThan(dryContinental + 0.4)
    expect(climatologyAt(33.3, 35.8, 2200, 7, 6).snowProb).toBe(0)
    expect(climatologyAt(60.0, 10.0, 100, 1, 8).snowProb).toBe(0)
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
