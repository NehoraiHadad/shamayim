import { describe, expect, it } from 'vitest'
import { anglePx } from '../terrain/angleScale'
import { computePanorama, FAR_KM, type HeightAt } from '../terrain/panorama'
import { inViewOrder } from '../terrain/panoramaTerrain'
import { facetShare, glintsOf } from '../../world/water'
import { SCENE_CAMERA } from '../../domain/camera'
import { seaSideOf, waterInView, type WaterLookup } from './waterInView'

const xOf = (n: number) => (i: number) => (375 * i) / (n - 1)
const yOf = (angle: number) => 96 - anglePx(angle)
const between = (az: number, from: number, to: number) => az >= from && az <= to

/** A lake (0 m) 10–20 km out between azimuths 70° and 110° (east) in a plain at its level, the eye at 100 m. */
const lake: WaterLookup = { bodies: [{ name: 'כנרת', kind: 'lake' }],
  bodyAlong: (d, az) => between(az, 70, 110) && d >= 10 && d <= 20 ? 0 : null }
const lakeLand = (ridgeM = 0): HeightAt => (d, az) => (between(az, 60, 120) && d >= 2.9 && d <= 3.1 ? ridgeM : 0)
const spansOf = (heightAt: HeightAt, water: WaterLookup, groundM = 98) => {
  const p = inViewOrder(computePanorama(heightAt, groundM))
  return waterInView(p, water, xOf(p.rays.length), yOf)
}

describe('water in view', () => {
  it('finds a lake beyond low land at its bearing and distance, on the east (left) side', () => {
    const [span, ...rest] = spansOf(lakeLand(), lake)
    expect(rest).toEqual([])
    expect({ name: span.name, kind: span.kind }).toEqual({ name: 'כנרת', kind: 'lake' })
    expect(span.distanceKm).toBeCloseTo(10, 0)
    expect(Math.max(...span.edges.map((edge) => edge.farKm))).toBeCloseTo(20, 0)
    // Facing south the azimuth grows to the right: its left end is its northern shore's bearing.
    expect(span.fromAzimuth).toBeCloseTo(70, -1)
    expect(span.toAzimuth).toBeCloseTo(110, -1)
    expect(span.to).toBeLessThan(375 / 2)
    // The far shore stands higher in the view than the near one.
    for (const edge of span.edges) expect(edge.farY).toBeLessThan(edge.nearY)
  })

  it('finds nothing when a ridge in front hides the water', () => {
    expect(spansOf(lakeLand(400), lake)).toEqual([])
  })

  it('ends the sea at its own horizon, not at the end of the ray', () => {
    // Open sea all round the west from 1 km out, the eye 12 m up: the horizon lies ~13 km off.
    const sea: WaterLookup = { bodies: [{ name: 'ים', kind: 'sea' }],
      bodyAlong: (d, az) => between(az, 200, 340) && d >= 1 ? 0 : null }
    const spans = spansOf((_, az) => (between(az, 200, 340) ? 0 : 10), sea, 10)
    expect(spans).toHaveLength(1)
    const far = Math.max(...spans[0].edges.map((edge) => edge.farKm))
    expect(far).toBeGreaterThan(9)
    expect(far).toBeLessThan(FAR_KM / 2)
    expect(spans[0].from).toBeGreaterThan(375 / 2)
    expect(seaSideOf(spans)).toBe('west')
  })

  it('leaves out a glimpse on a single ray', () => {
    const pond: WaterLookup = { bodies: [{ kind: 'lake' }], bodyAlong: (d, az) => Math.abs(az - 90) < 0.5 && d >= 10 && d <= 12 ? 0 : null }
    expect(spansOf((d, az) => (pond.bodyAlong(d, az) === 0 ? 0 : 20), pond)).toEqual([])
  })
})

describe('the light on the water', () => {
  it('glitters under a low sun and hardly at all under a high one', () => {
    expect(facetShare(2, 1, 5)).toBeGreaterThan(0.9)
    expect(facetShare(35, 1, 5)).toBeLessThan(0.05)
  })

  it('lies only on water under the light, when the light reaches it', () => {
    const spans = spansOf(lakeLand(), lake)
    const low = { azimuth: 95, altitude: 3, strength: 1 }
    const [glint] = glintsOf(spans, low, true, SCENE_CAMERA, 5)
    expect(glint.x).toBeGreaterThan(spans[0].from)
    expect(glint.x).toBeLessThan(spans[0].to)
    expect(glintsOf(spans, low, false, SCENE_CAMERA, 5)).toEqual([])
    expect(glintsOf(spans, { ...low, azimuth: 250 }, true, SCENE_CAMERA, 5)).toEqual([])
  })
})
