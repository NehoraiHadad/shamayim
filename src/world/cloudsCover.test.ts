import { expect, it } from 'vitest'
import { layerCovers, unionOf } from './clouds'

it('bounds each layer through the final two percentage points of overcast closure', () => {
  for (const [cloudLow, cloudMid, cloudHigh] of [[80, 50, 25], [95, 80, 40], [100, 0, 0], [30, 30, 30], [0, 0, 100]]) {
    const hour = { cloudLow, cloudMid, cloudHigh }
    const at = (total: number) => layerCovers({ hour, cloudCover: total / 10 }).covers
    let previous = at(980)
    let maxStep = 0
    let maxError = 0
    for (let total = 981; total <= 1000; total++) {
      const current = at(total)
      maxStep = Math.max(maxStep, ...(['low', 'mid', 'high'] as const).map(level => Math.abs(current[level] - previous[level])))
      maxError = Math.max(maxError, Math.abs(unionOf(current) - total / 1000))
      previous = current
    }
    console.info('cover closure', [cloudLow, cloudMid, cloudHigh], { maxStep, maxError })
    expect(maxStep).toBeLessThanOrEqual(0.03)
    expect(unionOf(previous)).toBeGreaterThanOrEqual(0.999)
  }
})
