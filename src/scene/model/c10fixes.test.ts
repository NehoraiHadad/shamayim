import { beforeAll, describe, expect, it } from 'vitest'
import { galacticToEquatorial } from '../../astro/galaxy'
import { horizontalPosition } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { AirInput } from '../../atmo/airTypes'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { BOW, HALO_DEG, onCircle, separation } from '../../world/optics'
import { buildWorld } from '../../world/world'
import { rainbowStops, RED, SHADE, VIOLET, type Stop } from '../paint/optics'
import { sceneModel } from './index'
import { crestOf } from './life'
import { haloFrame, rainbowFrame } from './optics'
import { skyGeom } from './sky'
import { gnomonic } from './tangent'
import type { LayerDesc, LayerOf, Pt, SceneBox } from './types'

/*
 * The C10 fixes (halo, contrails, Milky Way, rainbow): their geometry, as general rules over the baseline places.
 */

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const CLEAR: Partial<AirInput> = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 }
const CIRRUS: Partial<AirInput> = { cloudCover: 75, thickCloud: 0, precipitation: 0, weatherCode: 2, windSpeed: 8, windGusts: 14 }
const SHOWERS: Partial<AirInput> = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45,
  windDirection: 250, humidity: 80 }

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces()
}, 120_000)

function at(id: string, when: LocalTime, forced: Partial<AirInput> | null = null, veil = false) {
  const world = buildWorld({ ...worldInput(places.get(id)!, when), forced, ...(veil ? { forcedLayers: { low: 0, mid: 0, high: 0.75 } } : {}) })
  return { world, model: sceneModel(world, BOX) }
}
const ofKind = <K extends LayerDesc['kind']>(layers: readonly LayerDesc[], kind: K) => layers.filter((l): l is LayerOf<K> => l.kind === kind)
const radii = (pts: Pt[]) => {
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y)
  return { rx: (Math.max(...xs) - Math.min(...xs)) / 2, ry: (Math.max(...ys) - Math.min(...ys)) / 2 }
}

describe('C10 fix: the 22° halo is a circle round the sun', () => {
  const moments: LocalTime[] = ['2026-11-17T07:15', '2026-11-17T08:30', '2026-11-17T11:00', '2026-11-17T14:30']

  it('projects the true 22° circle round in its frame (x and y radii equal), centred on the drawn sun', () => {
    let seen = 0
    for (const id of ['jerusalem', 'haifa', 'tiberias']) {
      for (const when of moments) {
        const { world, model } = at(id, when, CIRRUS, true)
        const halo = ofKind(model.layers, 'bow').find((b) => b.look === 'halo')
        if (!halo) continue
        seen++
        const geom = skyGeom(world, BOX)
        const frame = haloFrame(world, BOX, geom)!
        const ring = Array.from({ length: 180 }, (_, i) => gnomonic(frame, onCircle(world.optics.halo!.sun, HALO_DEG, (i / 180) * 2 * Math.PI))!)
        const { rx, ry } = radii(ring)
        expect(rx / ry, `${id} ${when}`).toBeCloseTo(1, 2)
        // Its centre: the sun as drawn; its radius 22° at the frame's px a degree (gnomonic: tan 22° in radians).
        expect((Math.max(...ring.map(([x]) => x)) + Math.min(...ring.map(([x]) => x))) / 2).toBeCloseTo(halo.cx, 1)
        expect(rx).toBeCloseTo((Math.tan((HALO_DEG * Math.PI) / 180) * 180) / Math.PI * halo.k, 1)
        expect(halo.cx).toBeCloseTo(geom.left + world.bodies.sun.x * geom.s, 6)
        expect(halo.cy).toBeCloseTo(BOX.landTop + world.bodies.sun.y, 6)
        // The sky's own projection would have bent it (the defect: a loop, a teardrop): it is not round there.
        const bent = radii(ring.map((_, i) => {
          const d = onCircle(world.optics.halo!.sun, HALO_DEG, (i / 180) * 2 * Math.PI)
          return [geom.x(d.azimuth), geom.y(d.altitude)] as Pt
        }))
        expect(Math.abs(bent.rx / bent.ry - 1)).toBeGreaterThan(0.05)
      }
    }
    expect(seen).toBeGreaterThan(6)
  })

  it('hides the ring under the land and the horizon (its clip never dips below either)', () => {
    const { world, model } = at('jerusalem', '2026-11-17T07:15', CIRRUS, true)
    const halo = ofKind(model.layers, 'bow').find((b) => b.look === 'halo')!
    const geom = skyGeom(world, BOX)
    const crest = crestOf(world, BOX, geom)
    for (const [x, y] of halo.clip) expect(y).toBeLessThanOrEqual(Math.min(crest(x), geom.horizon) + 1e-6)
  })

  it('sets the sun dogs level with the sun, just outside the ring, moving out as the sun climbs', () => {
    const offsets: number[] = []
    for (const when of ['2026-11-17T07:15', '2026-11-17T09:30'] as LocalTime[]) {
      const { model } = at('jerusalem', when, CIRRUS, true)
      const halo = ofKind(model.layers, 'bow').find((b) => b.look === 'halo')!
      expect(halo.dogs.length).toBeGreaterThan(0)
      for (const d of halo.dogs) {
        expect(d.y).toBeCloseTo(halo.cy, 6)
        expect(Math.sign(d.x - halo.cx)).toBe(d.side)
        expect(Math.abs(d.x - halo.cx) / halo.k).toBeGreaterThanOrEqual(HALO_DEG - 0.3)
      }
      offsets.push(Math.abs(halo.dogs[0].x - halo.cx) / halo.k)
    }
    expect(offsets[1]).toBeGreaterThan(offsets[0])
  })
})

describe('C10 fix: contrails are straight', () => {
  it('lays every trail as a straight or gently curved line: never turning back, its bend bounded', { timeout: 60_000 }, () => {
    let seen = 0
    for (const place of SCENE_PLACES) {
      for (const hour of ['08:00', '11:00', '14:00']) {
        for (const [forced, veil] of [[null, false], [CIRRUS, true]] as const) {
          const { model } = at(place.id, `2026-11-17T${hour}`, forced, veil)
          const trails = ofKind(model.layers, 'contrail')
          expect(trails.length, `${place.id} ${hour}`).toBeLessThanOrEqual(4)
          for (const t of trails) {
            const p = t.points
            if (p.length < 3) continue
            seen++
            const dirs = p.slice(1).map(([x, y], i) => Math.atan2(y - p[i][1], x - p[i][0]))
            let turn = 0
            for (let i = 1; i < dirs.length; i++) {
              const d = Math.abs(((dirs[i] - dirs[i - 1] + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)
              // No step turns back on itself.
              expect(d, `${t.id} at ${place.id} ${hour}`).toBeLessThan(Math.PI / 2)
              turn += d
            }
            // In all it bends a little at most (the earth's curve over its length), and never strays far from its chord.
            expect(turn, `${t.id} at ${place.id} ${hour}`).toBeLessThan((15 * Math.PI) / 180)
            const [a, b] = [p[0], p.at(-1)!]
            const chord = Math.hypot(b[0] - a[0], b[1] - a[1])
            const off = Math.max(...p.map(([x, y]) => Math.abs((b[0] - a[0]) * (a[1] - y) - (a[0] - x) * (b[1] - a[1])) / chord))
            expect(off / chord).toBeLessThan(0.03)
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(5)
  })

  it('keeps a live trail behind its plane, thin at the plane and spreading toward its old end', () => {
    let seen = 0
    for (const hour of ['09:00', '11:00', '13:00']) {
      const { model } = at('jerusalem', `2026-11-17T${hour}`, CIRRUS, true)
      for (const t of ofKind(model.layers, 'contrail').filter((c) => /^contrail\.\d/.test(c.id))) {
        const plane = ofKind(model.layers, 'aircraft').find((a) => a.id === `aircraft.high.${t.id.split('.')[1]}`)!
        seen++
        expect(t.animated?.wake?.head).toBeCloseTo(plane.x, 6)
        // Its old end (the run's start) is wider than near the plane.
        const near = t.points.reduce((best, [x, y], i) => (Math.hypot(x - plane.x, y - plane.y) < Math.hypot(t.points[best][0] - plane.x, t.points[best][1] - plane.y) ? i : best), 0)
        expect(t.widths[0]).toBeGreaterThanOrEqual(t.widths[near])
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})

describe('C10 fix: the Milky Way at its true orientation', () => {
  it('lies along the galactic plane: every spine point 90° from the galactic pole, drawn at its true place', () => {
    const when: LocalTime = '2026-08-12T23:30'
    const { world, model } = at('ramon-crater', when, CLEAR)
    const mw = ofKind(model.layers, 'milkyWay')[0]
    expect(mw).toBeDefined()
    const place = world.place
    const pole = horizontalPosition(galacticToEquatorial(0, 90), utcOf(when, place.timezone), place.lat, place.lon)
    const geom = skyGeom(world, BOX)
    world.nightSky.milkyWay.band.forEach((p, i) => {
      expect(separation(p.spine, pole)).toBeCloseTo(90, 1)
      expect(mw.spine[i][0]).toBeCloseTo(geom.x(p.spine.azimuth), 6)
      expect(mw.spine[i][1]).toBeCloseTo(geom.dome(Math.max(-3, p.spine.altitude)), 6)
    })
    // Brightest toward Sagittarius (l ≈ 0), low in the south-west on an August night.
    const best = mw.bright.indexOf(Math.max(...mw.bright))
    const l = world.nightSky.milkyWay.band[best % world.nightSky.milkyWay.band.length]
    expect(Math.min(l.l, 360 - l.l)).toBeLessThan(30)
    expect(l.spine.altitude).toBeLessThan(40)
    expect(l.spine.azimuth).toBeGreaterThan(180)
    expect(l.spine.azimuth).toBeLessThan(260)
    expect(mw.clouds[best % mw.clouds.length] + Math.max(...mw.clouds)).toBeGreaterThan(0.5)
  })

  it('is an irregular band, not a column: its width varies along it, and it fades toward the zenith', () => {
    const { world, model } = at('ramon-crater', '2026-08-12T23:30', CLEAR)
    const mw = ofKind(model.layers, 'milkyWay')[0]
    const halves = mw.spine.map(([x, y], i) => Math.hypot(mw.upper[i][0] - x, mw.upper[i][1] - y)).filter((_, i) => mw.bright[i] > 0.1)
    expect(Math.max(...halves) / Math.min(...halves)).toBeGreaterThan(1.3)
    const band = world.nightSky.milkyWay.band
    mw.bright.forEach((b, i) => { if (band[i % band.length].spine.altitude > 82) expect(b).toBe(0) })
  })

  it('stays gated to a truly dark sky', () => {
    expect(ofKind(at('ramon-crater', '2026-08-12T20:00', CLEAR).model.layers, 'milkyWay')).toEqual([])
    expect(ofKind(at('tel-aviv', '2026-08-12T23:30', CLEAR).model.layers, 'milkyWay')).toEqual([])
  })
})

describe('C10 fix: the rainbow', () => {
  const radiusOf = (stops: Stop[], rgb: readonly number[]) => stops.find(([, c, a]) => c === rgb && a > 0)![0]

  it('is a circle round the antisolar point: its frame on the eye\'s horizon there, its top over the horizon', () => {
    let seen = 0
    for (const [id, when] of [['haifa', '2026-11-17T15:30'], ['shadmot-mehola', '2026-11-17T15:30'], ['tel-aviv', '2026-11-17T08:00']] as const) {
      const { world, model } = at(id, when, SHOWERS)
      const bow = ofKind(model.layers, 'bow').find((b) => b.look === 'rainbow')
      if (!bow) continue
      seen++
      const geom = skyGeom(world, BOX)
      const frame = rainbowFrame(world, geom)!
      const anti = world.optics.rainbow!.antisolar
      expect(anti.azimuth).toBeCloseTo((world.bodies.sun.azimuth + 180) % 360, 6)
      expect(bow.cx).toBeCloseTo(geom.x(anti.azimuth), 6)
      expect(bow.cy - bow.k * -anti.altitude).toBeCloseTo(geom.horizon, 6)
      expect(bow.k).toBe(frame.k)
      // The true bow, projected in the frame, is round.
      const ring = Array.from({ length: 180 }, (_, i) => gnomonic(frame, onCircle(anti, BOW.primary[1], (i / 180) * 2 * Math.PI))!)
      const { rx, ry } = radii(ring)
      expect(rx / ry).toBeCloseTo(1, 2)
      expect(bow.cy - BOW.primary[1] * bow.k).toBeLessThan(geom.horizon)
      // Hidden under the land.
      const crest = crestOf(world, BOX, geom)
      for (const [x, y] of bow.clip) expect(y).toBeLessThanOrEqual(Math.min(crest(x), geom.horizon) + 1e-6)
    }
    expect(seen).toBeGreaterThan(1)
  })

  it('has red outside on the primary, reversed on the secondary, and a darker band between them', () => {
    const s = rainbowStops(1, 0.5)
    expect(radiusOf(s.primary, RED)).toBeGreaterThan(radiusOf(s.primary, VIOLET))
    expect(radiusOf(s.secondary, RED)).toBeLessThan(radiusOf(s.secondary, VIOLET))
    expect(radiusOf(s.primary, RED)).toBeCloseTo(BOW.primary[1], 6)
    expect(radiusOf(s.secondary, RED)).toBeCloseTo(BOW.secondary[0], 6)
    // Alexander's band: the shade laid only between the primary's red and the secondary's red.
    for (const [r, c, a] of s.band) {
      expect(c).toBe(SHADE)
      if (a > 0) { expect(r).toBeGreaterThan(BOW.primary[1]); expect(r).toBeLessThan(BOW.secondary[0]) }
    }
    // Brighter inside the primary only.
    for (const [r, , a] of s.inside) if (a > 0) expect(r).toBeLessThan(BOW.primary[0])
  })
})
