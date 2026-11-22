import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Place } from '../config/place'
import { boundsForPlace, loadBounds, placeBounds } from '../data/city/bounds'
import { loadCity } from '../data/city/cityData'
import { clusterReach, homeByName, homeCluster } from '../data/city/homeCluster'
import { isOwnSpot } from '../data/city/outsideView'
import { loadIsrael } from '../data/landmarks/israelData'
import { portraitReach } from '../data/landmarks/portrait'
import type { Landmark } from '../data/landmarks/types'
import { HALL_M } from '../data/landmarks/worship'
import { SCENE_PLACES } from '../test/scenePlaces'
import { stubPublicFetch } from '../test/sceneWorld'
import { fittingBlocks, inSkyline, outsideFor, roshPina } from './beyondSeatFixture'
import { placeOf } from './place'

// Gazetteer points used by the scene, including the Karmei Tzur offset recorded in audit #2.
const karmei: Place = { id: 'karmei-tzur', lat: 31.6047, lon: 35.1081, nameHe: 'כרמי צור',
  regionHe: 'הרי יהודה', timezone: 'Asia/Jerusalem', featureCode: 'PPL', settlementType: 'village' }
const safed: Place = { id: 'safed', lat: 32.9646, lon: 35.496, nameHe: 'צפת', regionHe: 'הגליל העליון',
  timezone: 'Asia/Jerusalem', featureCode: 'PPL', settlementType: 'city' }
const shadmot = SCENE_PLACES.find((place) => place.id === 'shadmot-mehola')!

beforeAll(stubPublicFetch)
afterAll(() => vi.unstubAllGlobals())

async function ownershipOf(place: Place) {
  const signal = new AbortController().signal
  const [city, landmarks, file] = await Promise.all([loadCity(place, signal), loadIsrael(place, signal), loadBounds()])
  const reachKm = portraitReach(city?.clusters, place.nameHe)
  const home = homeByName(city?.clusters ?? [], place.nameHe)
  const bounds = boundsForPlace(place, city?.clusters, file, reachKm)
  const withoutOwn = placeBounds(place, file, reachKm)
  expect(bounds).not.toBeNull()
  expect(landmarks?.length).toBeGreaterThan(0)
  return { home, bounds: bounds!, withoutOwn, landmarks: landmarks!,
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

it('keeps Shadmot Mehola’s bounds equal to placeBounds without own when no cluster matches by name, and widens reach when matched', async () => {
  const signal = new AbortController().signal
  const [city, file] = await Promise.all([loadCity(shadmot, signal), loadBounds()])
  const reachKm = portraitReach(city?.clusters, shadmot.nameHe)
  const withoutOwn = placeBounds(shadmot, file, reachKm)
  expect(withoutOwn).not.toBeNull()
  // Even with an unmatched name, a nearby cluster (≤ 0.45 km) exists; boundsForPlace (the lieOf path) must not pass it as own.
  const unmatchedName = 'שם שלא קיים'
  expect(homeCluster(city?.clusters ?? [], unmatchedName)?.place?.at).toBeDefined()
  const throughUnmatched = boundsForPlace({ ...shadmot, nameHe: unmatchedName }, city?.clusters, file, reachKm)
  expect(throughUnmatched?.point).toEqual(withoutOwn!.point)
  expect(throughUnmatched?.box).toEqual(withoutOwn!.box)
  // An unmatched own offset falls back to the strongest-claimant cell rather than returning null.
  expect(placeBounds(shadmot, file, reachKm, { dx: 99, dy: 99, reachKm: 1 })?.box).toEqual(withoutOwn!.box)
  // Matching shadmot.nameHe ('שדמות מחולה') keeps the same owner point while raising its cell reach from 0.8 km (point[3] = 8)
  // to the cluster's measured reach (~0.91 km), widening the weighted cell box while still containing the place point.
  const matchedCluster = homeByName(city?.clusters ?? [], shadmot.nameHe)!
  expect(matchedCluster.place?.name).toBe(shadmot.nameHe)
  expect(clusterReach(matchedCluster, matchedCluster.place!.at!)).toBeGreaterThan(withoutOwn!.point[3] / 10)
  const throughMatched = boundsForPlace(shadmot, city?.clusters, file, reachKm)!
  expect(throughMatched.point).toEqual(withoutOwn!.point)
  expect(throughMatched.box.e - throughMatched.box.w).toBeGreaterThan(withoutOwn!.box.e - withoutOwn!.box.w)
  expect(throughMatched.contains(shadmot.lat, shadmot.lon)).toBe(true)
})

it('uses strict-frame ownership for settlement marks with a raster, and keeps the 1 km fallback before raster and bounds arrive', async () => {
  const ctx = await outsideFor(roshPina)
  const noBounds = { ...ctx.input, bounds: null, cover: null }
  const withRaster = placeOf(noBounds)
  const frame = withRaster.place3.frame
  // With a raster and no bounds: a settlement mark outside the strict frame within 1 km seats on its beyond town block.
  const noBoundsCtx = { ...ctx, view: { ...ctx.view, frame, lie: {}, beyondTowns: withRaster.place3.beyondTowns ?? [] },
    byX: new Map((withRaster.place3.beyondTowns ?? []).map((b) => [b.x, b])) }
  const edge = fittingBlocks(noBoundsCtx, 22, 'minaret', ({ dx, dy }) =>
    !isOwnSpot(frame, {}, dx, dy) && isOwnSpot(frame, {}, dx, dy, 1))[0]
  expect(edge).toBeDefined()
  const edgeMark: Landmark = { id: 'test-margin-owner', kind: 'minaret', source: 'osm', heightM: 22,
    lat: edge.square.lat, lon: edge.square.lon }
  const seated = placeOf({ ...noBounds, landmarks: [...noBounds.landmarks, edgeMark] }).marks.find((m) => m.id === edgeMark.id)
  expect(seated).toBeDefined()
  expect(seated!.portrait).toBeUndefined()
  expect(seated!.seatBlockId).toBe(edge.block.id)

  // Without a raster or bounds (cached visit with cluster frame only): marks just outside the frame within 1 km stay own portrait marks.
  const noRasterCity = ctx.loaded.city ? { ...ctx.loaded.city, raster: undefined, towers: [] } : null
  const noRaster = { ...noBounds, city: noRasterCity }
  const frameNoRaster = placeOf(noRaster).place3.frame
  const cos = Math.cos(roshPina.lat * Math.PI / 180)
  // Place a settlement mark and a non-settlement mark 0.05 km past opposite frame edges (outside strict frame, inside +1 km fallback).
  const eastDx = frameNoRaster.e + .05, westDx = frameNoRaster.w - .05
  expect(isOwnSpot(frameNoRaster, {}, eastDx, 0)).toBe(false)
  expect(isOwnSpot(frameNoRaster, {}, eastDx, 0, 1)).toBe(true)
  expect(isOwnSpot(frameNoRaster, {}, westDx, 0)).toBe(false)
  expect(isOwnSpot(frameNoRaster, {}, westDx, 0, 1)).toBe(true)
  const hall: Landmark = { id: 'test-fallback-hall', kind: 'synagogue', source: 'osm', heightM: HALL_M,
    lat: roshPina.lat, lon: roshPina.lon + eastDx / (111.32 * cos), nameHe: 'בית כנסת', fame: 2 }
  const tower: Landmark = { id: 'test-fallback-water', kind: 'waterTower', source: 'osm', heightM: 18,
    lat: roshPina.lat, lon: roshPina.lon + westDx / (111.32 * cos), nameHe: 'מגדל מים', fame: 2 }
  const fallbackMarks = placeOf({ ...noRaster, landmarks: [hall, tower] }).marks
  expect(fallbackMarks.find((m) => m.id === hall.id)?.portrait).toBe(true)
  expect(fallbackMarks.find((m) => m.id === tower.id)?.portrait).toBe(true)
  // Even with a raster present, a non-settlement mark still keeps the +1 km fallback when bounds are absent.
  const withRasterNonSettlement = placeOf({ ...noBounds, landmarks: [tower] }).marks
  expect(withRasterNonSettlement.find((m) => m.id === tower.id)?.portrait).toBe(true)
})
