import { describe, expect, it } from 'vitest'
import type { Airport } from './airports'
import { approachPath, CLEARANCE_M, departurePath, FINAL_KM, FLIGHT, flockTrack, PATH_STEP_KM, trackPoint } from './flightPaths'
import { curveDrop, type FlightTerrain } from './flightTerrain'

/*
 * The paths over the land (`flightPaths.ts`) on made-up ground: a flock climbs ahead of a rise it can clear, turns along a
 * wall it cannot, leans through a pass; an approach meets a hill on its centreline with a base or downwind leg; a
 * departure climbs out along the runway before it turns.
 */

/** A height field (m above sea level, at km east and north) as a FlightTerrain, the eye 2 m over the ground at 0, 0. */
function ground(height: (e: number, n: number) => number): FlightTerrain {
  const eyeM = height(0, 0) + 2
  return {
    eyeM, known: true, heightAt: height, groundAt: height,
    blockedKm(e, n, upM) {
      const km = Math.hypot(e, n), slope = (upM - curveDrop(km)) / km
      for (let d = 0.1; d < km - 0.03; d += 0.05) {
        if (height((e / km) * d, (n / km) * d) - eyeM - curveDrop(d) > slope * d) return d
      }
      return null
    },
  }
}

const RAD = Math.PI / 180

/** Every point of a track over the ground: its clearance (m) and its climb (m per m) from the one before. */
function profile(t: ReturnType<typeof flockTrack>, terrain: FlightTerrain) {
  const n = t.pts.length / 3
  return Array.from({ length: n }, (_, i) => ({
    e: t.pts[3 * i], n: t.pts[3 * i + 1], z: t.pts[3 * i + 2],
    clear: t.pts[3 * i + 2] - terrain.groundAt(t.pts[3 * i] / 1000, t.pts[3 * i + 1] / 1000),
    climb: i ? (t.pts[3 * i + 2] - t.pts[3 * i - 1]) / t.ds : 0,
  }))
}

describe('a flock over the land', () => {
  it('climbs ahead of a rise it can clear, at its kind\'s rate, never under its least clearance', () => {
    // A ridge 600 m high across its way, 8 km north of its closest point.
    const terrain = ground((_, n) => 600 * Math.exp(-(((n - 9) / 0.8) ** 2)))
    const t = flockTrack({ cE: 0, cN: 1000, headingDeg: 0, endM: 16_000, aglM: 350, flight: FLIGHT.crane }, terrain)
    const p = profile(t, terrain)
    for (const q of p) expect(q.clear).toBeGreaterThanOrEqual(FLIGHT.crane.agl[0])
    for (const q of p) expect(q.climb).toBeLessThanOrEqual(FLIGHT.crane.climb + 1e-6)
    // It is already climbing kilometres before the foot of the rise (where the ground is still flat), and crosses it.
    const before = p.filter((q) => q.n > 3500 && q.n < 6000)
    expect(before.some((q) => q.climb > 0.05)).toBe(true)
    expect(p.at(-1)!.n).toBeGreaterThan(12_000)
  })

  it('turns along a wall it cannot climb in time, instead of flying into it', () => {
    // A 450 m cliff across its way, 600 m ahead: a gull keeps 10–150 m over the ground and climbs at most 0.2.
    const terrain = ground((_, n) => (n > 0.9 ? 450 : 0))
    const t = flockTrack({ cE: 0, cN: 300, headingDeg: 0, endM: 1800, aglM: 60, flight: FLIGHT.gull }, terrain)
    const p = profile(t, terrain)
    for (const q of p) expect(q.clear).toBeGreaterThanOrEqual(FLIGHT.gull.agl[0])
    // Along the foot of the cliff, not over its top: it never climbs the 450 m.
    expect(Math.max(...p.map((q) => q.z))).toBeLessThan(300)
    const end = trackPoint(t, (p.length - 1) * t.ds)
    expect(Math.abs(Math.sin(end.headingDeg * RAD))).toBeGreaterThan(0.5)
  })

  it('leans a migrant through the pass in a ridge, holding its flyway\'s way', () => {
    // A ridge 900 m high across its way with a pass 300 m high 1.5 km east of its line.
    const terrain = ground((e, n) => {
      const ridge = Math.exp(-(((n - 6) / 1.2) ** 2))
      return ridge * (900 - 600 * Math.exp(-(((e - 1.5) / 0.8) ** 2)))
    })
    const t = flockTrack({ cE: 0, cN: 1000, headingDeg: 0, endM: 14_000, aglM: 350, flight: FLIGHT.stork }, terrain)
    const crest = profile(t, terrain).filter((q) => Math.abs(q.n / 1000 - 6) < 0.3)
    expect(crest.length).toBeGreaterThan(0)
    // Over the ridge's line, the ground under it is the pass's, not the ridge's.
    for (const q of crest) expect(q.z - q.clear).toBeLessThan(600)
    expect(trackPoint(t, (t.pts.length / 3 - 1) * t.ds).n).toBeGreaterThan(9000)
  })
})

const FIELD: Airport = { icao: 'TEST', lat: 0, lon: 0, elevationM: 40, runways: [90], perHour: { day: 10, night: 0 }, light: false, reachKm: 40 }

describe('airport traffic over the land', () => {
  it('lands down a 3° glide on the centreline, and takes a base or downwind leg round a hill on the straight-in', () => {
    // A 1300 m hill on the extended centreline 25 km out (landing east: the approach comes from the west).
    const hill = ground((e, n) => 40 + 1300 * Math.exp(-(((e + 25) / 4) ** 2 + (n / 4) ** 2)))
    const path = approachPath({ airport: FIELD, ae: 0, an: 0, heading: 90 }, hill, 50)
    const final = Math.round(FINAL_KM.jet / PATH_STEP_KM)
    // The final: on the centreline, 3° down to the threshold.
    for (let i = 1; i <= final; i++) {
      expect(Math.abs(path[i].n)).toBeLessThan(1e-6)
      expect(path[i].up + hill.eyeM - 40 - 15).toBeCloseTo(i * 500 * Math.tan(3 * RAD), 3)
    }
    // Before it, clear of the hill by the clearance; not straight over it.
    for (let i = final + 1; i < path.length; i++) {
      expect(path[i].up + hill.eyeM - hill.groundAt(path[i].e, path[i].n)).toBeGreaterThanOrEqual(CLEARANCE_M)
    }
    expect(path.some((p) => Math.abs(p.n) > 3)).toBe(true)
    // On flat ground the straight-in.
    const flat = approachPath({ airport: FIELD, ae: 0, an: 0, heading: 90 }, ground(() => 40), 50)
    expect(flat.every((p) => Math.abs(p.n) < 1e-6)).toBe(true)
  })

  it('climbs a departure out along the runway, then turns toward its route, round high ground', () => {
    const flat = departurePath({ airport: FIELD, ae: 0, an: 0, heading: 90 }, ground(() => 40), 50, 0)
    for (let i = 1; i <= 12; i++) expect(Math.abs(flat[i].n)).toBeLessThan(1e-6)
    const end = flat.at(-1)!
    expect(end.n).toBeGreaterThan(20)
    for (let i = 1; i < flat.length; i++) expect(flat[i].up).toBeGreaterThan(flat[i - 1].up)
    // A 2 km high massif to the north: it turns toward a way that clears it.
    const massif = ground((_, n) => 40 + (n > 10 ? 2000 : 0))
    const round = departurePath({ airport: FIELD, ae: 0, an: 0, heading: 90 }, massif, 50, 0)
    for (let i = 13; i < round.length; i++) expect(round[i].up + massif.eyeM - massif.groundAt(round[i].e, round[i].n)).toBeGreaterThanOrEqual(CLEARANCE_M)
  })
})
