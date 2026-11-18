import { expect, it } from 'vitest'
import { decodeForm, encodeForm, sizeClass } from './form'

it('round-trips all 256 form bytes', () => {
  for (let byte = 0; byte < 256; byte++) {
    const { size, big, roof, evidence } = decodeForm(byte)
    expect(encodeForm(size, big, roof, evidence)).toBe(byte)
  }
  expect(encodeForm(3, 2, 1, true)).toBe(179)
})

it('assigns exact area boundaries to the next size class', () => {
  expect([1, 60, 120, 220, 450, 1200, 5000].map(sizeClass)).toEqual([1, 2, 3, 4, 5, 6, 7])
})
