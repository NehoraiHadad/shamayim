import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../test/sceneWorld'
import { flightTerrain } from './flightTerrain'
import type { LifeInput } from './life'
import { AHEAD_S, AHEAD_STEP_S } from './lifeAhead'
import { lifeInputAt } from './lifeDay'
import { dayBefore, flockAt, highAt, lifeAt, lifeSchedule, lowAt, secondsOf, type ScheduleContext } from './lifeSchedule'
import { placeEnvOf, type PlaceEnv } from './placeEnv'

/*
 * The sky's life as a process in time (`lifeSchedule.ts`): a seeded schedule per place and day, its rates following the
 * kinds' likelihoods (ramped through the gates), each event on a path that begins and ends far off or beyond the
 * frame, evaluated at any moment.
 */

const ENV: PlaceEnv = { seaKm: 1.5, lakeKm: null, built: 0.6, open: 0.3, glow: 1, sources: { land: 'cover', glow: 'far' } }

/** A fine spring day by the sea near Ben Gurion, the sun by the hour; rain from `rainFrom` on (heavy). */
function day(over: Partial<LifeInput> = {}, rainFrom = 99): (at: LocalTime) => LifeInput {
  return (at) => {
    const h = Number(at.slice(11, 13)) + Number(at.slice(14, 16)) / 60
    const altitude = 60 * Math.sin(((h - 6) / 12) * Math.PI)
    const wet = h >= rainFrom
    return {
      placeId: 'test', lat: 32.08, lon: 34.78, at, timezone: 'Asia/Jerusalem', camera: SCENE_CAMERA, groundM: 20, env: ENV,
      sun: { altitude, azimuth: 90 + 15 * (h - 6) }, direct: altitude > 0 ? 0.9 : 0, dark: altitude < -8 ? 1 : altitude < 0 ? 0.5 : 0,
      temperature: 22, covers: { low: 0, mid: 0, high: 0.2 }, rainMmH: wet ? 5 : 0, thunder: false,
      wind: { fromDeg: 290, towardDeg: 110, ms: 4, gustMs: 6 }, highWind: { towardDeg: 90, ms: 30 }, starsThrough: 1,
      moon: { altitude: -20, illumination: 0 }, visibilityKm: 25,
      hour: { cruise: { temperature: -55, humidity: 75 } }, ...over,
    }
  }
}

const ctx = (date = '2026-04-10', placeId = 'test'): ScheduleContext => ({ placeId, date, camera: SCENE_CAMERA, lat: 32.08, lon: 34.78 })

describe('the life schedule', () => {
  it('is deterministic: the same place and day give the same events; another day or place others', () => {
    const a = lifeSchedule(ctx(), day()), b = lifeSchedule(ctx(), day())
    const plain = (s: typeof a) => ({ ...s, flocks: s.flocks.map(({ lay, laid: _laid, ...rest }) => ({ ...rest, ...lay() })) })
    expect(plain(a)).toEqual(plain(b))
    expect(a.flocks[0].lay()).toBe(a.flocks[0].lay())
    expect(a.flocks.length + a.high.length + a.low.length).toBeGreaterThan(10)
    expect(lifeSchedule(ctx('2026-04-11'), day()).flocks.map((f) => f.t0)).not.toEqual(a.flocks.map((f) => f.t0))
    expect(lifeSchedule(ctx('2026-04-10', 'other'), day()).flocks.map((f) => f.t0)).not.toEqual(a.flocks.map((f) => f.t0))
  })

  it('begins and ends every flock far off (faded into the distance), its closest point in the middle', () => {
    const { flocks } = lifeSchedule(ctx(), day())
    expect(flocks.length).toBeGreaterThan(3)
    for (const e of flocks) {
      expect(flockAt(e, e.t0).fade).toBeCloseTo(0, 6)
      expect(flockAt(e, e.t1).fade).toBeCloseTo(0, 6)
      const mid = flockAt(e, (e.t0 + e.t1) / 2)
      expect(mid.fade).toBe(1)
      expect(mid.distanceM).toBeCloseTo(mid.nearM, 3)
      // Its way moves it within the pass's own horizontal angular sweep over a minute at closest approach.
      const next = flockAt(e, (e.t0 + e.t1) / 2 + 60)
      const boundDeg = ((2 * Math.atan((30 * e.speedMs * 1.15) / e.nearM)) * 180) / Math.PI * 1.1 + 2
      expect(Math.abs(((next.azimuth - mid.azimuth + 540) % 360) - 180)).toBeLessThanOrEqual(boundDeg)
    }
  })

  it('ramps the rate through a gate: no flock starts in heavy rain, but one already up flies on', () => {
    const { flocks } = lifeSchedule(ctx(), day({}, 12))
    const noon = 12 * 3600
    // The rate ramps down over one sample (10 min) before the rain's hour.
    expect(flocks.filter((f) => f.t0 >= noon).length).toBe(0)
    // (Over a few places' seeds: some flock that rose before the rain is still flying well into it.)
    const flyingOn = ['test', 'a', 'b', 'c', 'd', 'e'].flatMap((id) => lifeSchedule(ctx('2026-04-10', id), day({}, 12)).flocks)
      .filter((f) => f.t0 < noon && f.t1 > noon + 600)
    expect(flyingOn.length).toBeGreaterThan(0)
    for (const id of ['a', 'b', 'c']) expect(lifeSchedule(ctx('2026-04-10', id), day({}, 12)).flocks.filter((f) => f.t0 >= noon)).toEqual([])
    // And the dry day has flocks starting all afternoon.
    expect(lifeSchedule(ctx(), day()).flocks.filter((f) => f.t0 >= noon).length).toBeGreaterThan(2)
  })

  it('caps the flocks under way at once, and the persistent trails', () => {
    const { flocks, high } = lifeSchedule(ctx(), day())
    for (let t = 0; t < 86_400; t += 300) {
      expect(flocks.filter((f) => f.t0 <= t && t <= f.t1).length).toBeLessThanOrEqual(3)
      expect(high.filter((p) => p.persists && p.t0 <= t && t <= p.t1 + p.lifeS).length).toBeLessThanOrEqual(4)
    }
  })

  it('starts no airliner where the air at cruise makes no trail, and by night none (their trails unlit)', () => {
    const warm = lifeSchedule(ctx(), day({ hour: { cruise: { temperature: -30, humidity: 40 } } }))
    expect(warm.high).toEqual([])
    const cold = lifeSchedule(ctx(), day())
    expect(cold.high.length).toBeGreaterThan(5)
    for (const p of cold.high) {
      const h = p.t0 / 3600
      expect(h > 5.5 && h < 18.5, `${h}`).toBe(true)
    }
  })

  it('grows a persistent trail from its plane, each puff aging and drifting with the upper wind', () => {
    const p = lifeSchedule(ctx(), day()).high.find((e) => e.persists)!
    expect(p).toBeDefined()
    const t = p.t0 + 600
    const now = highAt(p, t), later = highAt(p, t + 120)
    // Its newest puff is at the plane; its oldest is the oldest age.
    const head = now.trail.at(-1)!
    expect(head.ageS).toBe(0)
    expect(Math.hypot(head.e - now.plane!.e, head.n - now.plane!.n)).toBeLessThan(1e-9)
    expect(now.trail[0].ageS).toBeGreaterThan(now.trail.at(-1)!.ageS)
    // The same puff two minutes on: two minutes older, carried east by the 30 m/s wind (3.6 km).
    const same = later.trail.find((q) => q.seed === now.trail[3].seed)!
    expect(same.ageS - now.trail[3].ageS).toBeCloseTo(120, 6)
    expect(same.e - now.trail[3].e).toBeCloseTo(3.6, 3)
    // Past its plane's crossing the trail lives on, then is gone with its age.
    expect(highAt(p, p.t1 + 60).plane).toBeNull()
    expect(highAt(p, p.t1 + 60).trail.length).toBeGreaterThan(0)
    expect(highAt(p, p.t1 + p.lifeS + 30).trail).toEqual([])
  })

  it('samples the same paths, casts sight lines only at sample 0 and holds the event ends', () => {
    const schedule = lifeSchedule(ctx(), day())
    const input = day()('2026-04-10T12:00')
    const [flock] = schedule.flocks, [low] = schedule.low
    const high = schedule.high.find((p) => p.persists)!
    let sights = 0
    const at = (t: number, events: Partial<typeof schedule>) => lifeAt([{
      schedule: { date: schedule.date, flocks: [], low: [], high: [], meteors: [], ...events }, offsetS: 0 }],
      t, input, () => { sights++; return 1 })
    const bird = at(flock.t1 - 3, { flocks: [flock] }).birds[0]
    const movement = at(low.t1 - 3, { low: [low] }).aircraft.low[0]
    const liner = at(high.t1 - 3, { high: [high] }).aircraft.high[0]
    const last = AHEAD_S / AHEAD_STEP_S
    expect(sights).toBe(2)
    expect(bird.samples).toHaveLength(last + 1)
    expect(bird.samples![0]).toMatchObject({ azimuth: bird.azimuth, distanceM: bird.distanceM })
    expect(bird.samples![1].azimuth).toBe(flockAt(flock, flock.t1 - 1).azimuth)
    expect(bird.samples![last].azimuth).toBe(flockAt(flock, flock.t1).azimuth)
    expect(movement.samples).toHaveLength(last + 1)
    expect(movement.samples![last].at).toEqual(lowAt(low, low.t1).at)
    expect(liner.samples).toHaveLength(last + 1)
    expect(liner.samples!.slice(0, 2)).toEqual([liner.plane, highAt(high, high.t1 - 1).plane])
    expect(liner.samples!.slice(2)).toEqual(Array(last - 1).fill(null))
    const fresh = liner.futureTrail!.at(-1)!, end = highAt(high, high.t1).plane!
    expect(fresh.ageS).toBe(0)
    expect(fresh.e + 3 * liner.driftE).toBeCloseTo(end.e, 8)
    expect(fresh.n + 3 * liner.driftN).toBeCloseTo(end.n, 8)
  })

  it('flies the airport traffic down its glide path and up its climb in time; more by day than by night', () => {
    const { low } = lifeSchedule(ctx(), day())
    const arrivals = low.filter((e) => e.kind === 'arrive' && e.airport === 'LLBG')
    expect(arrivals.length).toBeGreaterThan(20)
    const e = arrivals[0]
    const heights = [0, 0.25, 0.5, 0.75, 1].map((f) => lifeAt([{ schedule: { date: '', flocks: [], high: [], low: [e], meteors: [] }, offsetS: 0 }],
      e.t0 + f * (e.t1 - e.t0), day()('2026-04-10T12:00')).aircraft.low[0].overFieldM)
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThan(heights[i - 1])
    const byDay = low.filter((m) => m.airport === 'LLBG' && m.t0 > 9 * 3600 && m.t0 < 15 * 3600).length / 6
    const byNight = low.filter((m) => m.airport === 'LLBG' && m.t0 < 4 * 3600).length / 4
    expect(byDay).toBeGreaterThan(byNight * 1.5)
  })

  it('evaluates the day before too: what started before midnight is still up after it', () => {
    const before = lifeSchedule(ctx('2026-04-09'), day())
    const today = lifeSchedule(ctx(), day())
    const late = before.high.find((p) => p.persists && p.t1 + p.lifeS > 86_400)
    const at = secondsOf('2026-04-10T00:05')
    const life = lifeAt([{ schedule: before, offsetS: -86_400 }, { schedule: today, offsetS: 0 }], at, day()('2026-04-10T00:05'))
    if (late && late.t1 + late.lifeS > 86_400 + at) expect(life.aircraft.high.some((p) => p.id === late.id)).toBe(true)
    expect(life.aircraft.high.every((p) => p.id.startsWith('2026-04-09') || p.id.startsWith('2026-04-10'))).toBe(true)
  })

  it('lays only the flocks overlapping [tt, tt + AHEAD_S] and freezes their laid tracks', () => {
    const schedule = lifeSchedule(ctx(), day())
    expect(schedule.flocks.length).toBeGreaterThan(4)
    expect(schedule.flocks.filter((e) => e.laid()).length).toBe(0)
    const target = schedule.flocks[Math.floor(schedule.flocks.length / 2)]
    const tt = Math.max(0, target.t0 - 20)
    const life = lifeAt([{ schedule, offsetS: 0 }], tt, day()('2026-04-10T12:00'))
    const overlapping = schedule.flocks.filter((e) => e.t0 <= tt + AHEAD_S && tt <= e.t1)
    const laidCount = schedule.flocks.filter((e) => e.laid()).length
    console.log('lazy lay count', JSON.stringify({ laidCount, overlapping: overlapping.length, totalDayFlocks: schedule.flocks.length }))
    expect(overlapping.length).toBeGreaterThan(0)
    expect(laidCount).toBe(overlapping.length)
    expect(laidCount).toBeLessThan(schedule.flocks.length * 0.25)
    // A flock starting inside (tt, tt + AHEAD_S] holds its t0 pose with fade 0 until t0, then ramps.
    const upcoming = life.birds.find((b) => b.id === target.id)!
    const atStart = flockAt(target, target.t0)
    expect(upcoming.fade).toBe(0)
    expect(upcoming.azimuth).toBe(atStart.azimuth)
    expect(upcoming.altitude).toBe(atStart.altitude)
    expect(upcoming.samples![0].fade).toBe(0)
    expect(upcoming.samples![Math.floor((target.t0 - tt) / AHEAD_STEP_S) - 1].fade).toBe(0)
    expect(upcoming.samples!.some((s) => s.fade > 0)).toBe(true)
    // Laid tracks are frozen and unaffected by mutating an event's exposed home before first lay.
    const firstLaid = target.lay()
    expect(Object.isFrozen(firstLaid)).toBe(true)
    expect(Object.isFrozen(firstLaid.track)).toBe(true)
    const gullEnv: PlaceEnv = { ...ENV, seaAz: 270 }
    const freshA = lifeSchedule(ctx(), day({ env: gullEnv })).flocks.find((e) => e.home)!
    const freshB = lifeSchedule(ctx(), day({ env: gullEnv })).flocks.find((e) => e.home)!
    freshB.home!.e += 50_000
    expect(freshB.lay().track.pts).toEqual(freshA.lay().track.pts)
  })

  it('keeps every fixture flock ground speed within [0.87, 1.15] × drawn across all baseline panoramas', async () => {
    stubPublicFetch()
    const loadedPlaces = await loadPlaces(SCENE_PLACES)
    const ratios: number[] = []
    let lowClamped = 0, highClamped = 0
    for (const place of SCENE_PLACES) {
      const loaded = loadedPlaces.get(place.id)!
      const input = worldInput(loaded, '2026-11-17T12:00', '2026-11-17T12:00')
      const camera = loaded.terrain.camera ?? SCENE_CAMERA
      const env = placeEnvOf(place, { cover: loaded.cover, far: loaded.far, waterMask: loaded.waterMask })
      const flight = { terrain: flightTerrain(loaded.terrain, input.forecast.elevation), drawnTop: () => -5, nearKm: () => Infinity }
      for (const date of [dayBefore('2026-11-17'), '2026-11-17']) {
        const schedule = lifeSchedule({ placeId: place.id, date, camera, lat: place.lat, lon: place.lon, flight },
          (at) => lifeInputAt(input, at, { camera, env }))
        for (const e of schedule.flocks) {
          // Measured from the sampled ground positions (2 s apart, mid-session), not from the laid track's metadata.
          const mid = (e.t0 + e.t1) / 2, a = flockAt(e, mid - 1).at, b = flockAt(e, mid + 1).at
          const ratio = (Math.hypot(b.e - a.e, b.n - a.n) * 1000) / 2 / e.speedMs
          ratios.push(ratio)
          if (ratio <= 0.87 + 1e-3) lowClamped++
          if (ratio >= 1.15 - 1e-3) highClamped++
          expect(ratio, `${place.id} ${e.id}`).toBeGreaterThanOrEqual(0.87 * 0.98)
          expect(ratio, `${place.id} ${e.id}`).toBeLessThanOrEqual(1.15 + 1e-3)
          expect(flockAt(e, e.t0).fade, `${place.id} ${e.id} t0`).toBe(0)
          expect(flockAt(e, e.t1).fade, `${place.id} ${e.id} t1`).toBe(0)
        }
      }
    }
    ratios.sort((a, b) => a - b)
    const pct = (p: number) => ratios[Math.min(ratios.length - 1, Math.floor(ratios.length * p))]
    console.log('fixture flock speed ratios', JSON.stringify({
      count: ratios.length, min: Number(ratios[0].toFixed(4)), p05: Number(pct(0.05).toFixed(4)), p50: Number(pct(0.5).toFixed(4)),
      p95: Number(pct(0.95).toFixed(4)), max: Number(ratios[ratios.length - 1].toFixed(4)), lowClamped, highClamped,
    }))
    expect(ratios.length).toBeGreaterThanOrEqual(500)
  }, 120_000)
})
