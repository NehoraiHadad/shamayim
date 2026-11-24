import { describe, expect, it } from 'vitest'
import { outsideFrame, outsideProject, outsideSkyline } from './outsideView'
import type { CityTower } from './types'

const place = { lat: 32.08, lon: 34.78 }
const tower = (dx: number, dy: number, heightM: number, name?: string): CityTower => ({
  dx, dy, heightM, wClass: 1, name,
  lat: place.lat + dy / 111.32, lon: place.lon + dx / (111.32 * Math.cos(place.lat * Math.PI / 180)),
})

describe('the widths of the place seen from outside', () => {
  const frame = outsideFrame(undefined, 3, 195, 390, true)
  const look = { house: { w: 3 }, plan: 3 / 13, px: (heightM: number, k: number) => .5 * heightM * k / frame.k }

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

  it('widens a block no further than its own height needs', () => {
    const result = outsideSkyline({ place, towers: [], landmarks: [], frame, ground: () => 100,
      floor: 120, width: 390, look, fabric: [{ dx: 0, dy: 0, wKm: .01, heightM: 25, frontM: 70, seed: 1 }] })
    expect(result.boxes[0].w).toBeCloseTo(result.boxes[0].foot - result.boxes[0].top)
    expect(result.boxes[0].w).toBeCloseTo(12.5)
  })

  it('keeps a folded tower at its own plan width where it shows beside a taller block', () => {
    const result = outsideSkyline({ place, towers: [tower(0, 0, 45)], landmarks: [], frame, ground: () => 100,
      floor: 120, width: 390, look, fabric: [{ dx: 0, dy: 0, wKm: .01, heightM: 60, seed: 1 }] })
    expect(result.stats.folded).toBe(1)
    expect(result.boxes.find(b => b.heightM === 45)?.w).toBeCloseTo(look.plan * Math.sqrt(25 * 50))
  })

  it('keeps the spire when only a widened, newly raised facade reaches its bearing', () => {
    const spire = tower(0, 0, 45)
    const result = outsideSkyline({ place, towers: [spire], landmarks: [], frame, ground: () => 100,
      floor: 120, width: 390, look, fabric: [{ dx: .12, dy: 0, wKm: .01, heightM: 60, siteHeightM: 7.7, frontM: 45, seed: 1 }] })
    expect(result.towers.map(t => [t.x, t.heightM])).toEqual([[frame.centerX, 45]])
  })
})
