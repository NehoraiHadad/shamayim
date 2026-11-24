import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NEAR_DROP, outsideProject } from '../data/city/outsideView'
import type { LocalTime } from '../domain/types'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, VILLAGE_PLACES } from '../test/scenePlaces'
import { groundFn } from '../data/landmarks/seat'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { LAND_TOP, placeDotY, verticalScale, VSCALE } from './outside'
import type { OutsideView, WorldState } from './types'
import { buildWorld } from './world'

/**
 * The outside view's one vertical scale (owner decision 14, "uniform per place"; CANVAS-SCENE-PLAN.md §6): one px per
 * metre above and below the dot, chosen from the room, clamped; the dot under the near ridge's crest on it.
 */
describe('the place’s one vertical scale', () => {
  it('fills a band of the room that grows with the relief and saturates', () => {
    const room = 59
    const mid = verticalScale(300, room)
    expect(mid).toBeCloseTo(VSCALE.fill * room / (300 + VSCALE.r0), 9)
    // A taller place takes more px in all, at fewer px a metre.
    expect(verticalScale(450, room) * 450).toBeGreaterThan(mid * 300)
    expect(verticalScale(450, room)).toBeLessThan(mid)
    // Never more than the room.
    for (const r of [80, 200, 400, 800]) expect(verticalScale(r, room) * r).toBeLessThanOrEqual(room + 1e-9)
  })

  it('is clamped: a flat city not blown up, a mountain not crushed', () => {
    expect(verticalScale(10, 59)).toBe(VSCALE.max)
    expect(verticalScale(0, 59)).toBe(VSCALE.max)
    expect(verticalScale(5000, 59)).toBe(VSCALE.min)
    expect(VSCALE.min).toBeLessThan(VSCALE.max)
  })

  it('lays the dot under the crest by the crest’s height over it, on the same scale, moved only to stay in the land area', () => {
    const base = { ridgeY: 60, crestM: 200, h0: 100, s: .1, up: -10, down: 10, shore: null, landTop: 40, floor: 108, horizon: 100 }
    expect(placeDotY(base)).toBeCloseTo(70, 9)
    // Higher than the crest: over the ridge line by as much.
    expect(placeDotY({ ...base, crestM: 50 })).toBeCloseTo(55, 9)
    // No crest known: on the ridge line.
    expect(placeDotY({ ...base, crestM: Number.NaN })).toBe(60)
    // Its top kept under the land area's top, its bottom over the floor, a coast's shore at or under the sea horizon.
    expect(placeDotY({ ...base, up: -40 })).toBe(80)
    expect(placeDotY({ ...base, down: 50 })).toBe(58)
    expect(placeDotY({ ...base, shore: 15 })).toBe(85)
    // The floor wins.
    expect(placeDotY({ ...base, shore: 15, down: 40 })).toBe(68)
  })
})

describe('at every harness place', () => {
  const places = [...SCENE_PLACES, ...DATUM_PLACES, ...SKYLINE_STUDY_PLACES.filter((p) => p.id !== 'ramat-gan')]
  let loaded: Map<string, LoadedPlace>
  const worlds = new Map<string, WorldState>()
  beforeAll(async () => {
    stubPublicFetch()
    loaded = await loadPlaces([...places, ...VILLAGE_PLACES.filter(({ id }) => id === 'majdal-shams')])
  }, 120_000)
  afterAll(() => { vi.unstubAllGlobals() })
  const worldOf = (id: string) => {
    let world = worlds.get(id)
    if (!world) worlds.set(id, world = buildWorld(worldInput(loaded.get(id)!, '2026-11-17T12:00' as LocalTime)))
    return world
  }

  it('draws one metre as one metre above and below the dot (px per metre ratio 1)', { timeout: 120_000 }, () => {
    for (const { id } of places) {
      const view = worldOf(id).place3 as OutsideView
      const heightNear = loaded.get(id)!.terrain.heightNear
      // Ramon crater is no settlement: no built cells, no local lie (the dot on the ridge line).
      if (!view.vscale) { expect(id).toBe('ramon-crater'); continue }
      const { s, h0 } = view.vscale
      expect(s, id).toBeGreaterThanOrEqual(VSCALE.min)
      expect(s, id).toBeLessThanOrEqual(VSCALE.max)
      const near0 = outsideProject(view.frame, 0, 0).near
      // Every row's foot (off the floor) by its depth and its ground's height on the one scale, above the dot and below.
      const rows = view.skyline.boxes.filter((b) => b.dx !== undefined && b.foot < 108 - 1e-6).map((b) => {
        const h = heightNear!(b.dx!, b.dy!) ?? h0
        const depth = (outsideProject(view.frame, b.dx!, b.dy!).near - near0) * NEAR_DROP
        return { rise: h - h0, px: view.dot.y + 1 + depth - b.foot }
      })
      for (const r of rows) expect(r.px, id).toBeCloseTo(r.rise * s, 6)
      // Measured: px per metre over the dot and under it.
      const slope = (list: typeof rows) => list.reduce((a, r) => a + r.px * r.rise, 0) / list.reduce((a, r) => a + r.rise * r.rise, 0)
      const above = rows.filter((r) => r.rise > 5), below = rows.filter((r) => r.rise < -5)
      if (above.length && below.length) expect(slope(below) / slope(above), id).toBeCloseTo(1, 6)
    }
  })

  it('keeps the picture in the land area, and the mountain places tall (Haifa’s Carmel, Jerusalem, Rosh Pina: rows over 20 px)', () => {
    for (const { id } of places) {
      const view = worldOf(id).place3 as OutsideView
      if (!view.vscale) continue
      expect(view.dot.y, id).toBeGreaterThanOrEqual(LAND_TOP - 1)
      expect(view.dot.y, id).toBeLessThan(108)
    }
    for (const id of ['haifa', 'jerusalem', 'rosh-pina']) {
      const view = worldOf(id).place3 as OutsideView
      const feet = view.skyline.boxes.map((b) => b.foot)
      expect(Math.max(...feet) - Math.min(...feet), id).toBeGreaterThan(20)
    }
  })

  it('lays the dot under the near ridge’s crest by the crest’s height over the place where the land area allows (Tiberias)', () => {
    const world = worldOf('tiberias')
    const view = world.place3 as OutsideView
    // Tiberias's crest at the dot stands 274 m over the town: the dot well under the ridge line, no longer on it.
    expect(view.dot.y - world.terrain.near!.points.find(([x]) => x >= view.dot.x)![1]).toBeGreaterThan(20)
  })

  it('draws the place?s ground as one edge, never a comb of single columns', { timeout: 120_000 }, () => {
    const TOOTH_PX = 2.5, APART_PX = 4
    const teeth = ['majdal-shams', 'ein-gedi'].flatMap((id) => {
      const points = worldOf(id).terrain.near!.points
      const at = groundFn(points, 375)
      const found = points.filter(([x, y]) => x > APART_PX && x < 375 - APART_PX
        && Math.min(at(x - APART_PX), at(x + APART_PX)) - y > TOOTH_PX)
      return found.map(([x, y]) => `${id} ${x.toFixed(1)} ${y.toFixed(1)}`)
    })
    expect(teeth).toEqual([])
  })
})
