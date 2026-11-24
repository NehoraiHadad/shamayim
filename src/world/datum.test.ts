import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { anglePx } from '../data/terrain/angleScale'
import { apparentAngle, computePanorama } from '../data/terrain/panorama'
import { terrainFromPanorama, zeroContourOf } from '../data/terrain/panoramaTerrain'
import type { LocalTime } from '../domain/types'
import { DATUM_PLACES, SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { datumOfRow, datumOnLand, OPEN_REACH } from './datum'
import { groundAt as lineAt } from './sceneLight'
import { heightLabelBox } from './sceneClearance'
import type { WorldState } from './types'
import { buildWorld } from './world'

/** Every place below sea level the harness has (docs/design/CANVAS-SCENE-PLAN.md §6, the datum fix). */
const BELOW = ['tiberias', 'ein-gedi', 'shadmot-mehola', 'beit-shean', 'jericho', 'kalya', 'neve-zohar']

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

})

describe('the datum’s line', () => {
  it('runs along the dot’s row from one 0 m crossing to the other', () => {
    const line = datumOfRow(50, 187.5, { left: 120, right: 230 })
    expect(line).toEqual({ x1: 120, x2: 230, y: 50, segments: [{ x1: 120, x2: 230, fadeLeft: 0, fadeRight: 0 }] })
  })

  it('ends a side whose ground stays below 0 m a short way past the dot, fading out, never at the frame’s edge', () => {
    const line = datumOfRow(50, 187.5, { left: null, right: 236 })
    expect(line.segments[0].x1).toBeCloseTo(187.5 - OPEN_REACH)
    expect(line.segments[0].x2).toBe(236)
    // The fade leaves at least the note's width solid.
    expect(line.x2 - line.x1 - line.segments[0].fadeLeft).toBeGreaterThanOrEqual(44 - 1e-9)
    expect(line.segments[0].fadeLeft).toBeGreaterThan(0)
    expect(line.segments[0].fadeRight).toBe(0)
    // No crossing on either side: a short stretch round the dot, fading both ways; inside the frame at its edge.
    const flat = datumOfRow(50, 187.5, { left: null, right: null })
    expect([flat.x1, flat.x2]).toEqual([187.5 - OPEN_REACH, 187.5 + OPEN_REACH])
    expect(flat.segments[0].fadeLeft).toBeGreaterThan(0)
    expect(flat.segments[0].fadeRight).toBeGreaterThan(0)
    expect(datumOfRow(50, 20, { left: null, right: 90 }).x1).toBe(0)
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
      // No land under sea level's height along the row: no line and no note (decision 14's follow-up).
      if (!line) { expect(world.labels.notes.some((n) => n.kind === 'datum'), id).toBe(false); continue }
      const dot = world.place3.dot
      expect(line!.y, id).toBeLessThan(dot.y)
      const note = world.labels.notes.find((n) => n.kind === 'datum')!
      expect(note.top + note.height, id).toBeLessThanOrEqual(line!.y)
      // Over a visible piece of the line: its middle over the note's piece (centred on a piece shorter than the text).
      expect(note.left + note.width / 2, id).toBeGreaterThanOrEqual(line!.x1 - 1e-9)
      expect(note.left + note.width / 2, id).toBeLessThanOrEqual(line!.x2 + 1e-9)
      expect(line!.segments.some((seg) => seg.x1 === line!.x1 && seg.x2 === line!.x2), id).toBe(true)
      const badge = heightLabelBox(world.labels.height, 375)
      const crosses = line!.segments.some((seg) => badge.x + badge.w > seg.x1 && badge.x < seg.x2
        && badge.y < line!.y + 1 && badge.y + badge.h > line!.y - 1)
      expect(crosses, id).toBe(false)
      // Only where land crosses it, or a short way past the dot fading out: never on to the frame's edge.
      for (const seg of line!.segments) {
        expect(seg.x1 > 0 && seg.x2 < 375, id).toBe(true)
        if (seg.fadeLeft) expect(seg.x1, id).toBeGreaterThanOrEqual(dot.x - OPEN_REACH - 1e-9)
        if (seg.fadeRight) expect(seg.x2, id).toBeLessThanOrEqual(dot.x + OPEN_REACH + 1e-9)
      }
    }
  })

  it('stands at 0 m on the place’s one vertical scale: |h0| × s over the dot', () => {
    for (const id of BELOW) {
      const world = worldOf(id)
      const view = world.place3
      if (view.kind !== 'outside') throw new Error(`${id} is seen from outside`)
      const { vscale } = view
      expect(vscale, id).not.toBeNull()
      expect(vscale!.h0, id).toBeLessThan(0)
      // The dot is a base's y less 1 (it sits on its ground's line): sea level stands |h0| × s over that ground.
      if (world.labels.datum) expect(world.labels.datum.y, id).toBeCloseTo(view.dot.y + 1 + vscale!.h0 * vscale!.s, 6)
    }
  })

  it('lies on land only, and each hard end is where the row’s ground is 0 m or where the land’s edge meets the line', () => {
    for (const id of BELOW) {
      const world = worldOf(id)
      const view = world.place3
      if (view.kind !== 'outside') throw new Error(`${id} is seen from outside`)
      const line = world.labels.datum
      if (!line) continue
      const near = world.terrain.near.points, far = world.terrain.far.points
      const landTop = (x: number) => Math.min(lineAt(near, x), lineAt(far, x))
      const heightNear = loaded.get(id)!.terrain.heightNear!
      const { frame } = view
      for (const seg of line.segments) {
        for (let x = seg.x1; x <= seg.x2; x += 1) expect(line.y, `${id} ${x}`).toBeGreaterThanOrEqual(landTop(x) - .5)
        for (const [x, faded] of [[seg.x1, seg.fadeLeft], [seg.x2, seg.fadeRight]] as const) {
          if (faded) continue
          // Back from the screen to the row (dy = 0): x = centerX − f·dx / eyeN.
          const dx = (frame.centerX - x) * frame.eyeN / frame.f
          const crossing = Math.abs(heightNear(dx, 0) ?? Infinity) < 15
          // Or the land's edge crosses the line within a px and a half of it.
          const landEdge = (landTop(x - 1.5) - line.y) * (landTop(x + 1.5) - line.y) <= 0
            || Math.min(...[-1.5, 0, 1.5].map((d) => Math.abs(landTop(x + d) - line.y))) < 2
          expect(crossing || landEdge, `${id} end ${x}`).toBe(true)
        }
      }
    }
  })

  it('keeps the line where land lies under it: Tiberias, Ein Gedi and most places below sea level', () => {
    const lined = BELOW.filter((id) => worldOf(id).labels.datum)
    expect(lined).toEqual(expect.arrayContaining(['tiberias', 'ein-gedi']))
    expect(lined.length).toBeGreaterThanOrEqual(5)
  })

  it('draws no line and no note where no land lies under sea level’s height', () => {
    const row = datumOfRow(50, 187.5, { left: null, right: 230 })
    expect(datumOnLand(row, () => 60, 187.5)).toBeNull()
    // Land under a part of it: that part only, its open end keeping its fade, the cut end none.
    const cut = datumOnLand(row, (x) => (x < 200 ? 40 : 60), 187.5)!
    expect(cut.segments).toHaveLength(1)
    expect(cut.segments[0].x1).toBeCloseTo(121.5)
    expect(cut.segments[0].fadeLeft).toBeGreaterThan(0)
    expect(cut.segments[0].x2).toBeLessThan(200)
    expect(cut.segments[0].fadeRight).toBe(0)
  })
})
