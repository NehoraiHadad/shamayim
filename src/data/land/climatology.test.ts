import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { climateZoneAt, climatologyAt } from './climatology'

describe('climatology fallback (physics only, zero place names)', () => {
  it('classifies climate zones from latitude and elevation without place names', () => {
    expect(climateZoneAt(30.6, 34.8, 500)).toBe('arid')            // subtropical desert plateau
    expect(climateZoneAt(31.46, 35.38, -390)).toBe('arid')         // deep subtropical rift depression
    expect(climateZoneAt(32.35, 35.53, -175)).toBe('semiarid')     // mid-latitude rain-shadow rift
    expect(climateZoneAt(31.78, 35.21, 780)).toBe('mediterranean') // orographic highland
    expect(climateZoneAt(32.10, 34.80, 15)).toBe('mediterranean')  // coastal winter-rain belt
    expect(climateZoneAt(33.00, 35.50, 600)).toBe('mediterranean') // northern highland
    expect(climateZoneAt(51.50, -0.10, 20)).toBe('temperate')      // high-latitude humid temperate
    expect(climateZoneAt(4.0, -72.0, 200)).toBe('tropical')        // equatorial
    expect(climateZoneAt(46.5, 8.0, 2600)).toBe('alpine')          // high mountain
  })

  it('models Mediterranean winter greening, summer drying and southern-hemisphere phase inversion', () => {
    const northWinter = climatologyAt(32.8, 35.5, 400, 2, 3) // Feb grass
    const northSummer = climatologyAt(32.8, 35.5, 400, 8, 3) // Aug grass
    expect(northWinter.source).toBe('climatology')
    expect(northWinter.ndvi).toBeGreaterThan(northSummer.ndvi + 0.2)
    expect(northSummer.dryness).toBeGreaterThan(northWinter.dryness + 0.5)

    // Southern hemisphere (-32.8°): Feb is dry summer, Aug is wet winter
    const southFeb = climatologyAt(-32.8, 18.4, 400, 2, 3)
    const southAug = climatologyAt(-32.8, 18.4, 400, 8, 3)
    expect(southAug.ndvi).toBeGreaterThan(southFeb.ndvi + 0.2)
    expect(southFeb.dryness).toBeGreaterThan(southAug.dryness + 0.5)
  })

  it('gives higher winter snow probability at cold/high elevations and zero in warm lowlands', () => {
    expect(climatologyAt(32.1, 34.8, 15, 1, 3).snowProb).toBe(0)
    expect(climatologyAt(33.3, 35.8, 2200, 1, 6).snowProb).toBeGreaterThan(0.5)
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
