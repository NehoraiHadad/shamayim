import { describe, expect, it } from 'vitest'
import { makeForecast } from '../test/makeForecast'
import { normalClause } from './normal'

const day = { ...makeForecast([{ max: 26, min: 15 }]).days[0], date: '2026-11-17' }
const normal = { tempMax: 22, tempMaxSd: 2, tempMin: 12, gustMax: 40, gustMaxSd: 8 }

describe('normalClause', () => {
  it('uses exact warm and cool phrases', () => {
    expect(normalClause(day, normal)).toBe('חם מהרגיל לנובמבר ב־\u20664°\u2069')
    expect(normalClause({ ...day, tempMax: 18 }, normal)).toBe('קריר מהרגיל לנובמבר ב־\u20664°\u2069')
  })
  it('marks strong differences including the exact boundary', () => {
    expect(normalClause({ ...day, tempMax: 29 }, normal)).toBe('חם בהרבה מהרגיל לנובמבר, ב־\u20667°\u2069')
    expect(normalClause({ ...day, tempMax: 15 }, normal)).toBe('קר בהרבה מהרגיל לנובמבר, ב־\u20667°\u2069')
    expect(normalClause({ ...day, tempMax: 28 }, normal)).toContain('חם בהרבה')
  })
  it('stays quiet below the absolute or sd threshold and without normals', () => {
    expect(normalClause({ ...day, tempMax: 24.9 }, normal)).toBeNull()
    expect(normalClause(day, { ...normal, tempMaxSd: 5 })).toBeNull()
    expect(normalClause(day)).toBeNull()
    expect(normalClause({ ...day, tempMax: 25 }, normal)).toContain('ב־\u20663°\u2069')
  })
  it('takes month names from the day date, including January', () => {
    for (const [month, name] of [[1, 'ינואר'], [2, 'פברואר'], [7, 'יולי'], [12, 'דצמבר']] as const) {
      expect(normalClause({ ...day, date: `2027-${String(month).padStart(2, '0')}-01` }, normal)).toContain(`ל${name}`)
    }
  })
})
