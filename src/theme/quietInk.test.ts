import { expect, it } from 'vitest'
import { ratio } from './contrast'
import { QUIET, quietInk } from './quietInk'

const GREYS = Array.from({ length: 52 }, (_, i) => i * 5)
const TINTS = [[1, 1, 1], [1, .85, .6], [.55, .8, 1], [.5, .9, .55]] as const
const hex = (grey: number, tint: readonly number[]) => `#${tint.map((c) => Math.round(grey * c).toString(16).padStart(2, '0')).join('')}`

it('reads on any ground, no more than it needs to, and is never pure white or black', () => {
  for (const tint of TINTS) for (const grey of GREYS) {
    const under = hex(grey, tint), ink = quietInk(under), name = `${ink} on ${under}`
    expect(ratio(ink, under), name).toBeGreaterThanOrEqual(QUIET)
    expect(ratio(ink, under), name).toBeLessThan(QUIET + .5)
    expect(['#ffffff', '#000000'], name).not.toContain(ink.toLowerCase())
  }
})
