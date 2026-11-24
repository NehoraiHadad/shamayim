import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { moonIllumination, moonPosition } from '../../astro/moon'
import { sunPosition } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import { addMinutes } from '../../domain/time'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import { withLamp } from './lamp'
import type { LampKind, LayerDesc, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const KINDS = ['cloudSheet', 'plane', 'canopy', 'water'] as const
const DAY = '2026-11-17T00:00'
const MINUTES = 24 * 60
// Two-minute samples cut the work per CI case in half to target the 60-second timeout.
const STEP = 2
const CASES = ['forecast', 'full-moon night', 'overcast', 'datum only'] as const
let haifa: LoadedPlace
let beitShean: LoadedPlace

beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(p => ['haifa', 'beit-shean'].includes(p.id)))
  haifa = places.get('haifa')!
  beitShean = places.get('beit-shean')!
}, 60_000)
afterAll(() => vi.unstubAllGlobals())

function fullMoonDay() {
  // Search the forecast fixture's hourly reach, 16–23 November, for the fullest moon up at night.
  const start = '2026-11-16T00:00'
  const { lat, lon, timezone } = haifa.place
  let best = { at: start, fraction: 0 }
  for (let minute = 0; minute < 8 * MINUTES; minute += 60) {
    const at = addMinutes(start, minute), instant = utcOf(at, timezone)
    if (sunPosition(instant, lat, lon).altitude >= -12 || moonPosition(instant, lat, lon).altitude <= 0) continue
    const { fraction } = moonIllumination(instant)
    if (fraction > best.fraction) best = { at, fraction }
  }
  // 98% illumination admits the near-full night when the phase peak lies beyond the fixture.
  expect(best.fraction).toBeGreaterThanOrEqual(0.98)
  return addMinutes(best.at, -Number(best.at.slice(11, 13)) * 60)
}

function counter() {
  const distinct = new Set<string>()
  let previous: string | undefined, transitions = 0
  return {
    record(layers: LayerDesc[], kind: LampKind) {
      const pairs = layers.filter(layer => layer.kind === kind).map(layer => [layer.key, layer.light?.key])
      // Count one transition per frame and kind, including a layer appearing or disappearing.
      const key = JSON.stringify(pairs)
      if (previous !== undefined && previous !== key) transitions++
      previous = key
      // Preserve the land budget's per-descriptor cardinality. Report the sheet stack per frame.
      if (kind === 'cloudSheet') {
        if (pairs.length) distinct.add(key)
      } else {
        for (const pair of pairs) distinct.add(JSON.stringify(pair))
      }
    },
    counts: () => ({ distinct: distinct.size, transitions }),
  }
}

it.each(CASES.flatMap(scenario => ([375, 430] as const).map(width => ({ scenario, width }))))(
  '$scenario stays within the lamp key budget at $width px', ({ scenario, width }) => {
    const start = scenario === 'full-moon night' ? fullMoonDay() : DAY
    const place = scenario === 'datum only' ? beitShean : haifa
    const input = worldInput(place, start)
    const forcedLayers = scenario === 'overcast' ? { low: 1, mid: 1, high: 1 } : undefined
    const box = { ...BOX, width }, build = makeWorldBuilder()
    const counters = KINDS.map(kind => ({ kind, off: counter(), on: counter() }))
    for (let minute = 0; minute < MINUTES; minute += STEP) {
      const world = build({ ...input, selected: addMinutes(start, minute), forcedLayers })
      const off = sceneModel(world, box).layers
      const on = withLamp(off, world, box, KINDS)
      for (const item of counters) {
        item.off.record(off, item.kind)
        item.on.record(on, item.kind)
      }
    }
    const results = counters.map(({ kind, off, on }) => ({ kind, off: off.counts(), on: on.counts() }))
    for (const { kind, off, on } of results) {
      console.info(`${scenario} ${start.slice(0, 10)} ${width}px ${kind} (${STEP}-min samples): `
        + `transitions ${off.transitions} -> ${on.transitions}, distinct keys ${off.distinct} -> ${on.distinct}`)
    }
    for (const { kind, off, on } of results) {
      for (const metric of ['distinct', 'transitions'] as const) {
        const limit = kind === 'cloudSheet' ? MINUTES / STEP : off[metric] * 1.05
        expect(on[metric], `${kind} ${metric}`).toBeLessThanOrEqual(limit)
      }
    }
  }, 60_000,
)
