import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Place } from '../config/place'
import { loadBounds, placeBounds } from '../data/city/bounds'
import { loadCity } from '../data/city/cityData'
import { clusterReach, homeByName, homeCluster } from '../data/city/homeCluster'
import { outsideProject, SKYLINE_TO_KM } from '../data/city/outsideView'
import { loadIsrael } from '../data/landmarks/israelData'
import { portraitReach } from '../data/landmarks/portrait'
import { offsetKm } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import { HALL_M } from '../data/landmarks/worship'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch } from '../test/sceneWorld'
import { beyondMarks } from './beyondMarks'
import { BEYOND_MIN_PX, builtSquares, overTheCrest } from './beyondSeat'
import { GLYPH_SPECS } from './glyphSpecs'
import { SCENE_W } from './sceneBox'
import { placeOf } from './place'

// Gazetteer points used by the scene, including the Karmei Tzur offset recorded in audit #2.
const karmei: Place = { id: 'karmei-tzur', lat: 31.6047, lon: 35.1081, nameHe: 'כרמי צור',
  regionHe: 'הרי יהודה', timezone: 'Asia/Jerusalem', featureCode: 'PPL', settlementType: 'village' }
const safed: Place = { id: 'safed', lat: 32.9646, lon: 35.496, nameHe: 'צפת', regionHe: 'הגליל העליון',
  timezone: 'Asia/Jerusalem', featureCode: 'PPL', settlementType: 'city' }
const roshPina = SCENE_PLACES.find((place) => place.id === 'rosh-pina')!
const shadmot = SCENE_PLACES.find((place) => place.id === 'shadmot-mehola')!

beforeAll(stubPublicFetch)
afterAll(() => vi.unstubAllGlobals())

function inSkyline(place: Place, mark: Landmark) {
  const { dx, dy } = offsetKm(place, mark)
  return Math.hypot(dx, dy) <= SKYLINE_TO_KM
}

async function ownershipOf(place: Place) {
  const signal = new AbortController().signal
  const [city, landmarks, file] = await Promise.all([loadCity(place, signal), loadIsrael(place, signal), loadBounds()])
  const reachKm = portraitReach(city?.clusters, place.nameHe)
  const home = homeByName(city?.clusters ?? [], place.nameHe)
  const at = home?.place?.at
  const own = home && at ? { ...at, reachKm: clusterReach(home, at) } : undefined
  const bounds = placeBounds(place, file, reachKm, own)
  const withoutOwn = placeBounds(place, file, reachKm)
  expect(bounds).not.toBeNull()
  expect(landmarks?.length).toBeGreaterThan(0)
  return { home, own, bounds: bounds!, withoutOwn, landmarks: landmarks!,
    contains: (mark: Landmark) => bounds!.contains(mark.lat, mark.lon) }
}

function named(landmarks: Landmark[], kind: Landmark['kind'], name: string) {
  const mark = landmarks.find((item) => item.kind === kind && item.nameHe?.startsWith(name))
  expect(mark, name).toBeDefined()
  return mark!
}

it('assigns Karmei Tzur its synagogue via own-cluster bounds and loads nearby legacy mosques at HALL_M', async () => {
  const { home, landmarks, contains, withoutOwn } = await ownershipOf(karmei)
  expect(home?.place?.name).toBe(karmei.nameHe)
  const synagogue = named(landmarks, 'synagogue', 'שבת אחים')
  // Proves what the fix changes: without the named home cluster, the hamlet cell left out Karmei Tzur's own synagogue.
  expect(withoutOwn?.contains(synagogue.lat, synagogue.lon)).toBe(false)
  expect(contains(synagogue)).toBe(true)
  // The bundled names of the mosques at 1.61 km and 1.84 km from the gazetteer point.
  for (const name of ['مسجد عصيرة', 'مسجد بيت أمر القديم']) {
    expect(contains(named(landmarks, 'minaret', name))).toBe(false)
  }
  const nearbyMinarets = landmarks.filter((mark) => mark.kind === 'minaret' && inSkyline(karmei, mark))
  expect(nearbyMinarets.length).toBeGreaterThan(0)
  expect(nearbyMinarets.every((mark) => mark.heightM === HALL_M)).toBe(true)
})

it('assigns Safed and Rosh Pina their own synagogues and keeps the other town’s halls outside', async () => {
  const [safedOwn, roshPinaOwn] = await Promise.all([ownershipOf(safed), ownershipOf(roshPina)])
  expect(safedOwn.home?.place?.name).toBe(safed.nameHe)
  expect(roshPinaOwn.home?.place?.name).toBe(roshPina.nameHe)
  const safedHalls = ['בית הכנסת האר"י הספרדי', 'שם ועבר'].map((name) => named(safedOwn.landmarks, 'synagogue', name))
  const roshPinaHall = named(roshPinaOwn.landmarks, 'synagogue', 'בית המדרש ראש פינה')
  expect(roshPinaOwn.contains(roshPinaHall)).toBe(true)
  expect(safedOwn.contains(roshPinaHall)).toBe(false)
  for (const hall of safedHalls) {
    expect(safedOwn.contains(hall)).toBe(true)
    expect(roshPinaOwn.contains(hall)).toBe(false)
  }
  expect([...safedHalls, roshPinaHall].map((hall) => hall.heightM)).toEqual([HALL_M, HALL_M, HALL_M])
})

it('keeps Shadmot Mehola’s placeBounds box identical without a name match or on an unmatched own offset', async () => {
  const signal = new AbortController().signal
  const [city, file] = await Promise.all([loadCity(shadmot, signal), loadBounds()])
  const reachKm = portraitReach(city?.clusters, shadmot.nameHe)
  const withoutOwn = placeBounds(shadmot, file, reachKm)
  expect(withoutOwn).not.toBeNull()
  // Without a name match, homeCluster falls back to nearest ≤ 0.45 km, while homeByName returns null so own is omitted.
  expect(homeCluster(city?.clusters ?? [], undefined)?.place?.at).toBeDefined()
  const unmatched = homeByName(city?.clusters ?? [], undefined)
  expect(unmatched).toBeNull()
  expect(placeBounds(shadmot, file, reachKm, unmatched?.place?.at
    ? { ...unmatched.place.at, reachKm: clusterReach(unmatched, unmatched.place.at) } : undefined)?.box).toEqual(withoutOwn!.box)
  // An unmatched own offset falls back to the strongest-claimant cell rather than returning null.
  expect(placeBounds(shadmot, file, reachKm, { dx: 99, dy: 99, reachKm: 1 })?.box).toEqual(withoutOwn!.box)
  // With shadmot.nameHe ('שדמות מחולה'), bundled 323_355.json actually matches by name (same owner point, wider reach 0.91 vs 0.8 km).
  const matched = homeByName(city?.clusters ?? [], shadmot.nameHe)!
  expect(matched.place?.name).toBe(shadmot.nameHe)
  const withOwn = placeBounds(shadmot, file, reachKm, { ...matched.place!.at!, reachKm: clusterReach(matched, matched.place!.at!) })
  expect(withOwn?.point).toEqual(withoutOwn!.point)
  expect(withOwn?.contains(shadmot.lat, shadmot.lon)).toBe(true)
})

it('seats a synthetic nearby minaret on a drawn block at its true hPx and drops unseated or hidden ones', async () => {
  const loaded = (await loadPlaces([roshPina])).get(roshPina.id)!
  const input = { ...loaded, width: SCENE_W, elevation: loaded.terrain.heightNear?.(0, 0) ?? 0 }
  const { place3, marks } = placeOf(input)
  const source = new Map(loaded.landmarks.map((mark) => [mark.id, mark]))
  const kinds = new Set(['minaret', 'church', 'synagogue', 'highrise', 'homes'])
  expect(place3.beyondTowns?.length).toBeGreaterThan(0)
  const nearby = marks.filter((mark) => !mark.portrait && kinds.has(mark.kind) && inSkyline(roshPina, source.get(mark.id)!))
  for (const mark of nearby) {
    expect(place3.beyondTowns?.some((block) => mark.base === block.baseY && Math.abs(mark.x - block.x) <= block.w / 2), mark.id).toBe(true)
  }

  // Synthetic 22 m minaret on a drawn block that clears BEYOND_MIN_PX: drawn height (h * scale) equals hPx.
  const half = GLYPH_SPECS.minaret.w / 2
  const xs = new Set(place3.beyondTowns!.filter((block) => block.x >= half && block.x <= SCENE_W - half).map((block) => block.x))
  const squares = builtSquares(roshPina, loaded.city, SKYLINE_TO_KM)
  const square = squares.find(({ dx, dy }) =>
    xs.has(outsideProject(place3.frame, dx, dy).x) && overTheCrest(loaded.terrain, dx, dy, 22) >= BEYOND_MIN_PX)!
  const x = outsideProject(place3.frame, square.dx, square.dy).x
  const block = place3.beyondTowns!.find((item) => item.x === x)!
  const minaret: Landmark = { id: 'test-minaret', kind: 'minaret', source: 'osm', heightM: 22, lat: square.lat, lon: square.lon }
  const withMinaret = placeOf({ ...input, landmarks: [...input.landmarks, minaret] })
  const seated = withMinaret.marks.find((mark) => mark.id === minaret.id)
  expect(seated).toMatchObject({ x, base: block.baseY, km: block.km, plane: 'near' })
  expect(seated!.hPx).toBeGreaterThanOrEqual(BEYOND_MIN_PX)
  expect(seated!.h * seated!.scale).toBeCloseTo(seated!.hPx, 6)
  expect(seated!.w).toBeCloseTo(GLYPH_SPECS.minaret.w * seated!.scale, 6)

  // Negative case: a synthetic mark on a hidden built square (no drawn block, overTheCrest = 0) gets no seat.
  const hiddenSquare = squares.find(({ dx, dy }) =>
    !xs.has(outsideProject(place3.frame, dx, dy).x) && overTheCrest(loaded.terrain, dx, dy, 22) === 0)!
  const hiddenMinaret: Landmark = { id: 'test-hidden-minaret', kind: 'minaret', source: 'osm', heightM: 22,
    lat: hiddenSquare.lat, lon: hiddenSquare.lon }
  expect(placeOf({ ...input, landmarks: [...input.landmarks, hiddenMinaret] }).marks
    .find((mark) => mark.id === hiddenMinaret.id)).toBeUndefined()

  // Also verify beyondMarks drops marks below BEYOND_MIN_PX or overlapping the dot or a note.
  const dot = { x: 100, y: 100 }
  const note = { left: 195, right: 205, top: 80, bottom: 105 }
  const dropped = beyondMarks(roshPina, [minaret], SCENE_W, () => ({ x: 50, base: 100, hPx: BEYOND_MIN_PX - .1, km: 3 }), dot, [])
  expect(dropped.seated).toEqual([])
  const hitsDot = beyondMarks(roshPina, [minaret], SCENE_W, () => ({ x: 100, base: 100, hPx: 6, km: 3 }), dot, [])
  expect(hitsDot.seated).toEqual([])
  const hitsNote = beyondMarks(roshPina, [minaret], SCENE_W, () => ({ x: 200, base: 100, hPx: 6, km: 3 }), dot, [note])
  expect(hitsNote.seated).toEqual([])
})
