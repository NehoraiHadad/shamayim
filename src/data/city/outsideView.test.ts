import { describe, expect, it } from 'vitest'
import { baseYAt, budget, dedupeTowers, outsideFrame, outsideProject, outsideSkyline } from './outsideView'
import { composeFabric, visibleFabric } from './fabricSlots'
import type { CityTower } from './types'

const place = { lat: 32.08, lon: 34.78 }
const tower = (dx: number, dy: number, heightM: number, name?: string): CityTower => ({
  dx, dy, heightM, wClass: 1, name,
  lat: place.lat + dy / 111.32, lon: place.lon + dx / (111.32 * Math.cos(place.lat * Math.PI / 180)),
})

describe('the place seen from outside', () => {
  const frame = outsideFrame(undefined, 3, 195, 390, true)
  const look = { house: { w: 3 }, plan: 3 / 13, px: (heightM: number, k: number) => heightM * k }

  it('changes frontage continuously through the house roof threshold', () => {
    const frontM = 26
    const widths = [12.4, 12.6, 13.4].map(heightM => {
      const result = outsideSkyline({ place, towers: [], landmarks: [], frame, ground: () => 100,
        floor: 120, width: 390, look, fabric: [{ dx: 0, dy: 0, wKm: .01, heightM, frontM, seed: 1 }] })
      expect(result.boxes).toHaveLength(1)
      return result.boxes[0].w
    })
    expect(widths[0]).toBeCloseTo(look.house.w)
    expect(widths[1] - widths[0]).toBeCloseTo((look.plan * frontM - look.house.w) * .1 / 12.5)
    expect(widths[2]).toBeGreaterThan(widths[1])
  })

  it('projects the mapped frontage at the same depth as each roof', () => {
    const frontM = 26
    for (const dy of [-1, 1]) {
      const { k } = outsideProject(frame, 0, dy)
      const result = outsideSkyline({ place, towers: [], landmarks: [], frame, ground: () => 100,
        floor: 120, width: 390, look, fabric: [{ dx: 0, dy, wKm: .01, heightM: 25, frontM, seed: 1 }] })
      expect(result.boxes).toHaveLength(1)
      expect(result.boxes[0].w).toBeCloseTo(frontM * look.plan * k / frame.k)
    }
  })

  it('keeps a folded tower at its own plan width where it shows beside a taller block', () => {
    const result = outsideSkyline({ place, towers: [tower(0, 0, 45)], landmarks: [], frame, ground: () => 100,
      floor: 120, width: 390, look, fabric: [{ dx: 0, dy: 0, wKm: .01, heightM: 60, seed: 1 }] })
    expect(result.stats.folded).toBe(1)
    expect(result.boxes.find(b => b.heightM === 45)?.w).toBeCloseTo(look.plan * Math.sqrt(25 * 50))
  })

  it('keeps distant mixed frontages and resolves overlap across slot boundaries', () => {
    const body = (x: number, w: number, foot: number, near: number) => ({
      expanded: true, box: { x, w, foot, top: foot - 8, near, kind: 'mass' as const },
    })
    const small = body(100, 4.5, 100, .8)
    const wide = body(157, 7.8, 100, .8)
    const overlapping = body(104, 8, 100, .7)
    const backRow = body(157, 7.8, 96, .6)
    expect(composeFabric([small, wide, overlapping, backRow], 3))
      .toEqual([small.box, wide.box, backRow.box])
  })

  it('keeps a roof exposed through a subpixel gap', () => {
    const front = { x: 100.4, w: .8, top: 90, foot: 100, near: .8, kind: 'mass' as const }
    const behind = { ...front, x: 100.6, top: 94, near: .6 }
    expect(visibleFabric([front, behind], 390)).toEqual([front, behind])
  })

  it('keeps a short house row between same-frontage rows on a slope', () => {
    const house = (foot: number, near: number) => ({ expanded: true, house: true,
      box: { x: 100, w: 3, top: foot - 2, foot, near, kind: 'mass' as const } })
    const front = house(100, .8), middle = house(98.7, .7), rear = house(97.4, .6)
    expect(composeFabric([front, middle, rear], 3)).toEqual([front.box, middle.box, rear.box])
    const lowerRear = { ...rear.box, top: 104, foot: 106 }
    expect(visibleFabric([front.box, lowerRear], 390)).toEqual([lowerRear, front.box])
  })

  it('keeps the spire when only a widened, newly raised facade reaches its bearing', () => {
    const spire = tower(0, 0, 45)
    const result = outsideSkyline({ place, towers: [spire], landmarks: [], frame, ground: () => 100,
      floor: 120, width: 390, look, fabric: [{ dx: .12, dy: 0, wKm: .01, heightM: 60, skylineHeightM: 7.7, frontM: 45, seed: 1 }] })
    expect(result.towers.map(t => [t.x, t.heightM])).toEqual([[frame.centerX, 45]])
  })

  it('puts east on the left, the dot in the middle, and the north nearer and larger', () => {
    expect(outsideProject(frame, 0, 0).x).toBe(195)
    expect(outsideProject(frame, 1, 0).x).toBeLessThan(195)
    expect(outsideProject(frame, -1, 0).x).toBeGreaterThan(195)
    const north = outsideProject(frame, 0, 2), south = outsideProject(frame, 0, -2)
    expect(north.k).toBeGreaterThan(south.k)
    expect(north.near).toBeGreaterThan(south.near)
    expect(baseYAt(() => 100, 195, north.near, 120)).toBeGreaterThan(baseYAt(() => 100, 195, south.near, 120))
  })

  it('keeps the whole place in the view', () => {
    for (const [dx, dy] of [[-3, 3], [3, 3], [-3, -3], [3, -3]]) {
      const { x } = outsideProject(frame, dx, dy)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(390)
    }
  })

  it('always draws a 300 m tower over a 90 m one, wherever they stand', () => {
    const far300 = outsideProject(frame, 0, -3).k * 300, near90 = outsideProject(frame, 0, 3).k * 90
    expect(far300).toBeGreaterThan(near90)
  })

  it('drops a building listed twice, not twin towers', () => {
    const twice = [tower(1, 1, 90, 'G'), tower(1.001, 1, 90)]
    expect(dedupeTowers(twice)).toHaveLength(1)
    const twins = [tower(1, 1, 155), tower(1.045, 1, 155)]
    expect(dedupeTowers(twins)).toHaveLength(2)
  })

  it('draws more where there are more, but never more than the slot holds', () => {
    const drawn = [1, 2, 5, 10, 30, 100].map(count => budget(count, 6))
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
    expect(Math.max(...drawn)).toBeLessThanOrEqual(6)
    expect(budget(1, 6)).toBe(1)
  })

  it('accounts for every tower in the place', () => {
    const towers = Array.from({ length: 60 }, (_, i) => tower(-2 + (i % 12) * .3, -2 + Math.floor(i / 12) * .8,
      40 + (i * 37) % 200))
    const result = outsideSkyline({ place, towers, landmarks: [], frame, ground: () => 100, floor: 120, width: 390 })
    const { inPlace, glyph, silhouette, folded, dropped } = result.stats
    expect(inPlace).toBe(60)
    expect(glyph + silhouette + folded + dropped).toBe(inPlace)
    expect(glyph).toBeGreaterThan(0)
  })
})
