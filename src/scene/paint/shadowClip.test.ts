import { describe, expect, it } from 'vitest'
import type { Pt } from '../model/types'
import { insideClip, shadowClipRegions } from './shadowClip'

const W = 375, H = 200
/** A far crest at y 60, and a near ridge that rises above it (y 40) over x 100–200 and drops below it elsewhere (y 90). */
const far: Pt[] = [[0, 60], [375, 60]]
const near: Pt[] = [[0, 90], [100, 90], [130, 40], [170, 40], [200, 90], [375, 90]]

describe('cloud shadow clip', () => {
  const regions = shadowClipRegions({ crest: far, fronts: [near] }, W, H)

  it('keeps the far ground between its crest and the near ridge where the ridge stands lower', () => {
    expect(insideClip(regions, 50, 75)).toBe(true)
    expect(insideClip(regions, 300, 75)).toBe(true)
  })

  it('keeps nothing above the far crest', () => {
    expect(insideClip(regions, 50, 50)).toBe(false)
  })

  it('keeps nothing on the near ridge, where it crosses above the far crest too', () => {
    expect(insideClip(regions, 150, 45)).toBe(false) // above the far crest, on the near ridge
    expect(insideClip(regions, 150, 70)).toBe(false) // just under the far crest, still the near ridge's face
    expect(insideClip(regions, 50, 120)).toBe(false) // below the near crest
  })

  it('excludes every nearer plane, and keeps the plain face when none stands in front', () => {
    const back = shadowClipRegions({ crest: [[0, 30], [375, 30]], fronts: [far, near] }, W, H)
    expect(insideClip(back, 50, 45)).toBe(true)
    expect(insideClip(back, 50, 70)).toBe(false)
    expect(insideClip(back, 150, 50)).toBe(false)
    const alone = shadowClipRegions({ crest: far, fronts: [] }, W, H)
    expect([insideClip(alone, 150, 150), insideClip(alone, 150, 50)]).toEqual([true, false])
  })
})
