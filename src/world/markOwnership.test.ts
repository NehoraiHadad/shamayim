import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Place } from '../config/place'
import { boundsForPlace, loadBounds, placeBounds } from '../data/city/bounds'
import { loadCity } from '../data/city/cityData'
import { LAT_STEP, LON_STEP, squareOf } from '../data/city/grid'
import { clusterReach, homeByName, homeCluster } from '../data/city/homeCluster'
import { isOwnSpot, outsideProject, SKYLINE_TO_KM } from '../data/city/outsideView'
import { loadIsrael } from '../data/landmarks/israelData'
import { portraitReach } from '../data/landmarks/portrait'
import { offsetKm } from '../data/landmarks/project'
import { groundFn } from '../data/landmarks/seat'
import type { Landmark } from '../data/landmarks/types'
import { HALL_M } from '../data/landmarks/worship'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch } from '../test/sceneWorld'
import { beyondMarks } from './beyondMarks'
import { BEYOND_MIN_PX, beyondTowns, builtSquares, overTheCrest } from './beyondSeat'
import { glyphAtHeight, GLYPH_SPECS } from './glyphSpecs'
import { SHEET_CLEAR, VISIBLE_BOTTOM } from './layout'
import { lookOf, outsidePlace } from './outside'
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

async function outsideFor(place: Place) {
  const loaded = (await loadPlaces([place])).get(place.id)!
  const input = { ...loaded, width: SCENE_W, elevation: loaded.terrain.heightNear?.(0, 0) ?? 0 }
  const reachKm = portraitReach(loaded.city?.clusters, place.nameHe)
  const centerX = Number.parseFloat(loaded.terrain.centerLeft) / 100 * SCENE_W
  const ground = groundFn(loaded.terrain.nearPoints, SCENE_W)
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  const view = outsidePlace({ place, terrain: loaded.terrain, landmarks: loaded.landmarks, city: loaded.city,
    width: SCENE_W, centerX, reachKm, ground, floor, bounds: loaded.bounds, mask: loaded.waterMask, cover: loaded.cover })
  return { loaded, input, view, ground, floor }
}

const roshPinaOutside = () => outsideFor(roshPina)

it('seats a synthetic 22 m minaret on a drawn block at its true hPx and enforces beyondMarks guards', async () => {
  const { loaded, input, view } = await roshPinaOutside()
  const { place3, marks } = placeOf(input)
  const source = new Map(loaded.landmarks.map((mark) => [mark.id, mark]))
  const kinds = new Set(['minaret', 'church', 'synagogue', 'highrise', 'homes'])
  expect(place3.beyondTowns?.length).toBeGreaterThan(0)
  const nearby = marks.filter((mark) => !mark.portrait && kinds.has(mark.kind) && inSkyline(roshPina, source.get(mark.id)!))
  for (const mark of nearby) {
    expect(place3.beyondTowns?.some((block) => mark.base === block.baseY
      && mark.x - mark.w / 2 >= block.x - block.w / 2 && mark.x + mark.w / 2 <= block.x + block.w / 2), mark.id).toBe(true)
  }

  // Pick a drawn block wide enough to contain the 22 m minaret's glyph footprint inside its drawn span.
  const look = lookOf(view.frame)
  const nearK = outsideProject(view.frame, 0, view.frame.n).k
  const byX = new Map(view.beyondTowns.map((block) => [block.x, block]))
  const squares = builtSquares(roshPina, loaded.city, SKYLINE_TO_KM)
  const square = squares.find(({ dx, dy }) => {
    const { x, k } = outsideProject(view.frame, dx, dy)
    const block = byX.get(x)
    const over = overTheCrest(loaded.terrain, dx, dy, 22)
    if (!block || over < BEYOND_MIN_PX) return false
    const hPx = Math.min(look.px(22, Math.min(k, nearK)), over)
    const halfW = glyphAtHeight('minaret', hPx).w / 2
    return hPx >= BEYOND_MIN_PX && halfW <= block.w / 2 && x >= halfW && x <= SCENE_W - halfW
  })!
  const x = outsideProject(view.frame, square.dx, square.dy).x
  const block = byX.get(x)!
  const minaret: Landmark = { id: 'test-minaret', kind: 'minaret', source: 'osm', heightM: 22, lat: square.lat, lon: square.lon }
  const withMinaret = placeOf({ ...input, landmarks: [...input.landmarks, minaret] })
  const seated = withMinaret.marks.find((mark) => mark.id === minaret.id)
  expect(seated).toMatchObject({ x, base: block.baseY, km: block.km, plane: 'near' })
  expect(seated!.hPx).toBeGreaterThanOrEqual(BEYOND_MIN_PX)
  expect(seated!.h * seated!.scale).toBeCloseTo(seated!.hPx, 6)
  expect(seated!.w).toBeCloseTo(GLYPH_SPECS.minaret.w * seated!.scale, 6)

  // beyondMarks drops marks below BEYOND_MIN_PX or overlapping the dot or a note.
  const dot = { x: 100, y: 100 }
  const note = { left: 195, right: 205, top: 80, bottom: 105 }
  const dropped = beyondMarks(roshPina, [minaret], SCENE_W, () => ({ x: 50, base: 100, hPx: BEYOND_MIN_PX - .1, km: 3 }), dot, [])
  expect(dropped.seated).toEqual([])
  const hitsDot = beyondMarks(roshPina, [minaret], SCENE_W, () => ({ x: 100, base: 100, hPx: 6, km: 3 }), dot, [])
  expect(hitsDot.seated).toEqual([])
  const hitsNote = beyondMarks(roshPina, [minaret], SCENE_W, () => ({ x: 200, base: 100, hPx: 6, km: 3 }), dot, [note])
  expect(hitsNote.seated).toEqual([])
})

it('rejects an off-centre synthetic mark whose projected x or glyph half-width falls outside its drawn block span', async () => {
  const { loaded, view } = await roshPinaOutside()
  const look = lookOf(view.frame)
  const nearK = outsideProject(view.frame, 0, view.frame.n).k
  const byX = new Map(view.beyondTowns.map((block) => [block.x, block]))
  const squares = builtSquares(roshPina, loaded.city, SKYLINE_TO_KM)
  let outsideX: { mark: Landmark; blockX: number; blockW: number; projX: number } | null = null
  let overhang: { mark: Landmark; blockX: number; blockW: number; projX: number; halfW: number } | null = null
  for (const sq of squares) {
    const block = byX.get(outsideProject(view.frame, sq.dx, sq.dy).x)
    if (!block || Math.abs(sq.dx) < .5) continue
    const sameSq = (lat: number, lon: number) => JSON.stringify(squareOf(lat, lon)) === JSON.stringify(squareOf(sq.lat, sq.lon))
    // Corner nearer the eye and further from centerX: perspective pushes projected x outside the block's drawn span.
    if (!outsideX) {
      const lat = sq.lat + .49 * LAT_STEP, lon = sq.lon + Math.sign(sq.dx) * .49 * LON_STEP
      const { dx, dy } = offsetKm(roshPina, { lat, lon })
      const projX = outsideProject(view.frame, dx, dy).x
      if (sameSq(lat, lon) && Math.hypot(dx, dy) <= SKYLINE_TO_KM && !isOwnSpot(view.frame, view.lie, dx, dy)
        && overTheCrest(loaded.terrain, dx, dy, 22) >= BEYOND_MIN_PX && Math.abs(projX - block.x) > block.w / 2) {
        outsideX = { mark: { id: 'test-offcentre', kind: 'minaret', source: 'osm', heightM: 22, lat, lon },
          blockX: block.x, blockW: block.w, projX }
      }
    }
    // Same row (dy = sq.dy), shifted toward the block's edge: projected x stays inside the block, glyph half-width overhangs.
    if (!overhang) {
      const lat = sq.lat, lon = sq.lon + .4 * LON_STEP
      const { dx, dy } = offsetKm(roshPina, { lat, lon })
      const { x: projX, k } = outsideProject(view.frame, dx, dy)
      const over = overTheCrest(loaded.terrain, dx, dy, 22)
      const hPx = Math.min(look.px(22, Math.min(k, nearK)), over)
      const halfW = glyphAtHeight('minaret', hPx).w / 2
      if (sameSq(lat, lon) && Math.hypot(dx, dy) <= SKYLINE_TO_KM && !isOwnSpot(view.frame, view.lie, dx, dy)
        && hPx >= BEYOND_MIN_PX && Math.abs(projX - block.x) < block.w / 2
        && Math.abs(projX - block.x) + halfW > block.w / 2) {
        overhang = { mark: { id: 'test-overhang', kind: 'minaret', source: 'osm', heightM: 22, lat, lon },
          blockX: block.x, blockW: block.w, projX, halfW }
      }
    }
    if (outsideX && overhang) break
  }
  expect(outsideX).not.toBeNull()
  expect(Math.abs(outsideX!.projX - outsideX!.blockX)).toBeGreaterThan(outsideX!.blockW / 2)
  expect(view.seatMark(outsideX!.mark)).toBeNull()
  expect(overhang).not.toBeNull()
  expect(Math.abs(overhang!.projX - overhang!.blockX)).toBeLessThan(overhang!.blockW / 2)
  expect(Math.abs(overhang!.projX - overhang!.blockX) + overhang!.halfW).toBeGreaterThan(overhang!.blockW / 2)
  expect(view.seatMark(overhang!.mark)).toBeNull()
})

it('returns null from seatMark directly for a visible synthetic mark on a square with no drawn block', async () => {
  const { loaded, view } = await roshPinaOutside()
  const raster = loaded.city!.raster!
  const cos = Math.cos(roshPina.lat * Math.PI / 180)
  const drawnKeys = new Set(builtSquares(roshPina, loaded.city, SKYLINE_TO_KM)
    .filter((sq) => view.beyondTowns.some((b) => b.x === outsideProject(view.frame, sq.dx, sq.dy).x))
    .map((sq) => JSON.stringify(squareOf(sq.lat, sq.lon))))
  // Find an unbuilt square outside the place where a 30 m minaret clears the crest (so only the missing block rejects it).
  let unseated: Landmark | null = null
  for (let row = Math.floor((roshPina.lat - 4 / 111.32) / LAT_STEP); row <= Math.floor((roshPina.lat + 4 / 111.32) / LAT_STEP) && !unseated; row++) {
    for (let col = Math.floor((roshPina.lon - 4 / (111.32 * cos)) / LON_STEP); col <= Math.floor((roshPina.lon + 4 / (111.32 * cos)) / LON_STEP); col++) {
      const lat = (row + .5) * LAT_STEP, lon = (col + .5) * LON_STEP
      if (raster.at(lat, lon).built >= .2) continue
      if (drawnKeys.has(JSON.stringify(squareOf(lat, lon)))) continue
      const { dx, dy } = offsetKm(roshPina, { lat, lon })
      if (Math.hypot(dx, dy) > SKYLINE_TO_KM || isOwnSpot(view.frame, view.lie, dx, dy)) continue
      if (overTheCrest(loaded.terrain, dx, dy, 30) >= BEYOND_MIN_PX) {
        unseated = { id: 'test-no-block', kind: 'minaret', source: 'osm', heightM: 30, lat, lon }
        break
      }
    }
  }
  expect(unseated).not.toBeNull()
  expect(view.seatMark(unseated!)).toBeNull()
})

it('returns null from seatMark directly for a mark hidden by the land in front on a visible drawn block', async () => {
  const { loaded, view, ground, floor } = await roshPinaOutside()
  const byX = new Map(view.beyondTowns.map((block) => [block.x, block]))
  const square = builtSquares(roshPina, loaded.city, SKYLINE_TO_KM).find((sq) => byX.has(outsideProject(view.frame, sq.dx, sq.dy).x))!
  const block = byX.get(outsideProject(view.frame, square.dx, square.dy).x)!
  // Ridge occludes heights up to block.heightM - 1 m while letting the block's own roof peek 4 px above the crest.
  const occludedTerrain = {
    ...loaded.terrain,
    sightAt: undefined,
    seenAt: (x: number, _km: number, heightM = 0) => {
      const ridgeY = ground(x)
      return { groundY: ridgeY + 2, y: heightM >= block.heightM ? ridgeY - 4 : ridgeY + 1, angle: 0, groundAngle: 0 }
    },
  }
  const { beyondTowns: drawn, seatMark } = beyondTowns(
    { place: roshPina, city: loaded.city, width: SCENE_W, ground, floor, terrain: occludedTerrain },
    view.frame, view.lie, lookOf(view.frame), view.baseKm,
  )
  const visibleBlock = drawn.find((b) => b.x === block.x)
  expect(visibleBlock).toBeDefined()
  const hiddenMark: Landmark = { id: 'test-hidden-on-block', kind: 'synagogue', source: 'osm',
    heightM: Math.max(1, block.heightM - 2), lat: square.lat, lon: square.lon }
  expect(overTheCrest(occludedTerrain, square.dx, square.dy, hiddenMark.heightM)).toBe(0)
  expect(seatMark(hiddenMark)).toBeNull()
})

it('draws a synthetic 9 m hall on a drawn beyond block while keeping the 20 m gate for non-settlement kinds', async () => {
  const { loaded, input, view } = await roshPinaOutside()
  const look = lookOf(view.frame)
  const nearK = outsideProject(view.frame, 0, view.frame.n).k
  const byX = new Map(view.beyondTowns.map((block) => [block.x, block]))
  const square = builtSquares(roshPina, loaded.city, SKYLINE_TO_KM).find(({ dx, dy }) => {
    const { x, k } = outsideProject(view.frame, dx, dy)
    const block = byX.get(x)
    const over = overTheCrest(loaded.terrain, dx, dy, HALL_M)
    if (!block || over < BEYOND_MIN_PX) return false
    const hPx = Math.min(look.px(HALL_M, Math.min(k, nearK)), over)
    const halfW = glyphAtHeight('minaret', hPx).w / 2
    return hPx >= BEYOND_MIN_PX && halfW <= block.w / 2 && x >= halfW && x <= SCENE_W - halfW
  })!
  expect(square).toBeDefined()
  const x = outsideProject(view.frame, square.dx, square.dy).x
  const block = byX.get(x)!
  const hall: Landmark = { id: 'test-9m-hall', kind: 'minaret', source: 'osm', heightM: HALL_M, lat: square.lat, lon: square.lon }
  const shortTower: Landmark = { id: 'test-9m-water-tower', kind: 'waterTower', source: 'osm', heightM: HALL_M, lat: square.lat, lon: square.lon }
  const result = placeOf({ ...input, landmarks: [...input.landmarks, hall, shortTower] })
  const drawnHall = result.marks.find((mark) => mark.id === hall.id)
  expect(drawnHall).toMatchObject({ x, base: block.baseY, km: block.km, plane: 'near' })
  expect(drawnHall!.hPx).toBeGreaterThanOrEqual(BEYOND_MIN_PX)
  expect(drawnHall!.h * drawnHall!.scale).toBeCloseTo(drawnHall!.hPx, 6)
  expect(result.marks.find((mark) => mark.id === shortTower.id)).toBeUndefined()
})

it('uses the same strict-frame ownership rule for marks and beyond town blocks when bounds are absent', async () => {
  const { loaded, input } = await roshPinaOutside()
  const noBounds = { ...input, bounds: null, cover: null }
  const { place3 } = placeOf(noBounds)
  // Pick a drawn beyond block within 1 km of the cluster frame (where marksOf previously added a 1 km margin).
  const byX = new Map((place3.beyondTowns ?? []).map((block) => [block.x, block]))
  const nearEdge = builtSquares(roshPina, loaded.city, SKYLINE_TO_KM).find(({ dx, dy }) => {
    const outsideStrict = !isOwnSpot(place3.frame, {}, dx, dy)
    const withinMargin = dx >= place3.frame.w - 1 && dx <= place3.frame.e + 1 && dy >= place3.frame.s - 1 && dy <= place3.frame.n + 1
    if (!outsideStrict || !withinMargin) return false
    const { x, k } = outsideProject(place3.frame, dx, dy)
    const block = byX.get(x)
    const over = overTheCrest(loaded.terrain, dx, dy, 22)
    if (!block || over < BEYOND_MIN_PX) return false
    const nearK = outsideProject(place3.frame, 0, place3.frame.n).k
    const hPx = Math.min(lookOf(place3.frame).px(22, Math.min(k, nearK)), over)
    const halfW = glyphAtHeight('minaret', hPx).w / 2
    return hPx >= BEYOND_MIN_PX && halfW <= block.w / 2 && x >= halfW && x <= SCENE_W - halfW
  })
  expect(nearEdge).toBeDefined()
  const mark: Landmark = { id: 'test-margin-owner', kind: 'minaret', source: 'osm', heightM: 22, lat: nearEdge!.lat, lon: nearEdge!.lon }
  const placed = placeOf({ ...noBounds, landmarks: [...noBounds.landmarks, mark] }).marks.find((m) => m.id === mark.id)
  expect(placed).toBeDefined()
  // Seated as a beyond mark on its town block, never treated as the place's own portrait mark.
  expect(placed!.portrait).toBeUndefined()
})
