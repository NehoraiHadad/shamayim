import { describe, expect, it } from 'vitest'
import { afterglowColour } from './afterglow'

describe('afterglow', () => {
  it('goes from gold toward pink as the sun sinks, red staying brightest', () => {
    const gold = afterglowColour(2.5)
    const pink = afterglowColour(-3)
    expect(pink[0]).toBe(1)
    expect(pink[2]).toBeGreaterThan(gold[2])
  })
})
