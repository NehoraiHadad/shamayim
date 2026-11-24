import { describe, expect, it, vi } from 'vitest'
import { correctCloudCover, type CloudObservation } from '../../domain/observedCloud'
import { SAMPLE_PX, type MaskReading } from './cloudMask'
import { observeCloud } from './observeCloud'

type Rect = readonly [x: number, y: number, w: number, h: number]
const LAT = 32.348, LON = 35.535
const at = (hour: number, minute = 0) => Date.UTC(2026, 10, 24, hour, minute)
const covered = (...rects: Rect[]): MaskReading => ({ cover: 0,
  mask: Array.from({ length: SAMPLE_PX ** 2 }, (_, k) => rects.some(([x, y, w, h]) =>
    k % SAMPLE_PX >= x && k % SAMPLE_PX < x + w && Math.floor(k / SAMPLE_PX) >= y && Math.floor(k / SAMPLE_PX) < y + h)) })
const clear = covered()
const patch = covered([16, 12, 2, 2])

/** The real masks around Shadmot Mehola on 24 Nov 2026 (UTC); the middle 30 km was clear in all of them. */
const shadmot = new Map([[at(13), clear], [at(13, 15), clear],
  [at(14), covered([21, 7, 3, 9])],
  [at(14, 15), covered([21, 7, 3, 3], [20, 10, 4, 2], [21, 12, 3, 2], [0, 14, 4, 2], [20, 14, 4, 2], [0, 16, 2, 2],
    [21, 16, 2, 2], [0, 18, 4, 2], [0, 20, 2, 1], [0, 21, 4, 3], [20, 23, 3, 1])],
  [at(14, 30), covered([21, 7, 3, 3], [0, 8, 1, 2], [20, 10, 4, 2], [0, 12, 2, 2], [21, 12, 3, 2], [0, 14, 4, 2],
    [20, 14, 4, 2], [0, 16, 2, 2], [21, 16, 2, 2], [0, 18, 4, 3], [0, 21, 6, 3], [20, 23, 3, 1])]])
const without = (...slots: number[]) => new Map([...shadmot].filter(([slot]) => !slots.includes(slot)))

async function observe(masks: ReadonlyMap<number, MaskReading>, slots: readonly number[] = [at(14, 30), at(14, 15), at(14)]) {
  const read = vi.fn(async (slot: number) => masks.get(slot) ?? null)
  const got = await observeCloud(read, slots, LAT, LON)
  return { got, seen: got?.seen, sightings: got?.seen.sightings ?? [], read: read.mock.calls.map(([slot]) => slot) }
}

describe('the sky over Shadmot Mehola, 24 Nov 2026', () => {
  it('is clear: no cover is left of the model’s 53 at 16:50, and no patch of the mask is a cloud', async () => {
    const { seen, read } = await observe(shadmot)
    expect(seen).toEqual({ cover: 0, before: [0, 0], daylight: 0, sightings: [] })
    expect(read).toEqual([at(14, 30), at(14, 15), at(14), at(13)])
    const coverNow = (obs: Omit<CloudObservation, 'at'>) =>
      correctCloudCover({ ...obs, at: '2026-11-24T16:30' }, '2026-11-24T16:50', undefined, 53, () => 53)
    expect(coverNow(seen!)).toBe(0)
    // With one slot alone the cap leaves 13.
    expect(coverNow({ ...seen!, before: [] })).toBe(13)
  })
  it('keeps the patches of the same masks when they stood there in daylight', async () => {
    const { sightings } = await observe(new Map(shadmot).set(at(13), shadmot.get(at(14))!))
    expect(sightings.length).toBeGreaterThan(0)
  })
})

describe('observeCloud', () => {
  it('takes no failed slot for a clear one', async () => {
    expect((await observe(without(at(14, 15)))).seen!.before).toEqual([])
    expect((await observe(without(at(14)))).seen!.before).toEqual([0])
    expect((await observe(new Map())).got).toBeNull()
  })
  it('shows no patch of low sun when the slot that would tell is missing, and lets no other missing slot refute one', async () => {
    expect((await observe(without(at(13)))).sightings).toEqual([])
    const standing = without(at(14, 15), at(14)).set(at(13), shadmot.get(at(14, 30))!)
    expect((await observe(standing)).sightings.length).toBeGreaterThan(0)
  })
  it('falls back to an older slot while the newest is not out', async () => {
    const { got, read } = await observe(without(at(14, 30)))
    expect(got!.slot).toBe(at(14, 15))
    expect(read.slice(0, 2)).toEqual([at(14, 30), at(14, 15)])
  })
  it('takes by day what the mask shows, newborn or not, with no more requests', async () => {
    const { seen, sightings, read } = await observe(new Map([[at(10), patch], [at(9, 45), clear], [at(9, 30), clear]]), [at(10)])
    expect(sightings).toHaveLength(1)
    expect(seen!.daylight).toBe(1)
    expect(read).toEqual([at(10), at(9, 45), at(9, 30)])
  })
  it('asks for no daylight slot of an evening with no patch in it', async () => {
    const { sightings, read } = await observe(new Map([at(14, 30), at(14, 15), at(14)].map((slot) => [slot, clear])))
    expect(sightings).toEqual([])
    expect(read).toHaveLength(3)
  })
  it('holds a dawn patch to the night before it', async () => {
    const dawn = (night: MaskReading) => observe(new Map([
      ...Array.from({ length: 12 }, (_, k): [number, MaskReading] => [at(1, k * 15), night]),
      ...[0, 15, 30].map((minute): [number, MaskReading] => [at(4, minute), patch])]), [at(4, 30)])
    expect((await dawn(clear)).sightings).toEqual([])
    expect((await dawn(patch)).sightings).toHaveLength(1)
  })
})
