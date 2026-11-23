import { describe, expect, it } from 'vitest'
import type { CloudSprite } from '../paint/cloudSprite'
import { beforeSheet, hideBehind, leanOf, oneStormEach, type Standing } from './towerStorms'
import type { RGB } from './types'

const standing = (x: number, km: number): Standing => ({ sprite: { share: 1 } as CloudSprite, at: [x, km], r: 3, km, x: 0, y: 0 })

describe('oneStormEach', () => {
  it('fades the farther of two cells whose cores overlap into the nearer', () => {
    const near = standing(0, 4), far = standing(0.6, 4.7)
    oneStormEach([far, near])
    expect(near.sprite.share).toBe(1)
    expect(far.sprite.share).toBeLessThan(0.05)
  })

  it('leaves two storms apart from each other as they are', () => {
    const near = standing(0, 4), far = standing(4, 5)
    oneStormEach([far, near])
    expect([near.sprite.share, far.sprite.share]).toEqual([1, 1])
  })

  it('moves smoothly as one cell overtakes the other', () => {
    let last = -1
    for (let km = 3.4; km <= 4.6; km += 0.02) {
      const a = standing(0, 4), b = standing(0.3, km)
      oneStormEach([a, b])
      const sum = a.sprite.share + b.sprite.share
      if (last >= 0) expect(Math.abs(sum - last)).toBeLessThan(0.1)
      last = sum
    }
  })
})

describe('hideBehind', () => {
  const tower = (x: number, y: number, w: number, tall: number, km: number): Standing =>
    ({ sprite: { share: 1, w, tall, under: 20 } as CloudSprite, at: [0, km], r: 3, km, x, y })

  it('hides a tower behind a nearer one, whichever comes first', () => {
    const near = tower(0, 0, 100, 300, 4), far = tower(10, 25, 40, 120, 9)
    hideBehind([far, near])
    expect([near.sprite.share, far.sprite.share]).toEqual([1, 0])
  })

  it('leaves what stands beside it or over it, and goes smoothly between', () => {
    let last = 0
    for (let x = 0; x <= 80; x++) {
      const near = tower(0, 0, 100, 300, 4), far = tower(x, 25, 40, 120, 9)
      hideBehind([near, far])
      expect(Math.abs(far.sprite.share - last)).toBeLessThan(0.15)
      last = far.sprite.share
    }
    expect(last).toBe(1)
    const low = tower(0, 0, 100, 60, 4), high = tower(0, 5, 60, 200, 9)
    hideBehind([low, high])
    expect(high.sprite.share).toBe(1)
  })
})

it('leans a tower with the wind across the view, not with the wind along it', () => {
  expect(leanOf(0, 2)).toBe(0)
  expect(leanOf(-2, 2)).toBe(-1)
  expect(leanOf(0, 0)).toBe(0)
})

it('takes a far tower to the sheet behind it as far as the air and the cover do', () => {
  const pink: RGB = [0.7, 0.4, 0.4], blue: RGB = [0.5, 0.6, 0.8]
  const tones = { body: [0.6, 0.6, 0.6] as RGB, shade: [0.4, 0.4, 0.4] as RGB, behind: blue, fade: 0.5 }
  expect(beforeSheet(tones, null)).toBe(tones)
  expect(beforeSheet(tones, { rgb: pink, cover: 0 }).body[2]).toBeCloseTo(0.6)
  const full = beforeSheet(tones, { rgb: pink, cover: 1 })
  expect(full.behind[1]).toBeCloseTo(0.4)
  expect(full.body[0]).toBeCloseTo(0.7)
  expect(full.body[2]).toBeCloseTo(0.4)
})
