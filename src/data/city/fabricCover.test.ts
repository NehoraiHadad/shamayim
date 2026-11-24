import { expect, it } from 'vitest'
import { seeded } from '../landmarks/hash'
import { LEAST_SHOWN_PX, shownBlocks, shownWidth } from './fabricCover'
import { composeBodies, type FabricSite } from './fabricSlots'
import { outsideFrame, outsideProject, outsideSkyline, type FabricCell, type OutsideBox } from './outsideView'
import { visible } from './skylineMass'

const body = (x: number, w: number, h: number, near = .5, foot = 100, seed = 1): OutsideBox =>
  ({ x, w, foot, top: foot - h, near, kind: 'mass', heightM: 25, seed })
const widened = (box: OutsideBox): FabricSite =>
  ({ ...box, heightM: 25, siteW: 1, siteTop: box.top, slotW: 0, cell: { dx: 0, dy: 0, wKm: .01, heightM: 25, seed: box.seed! } })
const shown = (boxes: OutsideBox[]) => {
  const sites = boxes.map(widened)
  return shownBlocks(sites).map(site => boxes[sites.indexOf(site)])
}
/** The px of a body over another's roof and beside it. */
const shownArea = (rear: OutsideBox, front: OutsideBox) => {
  const from = Math.max(rear.x - rear.w / 2, front.x - front.w / 2), to = Math.min(rear.x + rear.w / 2, front.x + front.w / 2)
  const over = Math.max(0, to - from), h = rear.foot - rear.top
  return (rear.w - over) * h + over * Math.max(0, front.top - rear.top)
}

it('keeps a taller block behind a lower one, however their fronts line up', () => {
  for (const w of [9, 9.3, 12, 30]) {
    const front = body(100, w, 10, .5), rear = body(101.52, 9, 20, .49, 99.8, 2)
    expect(shown([rear, front])).toEqual([front, rear])
  }
})

it('leaves a block out once less than the narrowest building of it shows, beside a wall or over a roof', () => {
  const front = body(100, 9, 10), behind = (w: number, h: number) => shown([front, body(100, w, h, .4, 99.9, 2)]).length
  expect(behind(9, 9.9)).toBe(1)
  for (const [share, count] of [[.95, 1], [1.05, 2]]) {
    expect(behind(9 + share * LEAST_SHOWN_PX, 5)).toBe(count)
    expect(behind(9, 9.9 + share * LEAST_SHOWN_PX / 9)).toBe(count)
  }
})

it('lets a farther block show where the one that hid it is itself left out', () => {
  const near = body(100, 9, 10), middle = body(101.3, 10.6, 9.9, .4, 99.9, 2), far = body(106.25, 4.5, 9, .3, 99.8, 3)
  // The near one leaves 2.1 px of the middle, the middle 1.9 of the far: what is left out takes nothing.
  expect(shown([near, middle])).toEqual([near])
  expect(shown([middle, far])).toEqual([middle])
  expect(shown([near, middle, far])).toEqual([near, far])
})

it('shows no less when what stands in front is narrower, lower or fewer', () => {
  const rear = body(100, 9, 14)
  const at = (w: number, h: number) => shownWidth(rear, [body(102, w, h)])
  for (let i = 1; i < 120; i++) {
    expect(at(.1 * i, 10)).toBeLessThanOrEqual(at(.1 * (i - 1), 10) + 1e-9)
    expect(at(6, .2 * i)).toBeLessThanOrEqual(at(6, .2 * (i - 1)) + 1e-9)
  }
  const pair = [body(98, 5, 10), body(102, 5, 12)]
  expect(shownWidth(rear, pair)).toBeLessThanOrEqual(Math.min(...pair.map(f => shownWidth(rear, [f]))))
})

it('measures what shows over any roofs in front, px by px', () => {
  const random = seeded(11)
  for (let i = 0; i < 40; i++) {
    const rear = body(100, 4 + 8 * random(), .5 + 12 * random())
    const front = Array.from({ length: 12 }, () => body(90 + 20 * random(), 1 + 6 * random(), 14 * random()))
    const step = .005
    let sum = 0
    for (let x = 100 - rear.w / 2 + step / 2; x < 100 + rear.w / 2; x += step) {
      const roof = Math.min(rear.foot, ...front.filter(f => Math.abs(f.x - x) < f.w / 2).map(f => f.top))
      sum += step * Math.min(1, Math.max(0, roof - rear.top))
    }
    expect(Math.abs(shownWidth(rear, front) - sum)).toBeLessThan(.1)
  }
})

it('never jumps by more than the sliver as a frontage grows through the cutoff', () => {
  const rear = body(102, 8, 16, .4, 99.9, 2), step = .1
  const areas = Array.from({ length: 160 }, (_, i) => {
    const front = body(100, 2 + i * step, 10)
    return (2 + i * step) * 10 + (shown([front, rear]).includes(rear) ? shownArea(rear, front) : 0)
  })
  const low = { ...rear, top: rear.foot - 9 }
  const beside = Array.from({ length: 160 }, (_, i) => {
    const front = body(100, 2 + i * step, 10)
    return (2 + i * step) * 10 + (shown([front, low]).includes(low) ? shownArea(low, front) : 0)
  })
  for (const [all, h] of [[areas, 16], [beside, 9]] as const) {
    for (let i = 1; i < all.length; i++) expect(Math.abs(all[i] - all[i - 1])).toBeLessThan(LEAST_SHOWN_PX * h + step * 10)
  }
  expect(shown([body(100, 18, 10), low]).length).toBe(1)
  expect(shown([body(100, 18, 10), rear]).length).toBe(2)
})

it('draws the same bodies whatever order the same set comes in, level and equally near ones too', () => {
  const random = seeded(7)
  const set = Array.from({ length: 60 }, (_, i) => {
    const row = Math.floor(random() * 4)
    return widened(body(Math.round(random() * 60), 4 + 8 * random(), 6 + 10 * random(), .2 * row, 100 + 2 * row, i + 1))
  })
  const drawn = (sites: readonly FabricSite[]) => visible(composeBodies(sites, 12.5), 375)
  const first = drawn(set)
  expect(first.length).toBeLessThan(set.length)
  for (let i = 0; i < 8; i++) {
    const shuffled = set.map(site => ({ site, u: random() })).sort((a, b) => a.u - b.u).map(({ site }) => site)
    expect(drawn(shuffled)).toEqual(first)
  }
})

it('hides a house behind a widened block only where none of it shows', () => {
  const frame = outsideFrame(undefined, 3, 195, 390, true)
  const look = { house: { w: 3 }, plan: 3 / 13, px: (heightM: number, k: number) => .5 * heightM * k / frame.k }
  const block: FabricCell = { dx: 0, dy: .1, wKm: .01, heightM: 25, frontM: 45, seed: 1 }
  const houseAt = (dx: number): FabricCell => ({ dx, dy: 0, wKm: .01, heightM: 7.7, seed: 2 })
  const boxes = (dx: number) => outsideSkyline({ place: { lat: 32, lon: 35 }, towers: [], landmarks: [], frame, ground: () => 100,
    floor: 120, width: 390, look, fabric: [houseAt(dx), block] }).boxes
  const front = boxes(0).find(b => b.seed === 1)!
  expect(front.w).toBeGreaterThan(9)
  for (let dx = 0; dx < .6; dx += .01) {
    const house = boxes(dx).find(b => b.seed === 2)
    const beyond = Math.abs(outsideProject(frame, dx, 0).x - front.x) + look.house.w / 2 - front.w / 2
    if (!house) expect(beyond).toBeLessThan(1)
    if (beyond <= 0) expect(house).toBeUndefined()
  }
})
