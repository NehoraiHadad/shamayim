import { describe, expect, it } from 'vitest'
import { afterglowAttrs, afterglowColour } from './afterglow'

describe('afterglow', () => {
  it('only runs from just before sunset until the highest clouds are in shadow', () => {
    expect(afterglowAttrs(10, .9, {})).toEqual({})
    expect(afterglowAttrs(-6, .9, {})).toEqual({})
    expect(afterglowAttrs(-2, null, {})).toEqual({})
    expect(afterglowAttrs(-2, .9, {})['data-afterglow']).toBe('-2.00')
  })

  it('goes from gold toward pink as the sun sinks, red staying brightest', () => {
    const gold = afterglowColour(2.5)
    const pink = afterglowColour(-3)
    expect(pink[0]).toBe(1)
    expect(pink[2]).toBeGreaterThan(gold[2])
  })
})
