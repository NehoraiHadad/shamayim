import { describe, expect, it } from 'vitest'
import { clockRange, heightText, tempText } from './isolate'

describe('tempText', () => {
  it.each([
    [-3, '\u2066−3°\u2069'],
    [-0.4, '\u20660°\u2069'],
    [5, '\u20665°\u2069'],
  ])('isolates %s with its sign and degree mark', (temperature, expected) => {
    expect(tempText(temperature)).toBe(expected)
  })
})

describe('heightText', () => {
  it.each([
    [-137, '\u2067\u2066−137\u2069\u00A0מ׳\u2069'],
    [788, '\u2067\u2066788\u2069\u00A0מ׳\u2069'],
  ])('keeps the height %s and its unit together in RTL', (height, expected) => {
    expect(heightText(height)).toBe(expected)
  })
})

it('isolates the two clocks independently so their order follows the paragraph', () => {
  expect(clockRange('05:40', '17:00')).toBe('\u206605:40\u2069–\u206617:00\u2069')
})
