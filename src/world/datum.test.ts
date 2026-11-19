import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { anglePx } from '../data/terrain/angleScale'
import { apparentAngle, computePanorama } from '../data/terrain/panorama'
import { terrainFromPanorama, zeroContourOf } from '../data/terrain/panoramaTerrain'
import type { LocalTime } from '../domain/types'
import { DATUM_PLACES, SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { datumLineOf, outlineOf, placeContour, seaLevelAbove, zeroCrossings } from './datum'
import { LABEL_H, textWidth } from './layout'
import type { WorldState } from './types'
import { buildWorld } from './world'

/** Every place below sea level the harness has (docs/design/CANVAS-SCENE-PLAN.md §6, the datum fix). */
const BELOW = ['tiberias', 'ein-gedi', 'shadmot-mehola', 'beit-shean', 'jericho', 'kalya', 'neve-zohar']

describe('the 0 m contour of the place’s ground', () => {
  it('finds where the ground crosses 0 m between neighbouring spots, within the place only', () => {
    // A slope rising 100 m a km eastward, 0 m at 0.5 km east.
    const slope = (dx: number) => -50 + 100 * dx
    const box = { w: -1, e: 1, s: -1, n: 1 }
    const spots = zeroCrossings((dx) => slope(dx), box, .25)
    expect(spots.length).toBe(9)
    for (const { dx } of spots) expect(dx).toBeCloseTo(.5)
    expect(zeroCrossings((dx) => slope(dx), box, .25, (_, dy) => dy <= 0)).toHaveLength(5)
    // Ground below 0 m everywhere (or unknown): none.
    expect(zeroCrossings(() => -120, box, .25)).toEqual([])
    expect(zeroCrossings(() => null, box, .25)).toEqual([])
  })

  it('draws sea level where the place’s rule draws 0 m there, at the median height', () => {
    const contour = placeContour([{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }], (dx) => 100 + 10 * dx,
      (dx, _, h) => 50 - h * .1 - dx)
    expect(contour).toEqual([[100, 50], [110, 49], [120, 48]])
    expect(seaLevelAbove(contour, { y: 60 })).toEqual({ y: 49, points: contour })
    // A spot drawn under the dot is not sea level over a place below it.
    expect(seaLevelAbove(contour, { y: 49.5 })).toEqual({ y: 48.5, points: [[110, 49], [120, 48]] })
  })
})

describe('sea level on the land the panorama draws', () => {
  it('stands where the eye sees the slopes pass through 0 m, on the land’s own vertical scale', () => {
    // An eye 200 m below sea level; the land rising 100 m a km from 300 m below it: 0 m at 3 km in every direction.
    const p = computePanorama((km) => -300 + 100 * km, -202)
    const terrain = terrainFromPanorama(p, { horizonY: 100 })
    const contour = terrain.zeroContour!
    expect(contour.length).toBe(p.rays.length)
    const y = 100 - anglePx(apparentAngle(0, 3, p.eyeM))
    for (const [, cy] of contour) expect(cy).toBeCloseTo(y, 0)
    expect(terrain.seaY).toBeCloseTo(y, 0)
    // Sea level is above the eye: over eye level, under the crest the eye sees.
    expect(y).toBeLessThan(100)
    expect(y).toBeGreaterThan(terrain.nearPoints[0][1])
  })

  it('takes only the 0 m the eye sees: a slope hidden behind nearer land has none', () => {
    // A wall 50 m above the eye at 1 km hides the land behind it, which only reaches 0 m at 10 km.
    const p = computePanorama((km) => km < 1.05 && km > .95 ? -150 : -300 + 30 * km, -202)
    expect(zeroContourOf(p, (i) => i, (a) => 100 - anglePx(a))).toEqual([])
    // Above sea level there is none at all.
    expect(terrainFromPanorama(computePanorama((km) => 100 + 10 * km, 300)).zeroContour).toBeUndefined()
  })

  it('keeps only the spots above the dot', () => {
    expect(seaLevelAbove([[10, 40], [20, 60], [30, 50], [40, 90]], { y: 80 })).toEqual({ y: 50, points: [[10, 40], [20, 60], [30, 50]] })
    expect(seaLevelAbove([[10, 90]], { y: 80 })).toBeNull()
    expect(seaLevelAbove(undefined, { y: 80 })).toBeNull()
  })
})

describe('the datum’s line', () => {
  it('runs from the hollow at the dot to the drawn land rising through it, the place’s own land included', () => {
    const outline = outlineOf((x) => (x < 250 ? 90 : 30), [[200, 60], [201, 40], [202, 40]], 375)
    expect(outline[201][1]).toBe(40)
    const line = datumLineOf({ y: 50, points: [] }, outline, 187.5)
    expect(line.y).toBe(50)
    expect(line.x1).toBe(96) // no flank on the west: the open side
    expect(line.x2).toBeGreaterThan(200)
    expect(line.x2).toBeLessThan(210)
  })
})

describe('the datum at every place below sea level', () => {
  let loaded: Map<string, LoadedPlace>
  const worlds = new Map<string, WorldState>()
  beforeAll(async () => {
    stubPublicFetch()
    loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter((p) => BELOW.includes(p.id)))
  }, 120_000)
  afterAll(() => { vi.unstubAllGlobals() })
  const worldOf = (id: string) => {
    let world = worlds.get(id)
    if (!world) worlds.set(id, world = buildWorld(worldInput(loaded.get(id)!, '2026-11-17T12:00' as LocalTime)))
    return world
  }

  it('stands above the dot, with its note over the line and the height label clear of both', { timeout: 120_000 }, () => {
    for (const id of BELOW) {
      const world = worldOf(id)
      const line = world.labels.datum
      expect(line, id).toBeTruthy()
      const dot = world.place3.dot
      expect(line!.y, id).toBeLessThan(dot.y)
      const note = world.labels.notes.find((n) => n.kind === 'datum')!
      expect(note.top + note.height, id).toBeLessThanOrEqual(line!.y)
      expect(note.left, id).toBeGreaterThanOrEqual(line!.x1 - 1e-9)
      expect(note.left + note.width, id).toBeLessThanOrEqual(line!.x2 + 1e-9)
      const { height } = world.labels
      const w = textWidth(height.text, 11)
      const crosses = height.x + w / 2 > line!.x1 && height.x - w / 2 < line!.x2 && height.y - 2.5 < line!.y + 1 && height.y + LABEL_H + 2.5 > line!.y - 1
      expect(crosses, id).toBe(false)
    }
  })

  it('stands over Tiberias’s dot by the place’s own rule and meets the slope behind it', () => {
    const world = worldOf('tiberias')
    const line = world.labels.datum!
    expect(world.place3.dot.y - line.y).toBeGreaterThan(3)
    // The town's slope behind the dot (its own land where it rises over the ridge line, else the ridge) meets the line
    // (tucked 6 px into the land).
    const place3 = world.place3
    if (place3.kind !== 'outside') throw new Error('tiberias is seen from outside')
    const ridge = loaded.get('tiberias')!.terrain.nearPoints
    const ridgeAt = (x: number) => {
      const i = ridge.findIndex(([px]) => px >= x)
      return ridge[i - 1][1] + (ridge[i][1] - ridge[i - 1][1]) * (x - ridge[i - 1][0]) / (ridge[i][0] - ridge[i - 1][0])
    }
    const meet = line.x2 - 6
    const land = place3.land?.top.find(([x]) => Math.round(x) === Math.round(meet))?.[1] ?? Infinity
    expect(Math.abs(Math.min(ridgeAt(meet), land) - line.y)).toBeLessThan(1)
  })
})
