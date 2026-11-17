import { describe, expect, it } from 'vitest'
import { uvLabel } from './format'

describe('uvLabel', () => {
  it.each([
    [2, 'נמוכה (2)'],
    [5, 'בינונית (5)'],
    [7, 'גבוהה (7)'],
    [10, 'גבוהה מאוד (10)'],
    [11, 'קיצונית (11)'],
  ])('uses feminine wording for %s', (uv, expected) => {
    expect(uvLabel(uv)).toBe(expected)
  })
})
