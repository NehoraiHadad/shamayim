import { describe, expect, it } from 'vitest'
import { shadowAlphaTable, shadowSeconds, shadowStep, type ReceiverShadow } from './planeCloudShadow'

const shadow: ReceiverShadow = { plane: 'far', open: 0.72, blobs: [], from: 10, speed: 0.64,
  beamOverSky: 4, skyDisplay: 0.07, hazeShare: 0.40, hazeY: 0.28 }

describe('cloud receiver transmission', () => {
  it('starts at deck transmission, grows monotonically and reaches the diffuse endpoint', () => {
    const table = shadowAlphaTable(shadow)
    const onset = -Math.log(shadow.open) * 64
    expect(table.slice(0, Math.floor(onset) + 1).every((x) => x === 0)).toBe(true)
    expect(table[Math.ceil(onset) + 2]).toBeGreaterThan(0)
    expect(table.every((x, i) => i === 0 || x >= table[i - 1])).toBe(true)
    expect(table.at(-1)).toBe(255)
    // Reference calculation with the IEC transfer at the 66th depth bin (linear endpoints 0.154 and 0.222…).
    const half = table[Math.round(-Math.log(shadow.open * 0.5) * 64)]
    expect(half).toBe(101)
  })

  it('preserves the carried footprint across a minute and offsets the raster update boundaries', () => {
    const x = 20
    const at = (s: ReceiverShadow, centre: number, phase: number) => centre + s.speed * shadowSeconds(s, phase, false)
    expect(at(shadow, x, 69.999)).toBeCloseTo(at({ ...shadow, from: 70 }, x + shadow.speed * 60, 70.001), 2)
    expect(shadowStep({ ...shadow, plane: 'near' }, 11, false, 1)).toBe(1)
    expect(shadowStep({ ...shadow, plane: 'back' }, 11, false, 1)).toBe(0)
  })
})
