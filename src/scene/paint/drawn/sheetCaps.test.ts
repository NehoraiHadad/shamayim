import { describe, expect, it } from 'vitest'
import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf } from '../../model/types'
import { sheetCaps } from './sheetCaps'
import { cutOf, easedField } from './sheetEdge'
import { sheetField } from './sheetField'

type Sheet = LayerOf<'cloudSheet'>
const RANGES = [0, 1, 1.6, 2.6, 4, 7, 12, 20], COLS = 21
/** The second row (px): over it, nearly overhead, the cloud is on every side and its air crosses the sky faster. */
const SECOND = 40

/** The caps of a cloud that fills its air west of the eye, carried as far as its air is. */
function capsAt(frames: NonNullable<Sheet['air']>['frames']) {
  const az = (c: number) => ((c - 10) * 4 * Math.PI) / 180, [{ d }] = frames.slice(-1)
  const cloud = (n: number) => 0.9 * (1 - smoothstep(-1, 1, RANGES[Math.floor(n / COLS)] * Math.sin(az(n % COLS)) - d[0]))
  const desc = { kind: 'cloudSheet', id: 'cloudSheet.low', lattice: 'low', genus: 'cu', xs: Array.from({ length: COLS }, (_, c) => c * 20),
    ys: [0, SECOND, 80, 120, 160, 200, 230, 250], alpha: Array.from({ length: RANGES.length * COLS }, (_, n) => cloud(n)),
    tone: Array(RANGES.length * COLS).fill(0.5), body: [0.6, 0.6, 0.65], shade: [0.3, 0.3, 0.35], lit: [0.95, 0.95, 0.95],
    air: { ranges: RANGES, east: [Math.sin(az(0)), Math.sin(az(1))], north: [Math.cos(az(0)), Math.cos(az(1))], frames } } as unknown as Sheet
  const field = sheetField(desc)
  if (!field) throw new Error('no field')
  const read = easedField(field)
  return sheetCaps(desc, read, cutOf(read, 5), 5)
}

describe('the caps of a broken sheet', () => {
  const still = capsAt([{ d: [0, 0], weight: 1 }])

  it('stand where the cloud is, along its rim and inside it', () => {
    expect(still.length).toBeGreaterThan(20)
    for (const { x, y, r } of still) if (y > SECOND) expect(x - r).toBeLessThan(260)
  })

  it('go with the air and keep their size: none jumps, or grows faster than it goes; few come or go', () => {
    const moved = new Map(capsAt([{ d: [0.005, 0.0025], weight: 1 }]).map((c) => [c.seed, c]))
    const kept = still.filter(({ seed }) => moved.has(seed))
    expect(kept.length).toBeGreaterThan(0.85 * still.length)
    for (const cap of kept) {
      const to = moved.get(cap.seed), most = cap.y > SECOND ? 2 : 6
      expect(Math.hypot((to?.x ?? 0) - cap.x, (to?.y ?? 0) - cap.y)).toBeLessThan(most)
      expect(Math.abs((to?.r ?? 0) - cap.r)).toBeLessThan(most)
    }
  })

  it('stay as they are when the frame that handed over to theirs leaves the list', () => {
    expect(capsAt([{ d: [3, 1], weight: 0 }, { d: [0, 0], weight: 1 }])).toEqual(still)
  })

  it('grow with the share their frame has', () => {
    const half = capsAt([{ d: [0, 0], weight: 0.5 }]), whole = new Map(still.map((c) => [c.seed, c]))
    expect(half.length).toBeGreaterThan(0)
    for (const { seed, r } of half) expect(r).toBeCloseTo(0.5 * (whole.get(seed)?.r ?? 0), 5)
  })
})
