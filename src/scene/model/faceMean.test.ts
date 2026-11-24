import { describe, expect, it } from 'vitest'
import { fullLandData, makeWorldInput, SHADMOT } from '../../test/livingLandFixtures'
import type { LandRayColumn, LivingLand } from '../../world/landLiving'
import { livingLandKey } from '../../world/landRays'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { planeSurfaceOf, quantiseTones } from './landColour'
import { COVER_WATER } from './landPalette'
import { linearRgbToSrgb, srgbRgbToLinear } from './landRadiance'
import { planeLayer } from './planes'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const BLACK: RGB = [0, 0, 0], WHITE: RGB = [1, 1, 1]
const base = buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', fullLandData()))
const near = (albedo: RGB) => ({ near: { albedo, source: 'near' } })
/** A ray whose bands are all of one colour, on land (class 4) or on open water. */
const bandsOf = (ray: LandRayColumn, albedo: RGB, cover = 4) =>
  ({ bands: ray.bands.map((b) => ({ ...b, sample: { ...b.sample, cover, albedo } })) })
const landOf = (ray: (i: number, ray: LandRayColumn) => Partial<LandRayColumn>, over: Partial<LivingLand> = {}): LivingLand =>
  ({ ...base.land, ...over, rays: base.land.rays.map((r, i) => ({ ...r, ...ray(i, r) })) })
const line = (y: number): [number, number][] => [[0, y], [375, y]]
const plane = (points: [number, number][], km: number) => ({ points, distanceKm: points.map(() => km) })
const SEA = (albedo: RGB): LivingLand['own'] => ({ ...base.land.own, cover: COVER_WATER, albedo })

/** A near face 300 m away from its crest to its foot, all of it inside the first ring. */
function nearFace(land: LivingLand, crest = line(64)): WorldState {
  const column = (x: number) => ({ x, crest: 64, points: [{ y: BOX.landHeight, km: 0.3, h: 0, slope: 0 }] })
  return { ...base, land, keys: { ...base.keys, land: livingLandKey(land) },
    terrain: { ...base.terrain, near: plane(crest, 0.3), faces: { ...base.terrain.faces, near: { columns: [column(0), column(375)], contours: [] } } } }
}
const meanOf = (land: LivingLand, crest?: [number, number][]) => {
  const world = nearFace(land, crest)
  return planeSurfaceOf(world, 'near', world.terrain.near, BOX.landHeight).mean.map((v) => srgbRgbToLinear([v, v, v])[0])
}
/** The share of the face either side of its middle: one column in twenty is the grid's own error, a half of it here. */
const GRID = 1 / 40
/** A byte of the mean, at its steepest in linear light. */
const BYTE = 2.4 / 255

describe('the one tone of a land plane', () => {
  it('is the area mean: a column counts by the depth it shows', () => {
    // 10 px of dark on the left half, 90 px of bright on the right half.
    const crest: [number, number][] = [[0, 118], [187, 118], [187.2, 38], [375, 38]]
    expect(meanOf(landOf((i) => near(i < 20 ? BLACK : WHITE)), crest)[1]).toBeGreaterThan(0.9 - GRID)
    expect(meanOf(landOf((i) => near(i < 20 ? BLACK : WHITE)), crest)[1]).toBeLessThan(0.9 + GRID)
    expect(meanOf(landOf((i) => near(i < 20 ? WHITE : BLACK)), crest)[1]).toBeLessThan(0.1 + GRID)
  })

  it('moves by one column of the face as one ray turns, from the one colour to the other', () => {
    const [dark, bright]: RGB[] = [[0.2, 0.2, 0.2], [0.6, 0.6, 0.6]], [from, to] = [dark, bright].map((rgb) => srgbRgbToLinear(rgb)[0])
    const tones = Array.from({ length: base.land.rays.length + 1 }, (_, n) => meanOf(landOf((i) => near(i < n ? bright : dark)))[0])
    expect(Math.abs(tones[0] - from)).toBeLessThan(BYTE)
    expect(Math.abs(tones.at(-1)! - to)).toBeLessThan(BYTE)
    for (let n = 1; n < tones.length; n++) {
      expect(tones[n]).toBeGreaterThanOrEqual(tones[n - 1])
      expect(tones[n] - tones[n - 1]).toBeLessThan((to - from) / 20 + BYTE)
    }
  })

  it('has no part of the colour that stands in for open water', () => {
    const water = (ray: LandRayColumn) => ({ ...bandsOf(ray, BLACK, COVER_WATER), near: 'water' as const })
    const local = base.land.local.map((p, i) => ({ ...p, sample: i ? SEA(BLACK) : { ...p.sample, cover: 4, albedo: BLACK } }))
    const headland = { own: SEA(BLACK), local }
    // White dry bands beside open water; then the white ground in the footprints alone, every band being water.
    expect(meanOf(landOf((i, ray) => i < 20 ? { ...bandsOf(ray, WHITE), near: undefined } : water(ray), headland))).toEqual([1, 1, 1])
    expect(meanOf(landOf((i, ray) => i < 20 ? { ...water(ray), ...near(WHITE) } : water(ray), headland))).toEqual([1, 1, 1])
    // The land nearest to the water counts once, however wide the water is.
    const shore = meanOf(landOf((i, ray) => i < 20 ? { ...bandsOf(ray, i < 10 ? BLACK : WHITE), ...near(i < 10 ? BLACK : WHITE) } : water(ray)))
    expect(Math.abs(shore[1] - 0.5)).toBeLessThan(2 * GRID)
  })

  it('leaves out a colour that is no number', () => {
    const grey: RGB = [0.5, 0.5, 0.5], [g] = srgbRgbToLinear(grey)
    for (const v of meanOf(landOf((i) => near(i === 10 ? [NaN, 0.5, 0.5] : grey)))) expect(Math.abs(v - g)).toBeLessThan(BYTE)
  })

  it('is of the ground seen over a nearer crest, not of what that hides', () => {
    const land = landOf((_, ray) => ({ near: undefined, bands: ray.bands.map((b) =>
      ({ ...b, sample: { ...b.sample, cover: 4, albedo: b.distanceM > 5000 ? BLACK : WHITE } })) }))
    // The far face from its crest at 20 px, black to 30 px (10 km) and white at 33 px (1 km).
    const column = (x: number) => ({ x, crest: 20, points: [{ y: 30, km: 10, h: 0, slope: 0 }, { y: 33, km: 1, h: 0, slope: 0 }] })
    const toneBehind = (nearY: number) => {
      const { terrain, ...world } = nearFace(land)
      const far = plane(line(20), 20)
      return planeSurfaceOf({ ...world, terrain: { ...terrain, near: plane(line(nearY), 0.3), far, sightAt: () => ({ nearKm: 0.3, farKm: 20, farShows: true }),
        faces: { ...terrain.faces, far: { columns: [column(0), column(375)], contours: [] } } } }, 'far', far, BOX.landHeight).mean
    }
    expect(toneBehind(30)).toEqual(BLACK)
    expect(srgbRgbToLinear(toneBehind(33))[0]).toBeCloseTo(0.5, 2)
  })

  it('is the palette\'s own unknown tone where no colour at all is a number', () => {
    const none: RGB = [NaN, NaN, NaN], own = { ...base.land.own, cover: 4, albedo: none }
    const land = landOf((_, ray) => ({ ...bandsOf(ray, none), ...near(none) }), { own, local: base.land.local.map((p) => ({ ...p, sample: own })) })
    const world = nearFace(land)
    expect(planeSurfaceOf(world, 'near', world.terrain.near, BOX.landHeight).mean).toEqual(quantiseTones([], 1).palette[0].map((v) => Math.round(v * 255) / 255))
  })

  it('is main\'s median of the cells where the face shows no land at all', () => {
    const dark = linearRgbToSrgb([0.04, 0.04, 0.04]), land = landOf((i, ray) => bandsOf(ray, i < 25 ? dark : WHITE))
    const hidden = (farShows: boolean): WorldState => ({ ...nearFace(land), terrain: { ...nearFace(land).terrain, far: plane(line(40), 20),
      sightAt: () => ({ nearKm: 0.3, farKm: 20, farShows }) } })
    const tone = (world: WorldState) => planeSurfaceOf(world, 'far', world.terrain.far!, BOX.landHeight).mean
    expect(tone(hidden(false))[0]).toBeCloseTo(dark[0], 2)
    expect(tone(hidden(true))[0]).toBeGreaterThan(dark[0] + 0.1)
    // So is a face that is open water throughout: its stand-in is then all it has.
    const sea = landOf((_, ray) => ({ ...bandsOf(ray, BLACK, COVER_WATER), near: 'water' }), { own: { ...base.land.own, cover: 4, albedo: WHITE } })
    expect(meanOf(sea)).toEqual([1, 1, 1])
  })
})

it('two near grounds that are drawn in different bytes are two keys', () => {
  const layer = (v: number) => {
    const world = nearFace(landOf(() => near([v, v, v])))
    return planeLayer(world, BOX, 'near', world.terrain.near, [])!
  }
  const under = layer(0.4999), over = layer(0.5001)
  expect([under, over].map(({ fill }) => Math.round(fill[0] * 255))).toEqual([127, 128])
  expect(under.key).not.toBe(over.key)
})
